import { prisma } from '../lib/prisma.js';
import { httpError } from '../utils/http.js';
import { quoteShipping } from '../integrations/shipping.js';

export function makeOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function prepareCheckout(input) {
  const ids = [...new Set(input.items.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'PUBLISHED' },
    include: { variants: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } }
  });
  const map = new Map(products.map((product) => [product.id, product]));
  const items = input.items.map((line) => {
    const product = map.get(line.productId);
    if (!product) throw httpError(400, 'One of the products in your cart is no longer available.');
    const variants = product.variants.filter((variant) => variant.isActive);
    if (variants.length && !line.variantId) throw httpError(400, `${product.name}: please select an option.`);
    const variant = line.variantId ? variants.find((item) => item.id === line.variantId) : null;
    if (line.variantId && !variant) throw httpError(400, `${product.name}: selected option is unavailable.`);
    const stock = Number(variant ? variant.stock : product.stock);
    if (stock < line.quantity) throw httpError(400, `${product.name} does not have enough stock.`);
    const unitPrice = Number(variant?.price ?? product.price);
    return {
      productId: product.id,
      variantId: variant?.id || null,
      productName: product.name,
      variantName: variant?.title || null,
      imageUrl: variant?.imageUrl || product.images[0]?.url || null,
      sku: variant?.sku || product.sku || null,
      quantity: line.quantity,
      unitPrice,
      total: unitPrice * line.quantity
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  let discount = 0;
  let coupon = null;
  if (input.couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: String(input.couponCode).trim().toUpperCase() } });
    const now = new Date();
    if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) throw httpError(400, 'Coupon is invalid or expired.');
    if (coupon.minOrder && subtotal < Number(coupon.minOrder)) throw httpError(400, `This coupon requires a minimum order of ${coupon.minOrder}.`);
    discount = coupon.type === 'FIXED' ? Number(coupon.value) : subtotal * Number(coupon.value) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    discount = Math.min(discount, subtotal);
  }

  const config = await prisma.storeConfig.findFirst();
  const settings = config?.commerceSettings || {};
  const shippingQuote = await quoteShipping({ items: input.items, address: input.shippingAddress, orderValue: subtotal - discount, paymentMethod: input.paymentMethod || input.provider || 'PREPAID' });
  const selectedShipping = Array.isArray(shippingQuote.options) && shippingQuote.options.length
    ? (shippingQuote.options.find((option) => String(option.courierId ?? option.id ?? option.code ?? option.name) === String(input.shippingMethodId || '')) || shippingQuote.selected || shippingQuote.options[0])
    : shippingQuote.selected || null;
  const shipping = selectedShipping ? Number(selectedShipping.amount || 0) : Number(shippingQuote.amount || 0);
  const taxRate = Number(settings.taxPercent ?? 0);
  const tax = Math.max((subtotal - discount) * taxRate / 100, 0);
  const total = subtotal - discount + shipping + tax;

  return {
    items,
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress || null,
    shippingMethod: { provider: shippingQuote.provider, ...(selectedShipping || {}), amount: shipping },
    notes: input.notes || null,
    coupon: coupon ? { id: coupon.id, code: coupon.code } : null,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    currency: String(config?.currency || 'INR').toUpperCase(),
    locale: config?.locale || 'en-IN'
  };
}

export async function finalizeCheckout({ prepared, userId = null, paymentMethod = 'COD', paymentStatus = 'PENDING', providerPaymentId = null, providerSessionId = null }) {
  return prisma.$transaction(async (tx) => {
    for (const item of prepared.items) {
      const result = item.variantId
        ? await tx.productVariant.updateMany({ where: { id: item.variantId, isActive: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } })
        : await tx.product.updateMany({ where: { id: item.productId, status: 'PUBLISHED', stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
      if (result.count !== 1) throw httpError(409, `${item.productName} stock changed. Please review your cart.`);
    }
    if (prepared.coupon?.id) {
      const coupon = await tx.coupon.findUnique({ where: { id: prepared.coupon.id } });
      const now = new Date();
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) throw httpError(409, 'The coupon expired before checkout completed. Please review your cart.');
      const claimed = await tx.coupon.updateMany({ where: { id: coupon.id, ...(coupon.usageLimit ? { usageCount: { lt: coupon.usageLimit } } : {}) }, data: { usageCount: { increment: 1 } } });
      if (claimed.count !== 1) throw httpError(409, 'This coupon has reached its usage limit. Please review your cart.');
    }
    const order = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(), userId, status: 'CONFIRMED', paymentStatus,
        paymentMethod, subtotal: prepared.subtotal, discount: prepared.discount, shipping: prepared.shipping,
        tax: prepared.tax, total: prepared.total, couponCode: prepared.coupon?.code || null,
        customerSnapshot: prepared.customer, shippingAddress: prepared.shippingAddress,
        billingAddress: prepared.billingAddress, shippingMethod: prepared.shippingMethod, notes: prepared.notes,
        items: { create: prepared.items }
      },
      include: { items: true }
    });
    if (paymentMethod !== 'COD') {
      await tx.payment.create({ data: {
        orderId: order.id, provider: paymentMethod, status: paymentStatus,
        amount: prepared.total, currency: prepared.currency,
        providerPaymentId, providerSessionId
      } });
    }
    return order;
  });
}

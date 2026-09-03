import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { requireAdmin, requireManager, requireOwner } from '../middleware/auth.js';
import { slugify } from '../utils/slug.js';
import integrationRoutes from './integrations.js';
import { uploadMedia } from '../integrations/storage.js';
import { createShipment } from '../integrations/shipping.js';
import { refundProviderPayment } from '../integrations/payments.js';
import { dispatchCommerceEvent } from '../integrations/notifications.js';
import { setOrderStatus } from '../services/orderLifecycle.js';
import { finalizeCheckout } from '../services/checkout.js';

const router = Router();
router.use(...requireAdmin);
router.use('/integrations', integrationRoutes);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

const productSchema = z.object({
  name: z.string().min(2), slug: z.string().optional(), shortDescription: z.string().optional().nullable(), description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(), price: z.coerce.number().nonnegative(), compareAtPrice: z.coerce.number().nonnegative().optional().nullable(), stock: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'), isFeatured: z.boolean().default(false), categoryId: z.string().optional().nullable(), brandId: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(), metaDescription: z.string().optional().nullable(), canonicalUrl: z.string().optional().nullable(), ogImageUrl: z.string().optional().nullable(), noIndex: z.boolean().default(false),
  attributes: z.any().optional().nullable(), specifications: z.any().optional().nullable(), shippingInfo: z.any().optional().nullable(),
  images: z.array(z.object({ url: z.string().min(1), altText: z.string().optional().nullable(), sortOrder: z.coerce.number().int().nonnegative().optional() })).optional(),
  imageUrls: z.array(z.string().min(1)).optional(), variants: z.array(z.object({ id: z.string().optional(), title: z.string().min(1), sku: z.string().min(1), price: z.coerce.number().nonnegative(), compareAtPrice: z.coerce.number().nonnegative().optional().nullable(), stock: z.coerce.number().int().nonnegative().default(0), imageUrl: z.string().optional().nullable(), options: z.any().optional().nullable(), shippingInfo: z.any().optional().nullable(), isActive: z.boolean().default(true) })).optional(),
  collectionIds: z.array(z.string()).optional()
});

router.get('/dashboard', asyncRoute(async (req, res) => {
  const [products, orders, customers, pendingOrders, lowStockSimple, lowStockVariants, revenue, submissions, paymentReview] = await Promise.all([
    prisma.product.count(), prisma.order.count(), prisma.user.count({ where: { role: 'CUSTOMER' } }), prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'] } } }),
    prisma.product.count({ where: { status: 'PUBLISHED', variants: { none: {} }, stock: { lte: 5 } } }),
    prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 }, product: { status: 'PUBLISHED' } } }),
    prisma.order.aggregate({ where: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } }, _sum: { total: true } }),
    prisma.formSubmission.count({ where: { status: 'NEW' } }),
    prisma.paymentSession.count({ where: { status: 'REQUIRES_REVIEW' } })
  ]);
  res.json({ products, orders, customers, pendingOrders, lowStock: lowStockSimple + lowStockVariants, revenue: Number(revenue._sum.total || 0), newSubmissions: submissions, paymentReview });
}));

router.get('/products', asyncRoute(async (req, res) => {
  const search = String(req.query.search || '');
  res.json(await prisma.product.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}, include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true, collections: true }, orderBy: { updatedAt: 'desc' } }));
}));
router.get('/products/:id', asyncRoute(async (req, res) => {
  const item = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true, collections: true } });
  if (!item) throw httpError(404, 'Product not found.');
  res.json(item);
}));
router.post('/products', asyncRoute(async (req, res) => {
  const input = productSchema.parse(req.body);
  const { images, imageUrls = [], variants = [], collectionIds = [], ...data } = input;
  const normalizedImages = (images?.length ? images : imageUrls.filter(Boolean).map((url, i) => ({ url, sortOrder: i, altText: input.name }))).map((image, i) => ({ url: image.url, altText: image.altText || input.name, sortOrder: image.sortOrder ?? i }));
  const item = await prisma.product.create({ data: {
    ...data, slug: slugify(input.slug || input.name),
    images: { create: normalizedImages },
    variants: { create: variants.map(({ id, ...v }) => v) },
    collections: { create: collectionIds.map((collectionId, i) => ({ collectionId, sortOrder: i })) }
  }, include: { images: true, variants: true, collections: true } });
  res.status(201).json(item);
}));
router.put('/products/:id', asyncRoute(async (req, res) => {
  const input = productSchema.parse(req.body);
  const { images, imageUrls = [], variants = [], collectionIds = [], ...data } = input;
  const normalizedImages = (images?.length ? images : imageUrls.filter(Boolean).map((url, i) => ({ url, sortOrder: i, altText: input.name }))).map((image, i) => ({ url: image.url, altText: image.altText || input.name, sortOrder: image.sortOrder ?? i }));
  const item = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: req.params.id } });
    await tx.collectionProduct.deleteMany({ where: { productId: req.params.id } });
    const existingVariants = await tx.productVariant.findMany({ where: { productId: req.params.id }, select: { id: true } });
    const keepIds = variants.map((variant) => variant.id).filter(Boolean);
    await tx.productVariant.deleteMany({ where: { productId: req.params.id, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } });
    for (const variant of variants) {
      const { id, ...variantData } = variant;
      if (id && existingVariants.some((item) => item.id === id)) await tx.productVariant.update({ where: { id }, data: variantData });
      else await tx.productVariant.create({ data: { ...variantData, productId: req.params.id } });
    }
    return tx.product.update({ where: { id: req.params.id }, data: {
      ...data, slug: slugify(input.slug || input.name),
      images: { create: normalizedImages },
      collections: { create: collectionIds.map((collectionId, i) => ({ collectionId, sortOrder: i })) }
    }, include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, collections: true } });
  });
  res.json(item);
}));
router.delete('/products/:id', ...requireManager, asyncRoute(async (req, res) => { await prisma.product.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

const taxonomy = [
  ['categories', 'category'], ['collections', 'collection'], ['brands', 'brand']
];
for (const [path, model] of taxonomy) {
  router.get(`/${path}`, asyncRoute(async (req, res) => res.json(await prisma[model].findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }))));
  router.post(`/${path}`, asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw httpError(400, 'Name is required.');
    const data = { name, slug: slugify(req.body.slug || name), description: req.body.description || null, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false };
    if (model === 'category') { data.parentId = req.body.parentId || null; data.imageUrl = req.body.imageUrl || null; data.metaTitle = req.body.metaTitle || null; data.metaDescription = req.body.metaDescription || null; data.noIndex = Boolean(req.body.noIndex); }
    if (model === 'collection') { data.imageUrl = req.body.imageUrl || null; data.metaTitle = req.body.metaTitle || null; data.metaDescription = req.body.metaDescription || null; data.noIndex = Boolean(req.body.noIndex); }
    if (model === 'brand') { data.logoUrl = req.body.logoUrl || null; data.metaTitle = req.body.metaTitle || null; data.metaDescription = req.body.metaDescription || null; data.noIndex = Boolean(req.body.noIndex); }
    res.status(201).json(await prisma[model].create({ data }));
  }));
  router.put(`/${path}/:id`, asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw httpError(400, 'Name is required.');
    const data = { name, slug: slugify(req.body.slug || name), description: req.body.description || null, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false };
    if (model === 'category') { data.parentId = req.body.parentId || null; data.imageUrl = req.body.imageUrl || null; data.metaTitle = req.body.metaTitle || null; data.metaDescription = req.body.metaDescription || null; data.noIndex = Boolean(req.body.noIndex); }
    if (model === 'collection') { data.imageUrl = req.body.imageUrl || null; data.metaTitle = req.body.metaTitle || null; data.metaDescription = req.body.metaDescription || null; data.noIndex = Boolean(req.body.noIndex); }
    if (model === 'brand') { data.logoUrl = req.body.logoUrl || null; data.metaTitle = req.body.metaTitle || null; data.metaDescription = req.body.metaDescription || null; data.noIndex = Boolean(req.body.noIndex); }
    res.json(await prisma[model].update({ where: { id: req.params.id }, data }));
  }));
  router.delete(`/${path}/:id`, ...requireManager, asyncRoute(async (req, res) => { await prisma[model].delete({ where: { id: req.params.id } }); res.status(204).end(); }));
}

router.get('/orders', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.order.findMany({ include: { items: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }))));
router.patch('/orders/:id/status', ...requireManager, asyncRoute(async (req, res) => {
  const status = z.enum(['PENDING','CONFIRMED','PROCESSING','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCEL_REQUESTED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED']).parse(req.body.status);
  const current = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payments: true } });
  if (!current) throw httpError(404, 'Order not found.');
  const terminalRestockStatuses = ['CANCELLED','RETURNED','REFUNDED'];
  if (current.stockRestored && !terminalRestockStatuses.includes(status)) throw httpError(400, 'Inventory has already been restored for this order, so it cannot be moved back into an active fulfillment state.');
  if (status === 'REFUNDED' && current.paymentStatus === 'PAID' && current.paymentMethod !== 'COD') throw httpError(400, 'Use the Refund payment action so the payment gateway is refunded before the order is marked refunded.');
  if (['CANCELLED','RETURNED'].includes(status) && current.paymentStatus === 'PAID' && current.paymentMethod !== 'COD') throw httpError(400, 'This paid online order must be refunded through the Refund payment action before inventory is restored.');
  const extra = { ...(req.body.trackingNumber !== undefined ? { trackingNumber: req.body.trackingNumber } : {}), ...(req.body.trackingUrl !== undefined ? { trackingUrl: req.body.trackingUrl } : {}) };
  const order = await setOrderStatus(req.params.id, status, extra);
  dispatchCommerceEvent('order.status_changed', order).catch(() => {});
  res.json(order);
}));

router.post('/orders/:id/shipment', ...requireManager, asyncRoute(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!order) throw httpError(404, 'Order not found.');
  const shipment = await createShipment(order);
  const updated = await prisma.order.update({ where: { id: order.id }, data: {
    trackingNumber: shipment.trackingNumber || order.trackingNumber,
    trackingUrl: shipment.trackingUrl || order.trackingUrl,
    status: shipment.trackingNumber && !['DELIVERED','CANCELLED','RETURNED','REFUNDED'].includes(order.status) ? 'SHIPPED' : order.status
  }, include: { items: true } });
  dispatchCommerceEvent('order.shipment_created', updated).catch(() => {});
  if (updated.status !== order.status) dispatchCommerceEvent('order.status_changed', updated).catch(() => {});
  res.json({ shipment, order: updated });
}));

router.post('/orders/:id/refund', ...requireManager, asyncRoute(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payments: { orderBy: { createdAt: 'desc' } }, items: true } });
  if (!order) throw httpError(404, 'Order not found.');
  if (order.paymentStatus !== 'PAID' || order.paymentMethod === 'COD') throw httpError(400, 'This order does not have a refundable online payment.');
  const payment = order.payments.find((item) => item.status === 'PAID');
  if (!payment) throw httpError(400, 'Paid payment record not found.');
  const refund = await refundProviderPayment(payment, Number(order.total));
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundedAmount: Number(order.total), refundedAt: new Date(), metadata: { ...(payment.metadata || {}), refund } } });
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'REFUNDED' } });
  const updated = await setOrderStatus(order.id, 'REFUNDED');
  dispatchCommerceEvent('order.refunded', updated).catch(() => {});
  res.json({ order: updated, refund });
}));

router.get('/payment-sessions/review', ...requireManager, asyncRoute(async (req, res) => {
  const sessions = await prisma.paymentSession.findMany({
    where: { status: 'REQUIRES_REVIEW' },
    orderBy: { updatedAt: 'desc' },
    take: 100
  });
  res.json(sessions.map((session) => ({
    id: session.id,
    provider: session.provider,
    status: session.status,
    amount: Number(session.amount),
    currency: session.currency,
    providerSessionId: session.providerSessionId,
    providerPaymentId: session.providerPaymentId,
    customer: session.checkoutPayload?.customer || null,
    shippingAddress: session.checkoutPayload?.shippingAddress || null,
    itemCount: Array.isArray(session.checkoutPayload?.items) ? session.checkoutPayload.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  })));
}));

router.post('/payment-sessions/:id/retry', ...requireManager, asyncRoute(async (req, res) => {
  const session = await prisma.paymentSession.findUnique({ where: { id: req.params.id } });
  if (!session || session.status !== 'REQUIRES_REVIEW') throw httpError(404, 'Payment review session not found.');
  if (!session.providerPaymentId) throw httpError(400, 'The captured provider payment reference is missing. Refund this payment from the provider dashboard if necessary.');
  const claim = await prisma.paymentSession.updateMany({ where: { id: session.id, status: 'REQUIRES_REVIEW', orderId: null }, data: { status: 'PROCESSING' } });
  if (claim.count !== 1) throw httpError(409, 'This payment review is already being handled.');
  try {
    const order = await finalizeCheckout({
      prepared: session.checkoutPayload,
      userId: session.userId || null,
      paymentMethod: session.provider,
      paymentStatus: 'PAID',
      providerPaymentId: session.providerPaymentId,
      providerSessionId: session.providerSessionId
    });
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'PAID', orderId: order.id } });
    dispatchCommerceEvent('order.created', order).catch(() => {});
    res.json({ order });
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'REQUIRES_REVIEW' } }).catch(() => {});
    throw error;
  }
}));

router.post('/payment-sessions/:id/refund', ...requireManager, asyncRoute(async (req, res) => {
  const session = await prisma.paymentSession.findUnique({ where: { id: req.params.id } });
  if (!session || session.status !== 'REQUIRES_REVIEW') throw httpError(404, 'Payment review session not found.');
  if (!session.providerPaymentId) throw httpError(400, 'The provider payment reference is missing. Handle the refund in the provider dashboard.');
  const claim = await prisma.paymentSession.updateMany({ where: { id: session.id, status: 'REQUIRES_REVIEW', orderId: null }, data: { status: 'PROCESSING' } });
  if (claim.count !== 1) throw httpError(409, 'This payment review is already being handled.');
  try {
    const result = await refundProviderPayment({
      provider: session.provider,
      amount: Number(session.amount),
      refundedAmount: 0,
      providerPaymentId: session.providerPaymentId
    }, Number(session.amount));
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'CANCELLED' } });
    res.json({ ok: true, refund: result });
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'REQUIRES_REVIEW' } }).catch(() => {});
    throw error;
  }
}));

router.get('/inventory', ...requireManager, asyncRoute(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: { id: true, name: true, sku: true, stock: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true }, select: { id: true, title: true, sku: true, stock: true } } },
    orderBy: { name: 'asc' }
  });
  const rows = products.flatMap((product) => product.variants.length
    ? product.variants.map((variant) => ({ id: variant.id, kind: 'variant', productId: product.id, productName: product.name, name: variant.title, sku: variant.sku, stock: variant.stock, productStatus: product.status, imageUrl: product.images[0]?.url || null }))
    : [{ id: product.id, kind: 'product', productId: product.id, productName: product.name, name: null, sku: product.sku, stock: product.stock, productStatus: product.status, imageUrl: product.images[0]?.url || null }]);
  res.json(rows);
}));
router.patch('/inventory/:kind/:id', ...requireManager, asyncRoute(async (req, res) => {
  const input = z.object({ stock: z.coerce.number().int().min(0).max(100000000) }).parse(req.body);
  if (req.params.kind === 'product') return res.json(await prisma.product.update({ where: { id: req.params.id }, data: { stock: input.stock }, select: { id: true, stock: true } }));
  if (req.params.kind === 'variant') return res.json(await prisma.productVariant.update({ where: { id: req.params.id }, data: { stock: input.stock }, select: { id: true, stock: true } }));
  throw httpError(400, 'Invalid inventory item type.');
}));

router.get('/reports/summary', ...requireManager, asyncRoute(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
  const since = new Date(Date.now() - days * 86400000);
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: since } }, include: { items: true }, orderBy: { createdAt: 'asc' } });
  const revenueOrders = orders.filter((order) => !['CANCELLED','RETURNED','REFUNDED'].includes(order.status));
  const dailyMap = new Map();
  const productMap = new Map();
  const statusMap = new Map();
  for (const order of orders) {
    statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
    if (!revenueOrders.includes(order)) continue;
    const date = order.createdAt.toISOString().slice(0, 10);
    const row = dailyMap.get(date) || { date, revenue: 0, orders: 0 };
    row.revenue += Number(order.total); row.orders += 1; dailyMap.set(date, row);
    for (const item of order.items) {
      const key = item.productId || item.productName;
      const product = productMap.get(key) || { name: item.productName, quantity: 0, revenue: 0 };
      product.quantity += item.quantity; product.revenue += Number(item.total); productMap.set(key, product);
    }
  }
  const revenue = revenueOrders.reduce((sum, order) => sum + Number(order.total), 0);
  res.json({
    days,
    totals: { revenue, orders: orders.length, revenueOrders: revenueOrders.length, averageOrderValue: revenueOrders.length ? revenue / revenueOrders.length : 0 },
    daily: [...dailyMap.values()],
    topProducts: [...productMap.values()].sort((a,b) => b.revenue - a.revenue).slice(0, 10),
    statuses: [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a,b) => b.count - a.count)
  });
}));

router.get('/customers', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' } }))));
router.patch('/customers/:id', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.user.update({ where: { id: req.params.id }, data: { isActive: Boolean(req.body.isActive) }, select: { id: true, name: true, email: true, isActive: true } }))));
router.get('/customers/:id', ...requireManager, asyncRoute(async (req, res) => {
  const customer = await prisma.user.findFirst({ where: { id: req.params.id, role: 'CUSTOMER' }, select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }, orders: { include: { items: true }, orderBy: { createdAt: 'desc' } } } });
  if (!customer) throw httpError(404, 'Customer not found.');
  res.json(customer);
}));


router.get('/navigation/:key', asyncRoute(async (req, res) => {
  const config = await prisma.storeConfig.findFirst();
  if (!config) throw httpError(400, 'Configure the store first.');
  const menu = await prisma.menu.findUnique({ where: { storeConfigId_key: { storeConfigId: config.id, key: req.params.key } }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
  res.json(menu || { key: req.params.key, title: req.params.key, items: [] });
}));
router.put('/navigation/:key', asyncRoute(async (req, res) => {
  const config = await prisma.storeConfig.findFirst();
  if (!config) throw httpError(400, 'Configure the store first.');
  const menu = await prisma.menu.upsert({ where: { storeConfigId_key: { storeConfigId: config.id, key: req.params.key } }, update: { title: req.body.title || undefined }, create: { storeConfigId: config.id, key: req.params.key, title: req.body.title || req.params.key } });
  await prisma.menuItem.deleteMany({ where: { menuId: menu.id } });
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (items.length) await prisma.menuItem.createMany({ data: items.map((item, index) => ({ menuId: menu.id, label: String(item.label || '').trim(), linkType: item.linkType || 'ROUTE', target: item.target || '/', sortOrder: Number(item.sortOrder ?? index), isActive: item.isActive !== false })) });
  res.json(await prisma.menu.findUnique({ where: { id: menu.id }, include: { items: { orderBy: { sortOrder: 'asc' } } } }));
}));

router.get('/coupons', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }))));
router.post('/coupons', ...requireManager, asyncRoute(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) throw httpError(400, 'Coupon code is required.');
  res.status(201).json(await prisma.coupon.create({ data: { code, description: req.body.description || null, type: req.body.type === 'FIXED' ? 'FIXED' : 'PERCENT', value: Number(req.body.value || 0), minOrder: req.body.minOrder ? Number(req.body.minOrder) : null, maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : null, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null, expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null, usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : null, isActive: req.body.isActive !== false } }));
}));
router.put('/coupons/:id', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.coupon.update({ where: { id: req.params.id }, data: { code: String(req.body.code || '').trim().toUpperCase(), description: req.body.description || null, type: req.body.type === 'FIXED' ? 'FIXED' : 'PERCENT', value: Number(req.body.value || 0), minOrder: req.body.minOrder ? Number(req.body.minOrder) : null, maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : null, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null, expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null, usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : null, isActive: req.body.isActive !== false } }))));
router.delete('/coupons/:id', ...requireManager, asyncRoute(async (req, res) => { await prisma.coupon.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

router.get('/reviews', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.review.findMany({ include: { product: { select: { name: true } }, user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }))));
router.patch('/reviews/:id', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.review.update({ where: { id: req.params.id }, data: { isApproved: Boolean(req.body.isApproved) } }))));
router.delete('/reviews/:id', ...requireManager, asyncRoute(async (req, res) => { await prisma.review.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

router.get('/store-config', asyncRoute(async (req, res) => res.json(await prisma.storeConfig.findFirst({ include: { sections: { orderBy: { sortOrder: 'asc' } }, menus: { include: { items: { orderBy: { sortOrder: 'asc' } } } } } }))));
router.put('/store-config', ...requireManager, asyncRoute(async (req, res) => {
  const existing = await prisma.storeConfig.findFirst();
  const allowed = ['storeName','tagline','logoUrl','faviconUrl','currency','locale','supportEmail','supportPhone','businessAddress','socialLinks','theme','seoDefaults','commerceSettings','announcement','storefrontText'];
  const data = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
  res.json(existing ? await prisma.storeConfig.update({ where: { id: existing.id }, data }) : await prisma.storeConfig.create({ data }));
}));

router.get('/home-sections', asyncRoute(async (req, res) => res.json(await prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } }))));
router.post('/home-sections', asyncRoute(async (req, res) => {
  const config = await prisma.storeConfig.findFirst(); if (!config) throw httpError(400, 'Configure the store first.');
  const key = slugify(req.body.key || req.body.title || `section-${Date.now()}`);
  res.status(201).json(await prisma.homeSection.create({ data: { storeConfigId: config.id, key, type: req.body.type || 'TEXT', title: req.body.title || null, subtitle: req.body.subtitle || null, content: req.body.content || {}, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false } }));
}));
router.put('/home-sections/:id', asyncRoute(async (req, res) => res.json(await prisma.homeSection.update({ where: { id: req.params.id }, data: { type: req.body.type, title: req.body.title, subtitle: req.body.subtitle, content: req.body.content, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false } }))));
router.delete('/home-sections/:id', asyncRoute(async (req, res) => { await prisma.homeSection.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

router.get('/pages', asyncRoute(async (req, res) => res.json(await prisma.page.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] }))));
function pageData(body) {
  const title = String(body.title || '').trim();
  if (!title) throw httpError(400, 'Page title is required.');
  return { title, slug: slugify(body.slug || title), excerpt: body.excerpt || null, content: body.content || {}, metaTitle: body.metaTitle || null, metaDescription: body.metaDescription || null, ogImageUrl: body.ogImageUrl || null, noIndex: Boolean(body.noIndex), isPublished: body.isPublished !== false, sortOrder: Number(body.sortOrder || 0) };
}
router.post('/pages', asyncRoute(async (req, res) => res.status(201).json(await prisma.page.create({ data: pageData(req.body) }))));
router.put('/pages/:id', asyncRoute(async (req, res) => res.json(await prisma.page.update({ where: { id: req.params.id }, data: pageData(req.body) }))));
router.delete('/pages/:id', asyncRoute(async (req, res) => { await prisma.page.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

router.get('/faqs', asyncRoute(async (req, res) => res.json(await prisma.faq.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }))));
router.post('/faqs', asyncRoute(async (req, res) => res.status(201).json(await prisma.faq.create({ data: { question: req.body.question, answer: req.body.answer, category: req.body.category || null, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false } }))));
router.put('/faqs/:id', asyncRoute(async (req, res) => res.json(await prisma.faq.update({ where: { id: req.params.id }, data: { question: req.body.question, answer: req.body.answer, category: req.body.category || null, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false } }))));
router.delete('/faqs/:id', asyncRoute(async (req, res) => { await prisma.faq.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

router.get('/forms', asyncRoute(async (req, res) => res.json(await prisma.dynamicForm.findMany({ include: { _count: { select: { submissions: true } } }, orderBy: { updatedAt: 'desc' } }))));
router.post('/forms', asyncRoute(async (req, res) => { const title = String(req.body.title || '').trim(); if (!title) throw httpError(400, 'Form name is required.'); res.status(201).json(await prisma.dynamicForm.create({ data: { key: slugify(req.body.key || title), title, description: req.body.description || null, successText: req.body.successText || undefined, fields: req.body.fields || [], settings: req.body.settings || {}, isActive: req.body.isActive !== false } })); }));
router.put('/forms/:id', asyncRoute(async (req, res) => res.json(await prisma.dynamicForm.update({ where: { id: req.params.id }, data: { title: req.body.title, description: req.body.description || null, successText: req.body.successText, fields: req.body.fields || [], settings: req.body.settings || {}, isActive: req.body.isActive !== false } }))));
router.delete('/forms/:id', ...requireManager, asyncRoute(async (req, res) => { await prisma.dynamicForm.delete({ where: { id: req.params.id } }); res.status(204).end(); }));
router.get('/submissions', ...requireManager, asyncRoute(async (req, res) => res.json(await prisma.formSubmission.findMany({ include: { form: { select: { title: true, key: true } } }, orderBy: { createdAt: 'desc' } }))));
router.patch('/submissions/:id', ...requireManager, asyncRoute(async (req, res) => { const status = z.enum(['NEW','IN_REVIEW','CONTACTED','APPROVED','REJECTED','CLOSED']).parse(req.body.status); res.json(await prisma.formSubmission.update({ where: { id: req.params.id }, data: { status, notes: req.body.notes } })); }));


router.post('/media/upload', upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose a JPG, PNG, WebP or GIF image up to 5 MB.');
  const uploaded = await uploadMedia(req.file);
  res.status(201).json({ ...uploaded, name: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype });
}));

router.get('/blogs', asyncRoute(async (req, res) => res.json(await prisma.blogPost.findMany({ orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }] }))));
function blogData(body) {
  const title = String(body.title || '').trim();
  if (!title) throw httpError(400, 'Article title is required.');
  const isPublished = body.isPublished === true;
  return {
    title,
    slug: slugify(body.slug || title),
    excerpt: body.excerpt || null,
    content: body.content || {},
    coverImageUrl: body.coverImageUrl || null,
    metaTitle: body.metaTitle || null,
    metaDescription: body.metaDescription || null,
    ogImageUrl: body.ogImageUrl || null,
    noIndex: Boolean(body.noIndex),
    isPublished,
    publishedAt: isPublished ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : null
  };
}
router.post('/blogs', asyncRoute(async (req, res) => res.status(201).json(await prisma.blogPost.create({ data: blogData(req.body) }))));
router.put('/blogs/:id', asyncRoute(async (req, res) => res.json(await prisma.blogPost.update({ where: { id: req.params.id }, data: blogData(req.body) }))));
router.delete('/blogs/:id', asyncRoute(async (req, res) => { await prisma.blogPost.delete({ where: { id: req.params.id } }); res.status(204).end(); }));

router.get('/staff', ...requireOwner, asyncRoute(async (req, res) => {
  res.json(await prisma.user.findMany({ where: { role: { in: ['OWNER','ADMIN','MANAGER','EDITOR'] } }, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'asc' } }));
}));
router.post('/staff', ...requireOwner, asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().min(2).max(100), email: z.string().email(), phone: z.string().max(30).optional(), password: z.string().min(8).max(72), role: z.enum(['ADMIN','MANAGER','EDITOR']) }).parse(req.body);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email.toLowerCase(), phone: input.phone || null, passwordHash: await bcrypt.hash(input.password, 12), role: input.role } });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });
}));
router.patch('/staff/:id', ...requireOwner, asyncRoute(async (req, res) => {
  if (req.params.id === req.user.id && req.body.isActive === false) throw httpError(400, 'You cannot deactivate your own owner account.');
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role === 'CUSTOMER') throw httpError(404, 'Staff account not found.');
  const data = {};
  if (req.body.name !== undefined) data.name = String(req.body.name).trim();
  if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
  if (req.body.role !== undefined && target.role !== 'OWNER') data.role = z.enum(['ADMIN','MANAGER','EDITOR']).parse(req.body.role);
  if (req.body.password) data.passwordHash = await bcrypt.hash(z.string().min(8).max(72).parse(req.body.password), 12);
  res.json(await prisma.user.update({ where: { id: target.id }, data, select: { id: true, name: true, email: true, role: true, isActive: true } }));
}));

export default router;

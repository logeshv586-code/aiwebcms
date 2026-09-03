import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { prepareCheckout, finalizeCheckout } from '../services/checkout.js';
import { dispatchCommerceEvent } from '../integrations/notifications.js';
import { requestCustomerOrderAction } from '../services/orderLifecycle.js';

const router = Router();
const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string(), variantId: z.string().nullable().optional(), quantity: z.number().int().min(1).max(99) })).min(1),
  customer: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(5) }),
  shippingAddress: z.object({
    fullName: z.string().min(2), phone: z.string().min(5), line1: z.string().min(3), line2: z.string().optional(),
    city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2)
  }),
  paymentMethod: z.enum(['COD', 'RAZORPAY', 'STRIPE']).default('COD'),
  couponCode: z.string().optional(),
  shippingMethodId: z.union([z.string(), z.number()]).optional()
});

router.post('/checkout', optionalAuth, asyncRoute(async (req, res) => {
  const input = checkoutSchema.parse(req.body);
  if (input.paymentMethod !== 'COD') throw httpError(400, 'Use /api/payments/session for online payment providers.');
  const config = await prisma.storeConfig.findFirst();
  if (config?.commerceSettings?.codEnabled === false) throw httpError(400, 'Cash on Delivery is disabled for this store.');
  const prepared = await prepareCheckout(input);
  const order = await finalizeCheckout({ prepared, userId: req.user?.id || null, paymentMethod: 'COD', paymentStatus: 'PENDING' });
  dispatchCommerceEvent('order.created', order).catch(() => {});
  res.status(201).json({ order });
}));


router.post('/products/:productId/reviews', requireAuth, asyncRoute(async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: req.params.productId, status: 'PUBLISHED' }, select: { id: true } });
  if (!product) throw httpError(404, 'Product not found.');
  const rating = Number(req.body.rating || 0);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, 'Rating must be between 1 and 5.');
  const purchased = await prisma.order.findFirst({ where: { userId: req.user.id, status: 'DELIVERED', items: { some: { productId: req.params.productId } } } });
  const review = await prisma.review.upsert({
    where: { productId_userId: { productId: req.params.productId, userId: req.user.id } },
    update: { rating, title: req.body.title || null, body: req.body.body || null, isApproved: false, isVerified: Boolean(purchased) },
    create: { productId: req.params.productId, userId: req.user.id, rating, title: req.body.title || null, body: req.body.body || null, isApproved: false, isVerified: Boolean(purchased) }
  });
  res.status(201).json({ review, message: 'Review submitted for moderation.' });
}));

router.post('/coupons/validate', asyncRoute(async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const subtotal = Number(req.body?.subtotal || 0);
  if (!code) throw httpError(400, 'Enter a coupon code.');
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) throw httpError(404, 'Coupon is invalid or expired.');
  if (coupon.minOrder && subtotal < Number(coupon.minOrder)) throw httpError(400, `Minimum order is ${coupon.minOrder}.`);
  let discount = coupon.type === 'FIXED' ? Number(coupon.value) : subtotal * Number(coupon.value) / 100;
  if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  res.json({ code: coupon.code, discount: Math.min(discount, subtotal), description: coupon.description });
}));

router.get('/orders/my', requireAuth, asyncRoute(async (req, res) => {
  res.json(await prisma.order.findMany({ where: { userId: req.user.id }, include: { items: true }, orderBy: { createdAt: 'desc' } }));
}));


router.post('/orders/:orderNumber/request', optionalAuth, asyncRoute(async (req, res) => {
  const input = z.object({ email: z.string().email().optional(), action: z.enum(['CANCEL','RETURN']), reason: z.string().max(1000).optional() }).parse(req.body);
  const order = await requestCustomerOrderAction({ orderNumber: req.params.orderNumber, email: input.email, userId: req.user?.id || null, action: input.action, reason: input.reason });
  dispatchCommerceEvent('order.requested', order).catch(() => {});
  res.json({ order, message: input.action === 'CANCEL' ? 'Cancellation request submitted.' : 'Return request submitted.' });
}));

router.get('/orders/:orderNumber', asyncRoute(async (req, res) => {
  const email = String(req.query.email || '').toLowerCase();
  const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber }, include: { items: true } });
  if (!order || (email && String(order.customerSnapshot?.email || '').toLowerCase() !== email)) throw httpError(404, 'Order not found.');
  if (!email) throw httpError(400, 'Email is required to track an order.');
  res.json(order);
}));

export default router;

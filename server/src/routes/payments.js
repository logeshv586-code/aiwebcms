import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/auth.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { prepareCheckout, finalizeCheckout } from '../services/checkout.js';
import { createProviderSession, parseProviderWebhook, publicPaymentMethods, verifyProviderPayment } from '../integrations/payments.js';
import { dispatchCommerceEvent } from '../integrations/notifications.js';

const router = Router();
const common = {
  items: z.array(z.object({ productId: z.string(), variantId: z.string().nullable().optional(), quantity: z.number().int().min(1).max(99) })).min(1),
  customer: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(5) }),
  shippingAddress: z.object({ fullName: z.string().min(2), phone: z.string().min(5), line1: z.string().min(3), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2) }),
  couponCode: z.string().optional(),
  shippingMethodId: z.union([z.string(), z.number()]).optional()
};
const createSchema = z.object({ ...common, provider: z.enum(['STRIPE', 'RAZORPAY']) });


async function finalizeWebhookPayment(provider, parsed) {
  const session = await prisma.paymentSession.findFirst({ where: { provider, providerSessionId: parsed.providerSessionId } });
  if (!session) throw httpError(404, 'Payment session not found for this provider event.');
  if (session.orderId) return { alreadyCompleted: true, order: await prisma.order.findUnique({ where: { id: session.orderId }, include: { items: true } }) };
  const expectedMinor = Math.round(Number(session.amount) * 100);
  if (!Number.isFinite(parsed.amountMinor) || Math.abs(parsed.amountMinor - expectedMinor) > 1) throw httpError(400, 'Payment webhook amount does not match the checkout session.');
  if (parsed.currency && parsed.currency !== String(session.currency).toUpperCase()) throw httpError(400, 'Payment webhook currency does not match the checkout session.');
  if (session.status !== 'PENDING') return { alreadyProcessing: true, status: session.status };
  const claim = await prisma.paymentSession.updateMany({ where: { id: session.id, status: 'PENDING', orderId: null }, data: { status: 'PROCESSING' } });
  if (claim.count !== 1) return { alreadyProcessing: true };
  try {
    const order = await finalizeCheckout({ prepared: session.checkoutPayload, userId: session.userId || null, paymentMethod: provider, paymentStatus: 'PAID', providerPaymentId: parsed.providerPaymentId, providerSessionId: parsed.providerSessionId });
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'PAID', orderId: order.id, providerPaymentId: parsed.providerPaymentId } });
    dispatchCommerceEvent('order.created', order).catch(() => {});
    return { order };
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'REQUIRES_REVIEW', providerPaymentId: parsed.providerPaymentId } }).catch(() => {});
    throw error;
  }
}

router.post('/webhooks/:provider', asyncRoute(async (req, res) => {
  const provider = String(req.params.provider || '').toUpperCase();
  if (!['STRIPE','RAZORPAY'].includes(provider)) throw httpError(404, 'Unsupported payment webhook provider.');
  const parsed = await parseProviderWebhook(provider, req.rawBody, req.headers);
  if (parsed.ignored) return res.json({ received: true, ignored: true, event: parsed.event });
  const result = await finalizeWebhookPayment(provider, parsed);
  res.json({ received: true, ...result });
}));

router.get('/methods', asyncRoute(async (req, res) => {
  const config = await prisma.storeConfig.findFirst();
  res.json(await publicPaymentMethods(config));
}));

router.post('/session', optionalAuth, asyncRoute(async (req, res) => {
  const input = createSchema.parse(req.body);
  const prepared = await prepareCheckout(input);
  const session = await prisma.paymentSession.create({ data: { provider: input.provider, amount: prepared.total, currency: prepared.currency, checkoutPayload: prepared, userId: req.user?.id || null, expiresAt: new Date(Date.now() + 45 * 60 * 1000) } });
  try {
    const provider = await createProviderSession(input.provider, session, prepared);
    await prisma.paymentSession.update({ where: { id: session.id }, data: { providerSessionId: provider.providerSessionId } });
    res.status(201).json({ id: session.id, amount: prepared.total, currency: prepared.currency, ...provider });
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'FAILED' } }).catch(() => {});
    throw error;
  }
}));

router.post('/verify', optionalAuth, asyncRoute(async (req, res) => {
  const id = String(req.body?.sessionId || '');
  const session = await prisma.paymentSession.findUnique({ where: { id } });
  if (!session) throw httpError(404, 'Payment session not found.');
  if (session.orderId) {
    const order = await prisma.order.findUnique({ where: { id: session.orderId }, include: { items: true } });
    return res.json({ order, alreadyCompleted: true });
  }
  if (session.status !== 'PENDING') throw httpError(409, session.status === 'PROCESSING' ? 'This payment is already being verified.' : 'This payment session can no longer be completed.');
  if (session.expiresAt && session.expiresAt < new Date()) throw httpError(400, 'This payment session has expired. Please checkout again.');
  const claim = await prisma.paymentSession.updateMany({ where: { id: session.id, status: 'PENDING', orderId: null }, data: { status: 'PROCESSING' } });
  if (claim.count !== 1) throw httpError(409, 'This payment is already being processed.');
  let verification;
  try {
    verification = await verifyProviderPayment(session.provider, session, req.body || {});
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'PENDING' } }).catch(() => {});
    throw error;
  }
  try {
    const order = await finalizeCheckout({ prepared: session.checkoutPayload, userId: session.userId || req.user?.id || null, paymentMethod: session.provider, paymentStatus: 'PAID', providerPaymentId: verification.providerPaymentId, providerSessionId: verification.providerSessionId });
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'PAID', orderId: order.id, providerPaymentId: verification.providerPaymentId } });
    dispatchCommerceEvent('order.created', order).catch(() => {});
    return res.json({ order });
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { status: 'REQUIRES_REVIEW', providerPaymentId: verification.providerPaymentId } }).catch(() => {});
    throw error;
  }
}));

export default router;

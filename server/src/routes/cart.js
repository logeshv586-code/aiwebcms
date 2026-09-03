import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function getCart(userId) {
  return prisma.cart.upsert({
    where: { userId }, create: { userId }, update: {},
    include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: { where: { isActive: true } } } } }, orderBy: { createdAt: 'desc' } } }
  });
}

async function validateLine(productId, variantId, quantity) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!product || product.status !== 'PUBLISHED') throw httpError(404, 'Product unavailable.');
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  if (activeVariants.length && !variantId) throw httpError(400, 'Please select a product option.');
  const variant = variantId ? activeVariants.find((item) => item.id === variantId) : null;
  if (variantId && !variant) throw httpError(400, 'Selected option is unavailable.');
  const available = variant ? variant.stock : product.stock;
  if (available < quantity) throw httpError(400, `Only ${available} item(s) are available.`);
  return { product, variant, available };
}

router.get('/', asyncRoute(async (req, res) => res.json(await getCart(req.user.id))));

router.post('/items', asyncRoute(async (req, res) => {
  const data = z.object({ productId: z.string(), variantId: z.string().optional().nullable(), quantity: z.coerce.number().int().min(1).max(99).default(1) }).parse(req.body);
  const cart = await prisma.cart.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id }, update: {} });
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: data.productId, variantId: data.variantId || null } });
  const wanted = Math.min(99, (existing?.quantity || 0) + data.quantity);
  await validateLine(data.productId, data.variantId || null, wanted);
  if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: wanted } });
  else await prisma.cartItem.create({ data: { cartId: cart.id, productId: data.productId, variantId: data.variantId || null, quantity: data.quantity } });
  res.status(201).json(await getCart(req.user.id));
}));

router.put('/items/:id', asyncRoute(async (req, res) => {
  const { quantity } = z.object({ quantity: z.coerce.number().int().min(1).max(99) }).parse(req.body);
  const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
  const item = cart && await prisma.cartItem.findFirst({ where: { id: req.params.id, cartId: cart.id } });
  if (!item) throw httpError(404, 'Cart item not found.');
  await validateLine(item.productId, item.variantId, quantity);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  res.json(await getCart(req.user.id));
}));


router.put('/sync', asyncRoute(async (req, res) => {
  const input = z.object({ items: z.array(z.object({ productId: z.string(), variantId: z.string().optional().nullable(), quantity: z.coerce.number().int().min(1).max(99) })).max(100) }).parse(req.body);
  const deduped = new Map();
  for (const line of input.items) {
    const key = `${line.productId}:${line.variantId || 'base'}`;
    deduped.set(key, { ...line, variantId: line.variantId || null });
  }
  const lines = [...deduped.values()];
  for (const line of lines) await validateLine(line.productId, line.variantId, line.quantity);
  const cart = await prisma.cart.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id }, update: {} });
  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (lines.length) await tx.cartItem.createMany({ data: lines.map((line) => ({ cartId: cart.id, ...line })) });
  });
  res.json(await getCart(req.user.id));
}));

router.delete('/items/:id', asyncRoute(async (req, res) => {
  const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
  const item = cart && await prisma.cartItem.findFirst({ where: { id: req.params.id, cartId: cart.id } });
  if (!item) throw httpError(404, 'Cart item not found.');
  await prisma.cartItem.delete({ where: { id: item.id } });
  res.json(await getCart(req.user.id));
}));

export default router;

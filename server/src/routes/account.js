import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);


router.put('/profile', asyncRoute(async (req, res) => {
  const data = z.object({ name: z.string().min(2).max(100), phone: z.string().max(30).optional().nullable() }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { name: data.name, phone: data.phone || null }, select: { id: true, name: true, email: true, phone: true, role: true } });
  res.json({ user });
}));

router.put('/password', asyncRoute(async (req, res) => {
  const input = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw httpError(400, 'Current password is incorrect.');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } });
  res.json({ message: 'Password changed successfully.' });
}));

router.get('/addresses', asyncRoute(async (req, res) => res.json(await prisma.address.findMany({ where: { userId: req.user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }))));
router.post('/addresses', asyncRoute(async (req, res) => {
  const schema = z.object({ label: z.string().optional(), fullName: z.string().min(2), phone: z.string().min(5), line1: z.string().min(3), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2), isDefault: z.boolean().default(false) });
  const data = schema.parse(req.body);
  if (data.isDefault) await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  res.status(201).json(await prisma.address.create({ data: { ...data, userId: req.user.id } }));
}));

router.put('/addresses/:id', asyncRoute(async (req, res) => {
  const found = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!found) throw httpError(404, 'Address not found.');
  const schema = z.object({ label: z.string().optional(), fullName: z.string().min(2), phone: z.string().min(5), line1: z.string().min(3), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2), isDefault: z.boolean().default(false) });
  const data = schema.parse(req.body);
  if (data.isDefault) await prisma.address.updateMany({ where: { userId: req.user.id, id: { not: found.id } }, data: { isDefault: false } });
  res.json(await prisma.address.update({ where: { id: found.id }, data }));
}));

router.delete('/addresses/:id', asyncRoute(async (req, res) => {
  const found = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!found) throw httpError(404, 'Address not found.');
  await prisma.address.delete({ where: { id: found.id } });
  res.status(204).end();
}));

router.get('/wishlist', asyncRoute(async (req, res) => {
  const list = await prisma.wishlist.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id }, include: { items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true } } } } } } } });
  res.json(list);
}));
router.post('/wishlist/:productId', asyncRoute(async (req, res) => {
  const list = await prisma.wishlist.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id } });
  const item = await prisma.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: list.id, productId: req.params.productId } }, update: {}, create: { wishlistId: list.id, productId: req.params.productId } });
  res.status(201).json(item);
}));
router.delete('/wishlist/:productId', asyncRoute(async (req, res) => {
  const list = await prisma.wishlist.findUnique({ where: { userId: req.user.id } });
  if (list) await prisma.wishlistItem.deleteMany({ where: { wishlistId: list.id, productId: req.params.productId } });
  res.status(204).end();
}));

export default router;

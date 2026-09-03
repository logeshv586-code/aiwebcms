import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { sendTransactionalEmail } from '../integrations/notifications.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(30).optional()
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function tokenFor(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: '7d' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

router.post('/register', asyncRoute(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const email = input.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw httpError(409, 'An account with this email already exists.');
  const user = await prisma.user.create({ data: {
    name: input.name,
    email,
    phone: input.phone || null,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: 'CUSTOMER'
  }});
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw httpError(401, 'Email or password is incorrect.');
  }
  res.json({ token: tokenFor(user), user: publicUser(user) });
}));

router.post('/forgot-password', asyncRoute(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const normalized = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  let developmentResetToken = null;
  if (user?.isActive) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const site = String(process.env.PUBLIC_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${site}/reset-password?token=${encodeURIComponent(token)}`;
    const delivery = await sendTransactionalEmail({
      to: user.email,
      subject: 'Reset your password',
      text: `A password reset was requested for your account. Open this link within 30 minutes: ${resetUrl}\n\nIf you did not request this, you can ignore this message.`
    }).catch(() => ({ sent: false }));
    if (!delivery.sent && process.env.NODE_ENV !== 'production') developmentResetToken = token;
  }
  res.json({
    message: 'If an active account exists for that email, password reset instructions have been sent.',
    ...(developmentResetToken ? { developmentResetToken } : {})
  });
}));

router.post('/reset-password', asyncRoute(async (req, res) => {
  const input = z.object({ token: z.string().min(20), password: z.string().min(8).max(72) }).parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) throw httpError(400, 'This reset link is invalid or expired.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(input.password, 12) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id }, usedAt: null } })
  ]);
  res.json({ message: 'Password updated. You can sign in with your new password.' });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;

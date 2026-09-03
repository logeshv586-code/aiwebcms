import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import storefrontRoutes from './routes/storefront.js';
import commerceRoutes from './routes/commerce.js';
import accountRoutes from './routes/account.js';
import cartRoutes from './routes/cart.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import shippingRoutes from './routes/shipping.js';
import { errorHandler, notFound } from './utils/http.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((v) => v.trim()), credentials: true }));
  app.use(express.json({ limit: '2mb', verify: (req, res, buffer) => { if (req.originalUrl?.startsWith('/api/payments/webhooks/')) req.rawBody = Buffer.from(buffer); } }));
  app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads'), { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0 }));
  app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'white-label-commerce-api', version: '1.0.0' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/storefront', storefrontRoutes);
  app.use('/api', commerceRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/shipping', shippingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use(notFound);
  app.use((error, req, res, next) => {
    if (error?.name === 'MulterError') return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Image is too large. Maximum size is 5 MB.' : 'Image upload failed.' });
    if (error?.name === 'ZodError') return res.status(400).json({ message: 'Please check the form fields.', issues: error.issues });
    if (error?.code === 'P2002') return res.status(409).json({ message: 'This value already exists. Try a different name, slug, SKU, or email.' });
    if (error?.code === 'P2025') return res.status(404).json({ message: 'The item could not be found.' });
    return errorHandler(error, req, res, next);
  });
  return app;
}

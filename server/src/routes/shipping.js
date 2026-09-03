import { Router } from 'express';
import { asyncRoute } from '../utils/http.js';
import { quoteShipping } from '../integrations/shipping.js';

const router = Router();
router.post('/quote', asyncRoute(async (req, res) => {
  res.json(await quoteShipping({ items: req.body?.items || [], address: req.body?.address || {}, orderValue: Number(req.body?.orderValue || 0), paymentMethod: String(req.body?.paymentMethod || 'PREPAID').toUpperCase() }));
}));
export default router;

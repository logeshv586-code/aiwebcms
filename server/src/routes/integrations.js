import { Router } from 'express';
import crypto from 'crypto';
import { asyncRoute, httpError } from '../utils/http.js';
import { requireRoles } from '../middleware/auth.js';
import { listConnections, removeConnection, saveConnection, testAndRecordConnection, getConnection } from '../integrations/service.js';
import { sendIntegrationMessage } from '../integrations/notifications.js';

const router = Router();
router.use(requireRoles('OWNER', 'ADMIN', 'MANAGER'));

router.get('/', asyncRoute(async (req, res) => res.json(await listConnections())));

router.put('/:category/:provider', asyncRoute(async (req, res) => {
  const category = String(req.params.category || '').toUpperCase();
  const provider = String(req.params.provider || '').toUpperCase();
  res.json(await saveConnection(category, provider, req.body || {}));
}));

router.post('/:category/:provider/test', asyncRoute(async (req, res) => {
  const category = String(req.params.category || '').toUpperCase();
  const provider = String(req.params.provider || '').toUpperCase();
  res.json(await testAndRecordConnection(category, provider));
}));

router.post('/:category/:provider/test-send', asyncRoute(async (req, res) => {
  const category = String(req.params.category || '').toUpperCase();
  const provider = String(req.params.provider || '').toUpperCase();
  await sendIntegrationMessage(category, provider, {
    to: req.body?.to,
    subject: req.body?.subject || 'Commerce CMS integration test',
    text: req.body?.text || 'Your integration is connected and can send messages.',
    event: 'integration.test',
    data: { message: req.body?.text || 'Test event from Commerce CMS' }
  });
  res.json({ ok: true, message: 'Test message delivered.' });
}));

router.delete('/:category/:provider', asyncRoute(async (req, res) => {
  await removeConnection(String(req.params.category || '').toUpperCase(), String(req.params.provider || '').toUpperCase());
  res.status(204).end();
}));

export default router;

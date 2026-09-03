import crypto from 'crypto';
import { getEnabledConnections, getConnection } from './service.js';

function eventEnabled(connection, event) {
  const raw = connection.config?.events;
  if (!raw) return event === 'order.created';
  const events = Array.isArray(raw) ? raw : String(raw).split(',').map((v) => v.trim()).filter(Boolean);
  return events.includes('*') || events.includes(event);
}

async function sendSmtp(connection, { to, subject, text }) {
  if (!to) throw new Error('Email recipient is required.');
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: connection.config?.host,
    port: Number(connection.config?.port || 587),
    secure: Boolean(connection.config?.secure),
    auth: connection.config?.username ? { user: connection.config.username, pass: connection.secrets?.password || '' } : undefined
  });
  await transporter.sendMail({
    from: { name: connection.config?.fromName || 'Store', address: connection.config?.fromEmail || connection.config?.username },
    to, subject, text
  });
}

async function sendTwilio(connection, { to, text }) {
  if (!to) throw new Error('SMS recipient is required.');
  const body = new URLSearchParams({ To: to, From: connection.config?.fromNumber || '', Body: text });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(connection.config?.accountSid || '')}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${connection.config?.accountSid}:${connection.secrets?.authToken}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Twilio returned ${response.status}.`);
}

async function sendWhatsApp(connection, { to, text }) {
  if (!to) throw new Error('WhatsApp recipient is required.');
  const version = connection.config?.apiVersion || 'v21.0';
  const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(connection.config?.phoneNumberId || '')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${connection.secrets?.accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/\D/g, ''), type: 'text', text: { body: text } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `WhatsApp returned ${response.status}.`);
}

async function sendWebhook(connection, event, data) {
  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data });
  const signature = connection.secrets?.signingSecret ? crypto.createHmac('sha256', connection.secrets.signingSecret).update(body).digest('hex') : null;
  const response = await fetch(connection.config?.url, { method: 'POST', headers: { 'content-type': 'application/json', ...(signature ? { 'x-commerce-signature': signature } : {}) }, body });
  if (!response.ok) throw new Error(`Webhook receiver returned ${response.status}.`);
}

export async function sendIntegrationMessage(category, provider, payload) {
  const connection = await getConnection(category, provider, { enabledOnly: true });
  if (!connection) throw new Error('Enable this integration before sending a test message.');
  if (category === 'EMAIL' && provider === 'SMTP') return sendSmtp(connection, payload);
  if (category === 'SMS' && provider === 'TWILIO') return sendTwilio(connection, payload);
  if (category === 'WHATSAPP' && provider === 'META') return sendWhatsApp(connection, payload);
  if (category === 'WEBHOOK' && provider === 'CUSTOM') return sendWebhook(connection, payload.event || 'integration.test', payload.data || { message: payload.text || 'Test event' });
  throw new Error('This integration does not support message delivery.');
}

export async function dispatchCommerceEvent(event, data) {
  const [emails, sms, whatsapp, webhooks] = await Promise.all([
    getEnabledConnections('EMAIL'), getEnabledConnections('SMS'), getEnabledConnections('WHATSAPP'), getEnabledConnections('WEBHOOK')
  ]);
  const customer = data?.customerSnapshot || data?.customer || {};
  const orderMessages = {
    'order.created': data?.orderNumber ? `Order ${data.orderNumber} was confirmed. Total: ${data.total}.` : null,
    'order.status_changed': data?.orderNumber ? `Order ${data.orderNumber} is now ${String(data.status || '').replaceAll('_', ' ').toLowerCase()}.` : null,
    'order.shipment_created': data?.orderNumber ? `Order ${data.orderNumber} has shipping details available${data.trackingNumber ? `: ${data.trackingNumber}` : '.'}` : null,
    'order.requested': data?.orderNumber ? `A customer request was submitted for order ${data.orderNumber}.` : null,
    'order.refunded': data?.orderNumber ? `Order ${data.orderNumber} has been refunded.` : null
  };
  const orderText = orderMessages[event] || `Store event: ${event}`;
  const jobs = [];
  for (const connection of emails.filter((item) => item.status === 'CONNECTED' && eventEnabled(item, event))) {
    if (customer.email) jobs.push(sendSmtp(connection, { to: customer.email, subject: data?.orderNumber ? `Order ${data.orderNumber}` : 'Store update', text: orderText }));
  }
  for (const connection of sms.filter((item) => item.status === 'CONNECTED' && eventEnabled(item, event))) {
    if (customer.phone) jobs.push(sendTwilio(connection, { to: customer.phone, text: orderText }));
  }
  for (const connection of whatsapp.filter((item) => item.status === 'CONNECTED' && eventEnabled(item, event))) {
    if (customer.phone) jobs.push(sendWhatsApp(connection, { to: customer.phone, text: orderText }));
  }
  for (const connection of webhooks.filter((item) => item.status === 'CONNECTED' && eventEnabled(item, event))) jobs.push(sendWebhook(connection, event, data));
  const results = await Promise.allSettled(jobs);
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) console.warn(`[integrations] ${failures.length} delivery action(s) failed for ${event}.`);
}

export async function sendTransactionalEmail({ to, subject, text }) {
  const connections = await getEnabledConnections('EMAIL');
  const connection = connections.find((item) => item.provider === 'SMTP' && item.status === 'CONNECTED');
  if (!connection) return { sent: false, reason: 'NO_EMAIL_PROVIDER' };
  await sendSmtp(connection, { to, subject, text });
  return { sent: true, provider: 'SMTP' };
}

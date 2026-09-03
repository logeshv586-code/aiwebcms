import crypto from 'crypto';
import { getConnection } from './service.js';

const basic = (username, password) => `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

async function jsonChecked(url, options, label) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.description || data.error?.message || data.message || `${label} returned ${response.status}.`);
  return data;
}

export async function publicPaymentMethods(storeConfig) {
  const methods = [];
  if (storeConfig?.commerceSettings?.codEnabled !== false) methods.push({ provider: 'COD', label: storeConfig?.storefrontText?.codLabel || 'Cash on Delivery', mode: 'offline' });
  for (const provider of ['STRIPE', 'RAZORPAY']) {
    const connection = await getConnection('PAYMENT', provider, { enabledOnly: true });
    if (!connection || connection.status !== 'CONNECTED') continue;
    methods.push({
      provider,
      label: connection.label || (provider === 'STRIPE' ? 'Card / Stripe' : 'Razorpay'),
      mode: provider === 'STRIPE' ? 'redirect' : 'popup',
      publicConfig: provider === 'RAZORPAY' ? { keyId: connection.config?.keyId } : { publishableKey: connection.config?.publishableKey || '' }
    });
  }
  return methods;
}

export async function createProviderSession(provider, paymentSession, prepared) {
  const connection = await getConnection('PAYMENT', provider, { enabledOnly: true });
  if (!connection || connection.status !== 'CONNECTED') throw new Error(`${provider} is not enabled and connected.`);
  const site = String(process.env.PUBLIC_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
  if (provider === 'STRIPE') {
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', connection.config?.successUrl || `${site}/payment/complete?local_session=${encodeURIComponent(paymentSession.id)}&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', connection.config?.cancelUrl || `${site}/checkout?payment=cancelled`);
    params.set('customer_email', prepared.customer.email);
    let remainingDiscount = Math.round(prepared.discount * 100);
    let lineIndex = 0;
    for (const item of prepared.items) {
      const originalCents = Math.round(item.unitPrice * item.quantity * 100);
      const discountCents = Math.min(remainingDiscount, originalCents);
      remainingDiscount -= discountCents;
      const chargedCents = originalCents - discountCents;
      if (chargedCents <= 0) continue;
      params.set(`line_items[${lineIndex}][price_data][currency]`, prepared.currency.toLowerCase());
      params.set(`line_items[${lineIndex}][price_data][unit_amount]`, String(chargedCents));
      params.set(`line_items[${lineIndex}][price_data][product_data][name]`, `${item.productName}${item.variantName ? ` — ${item.variantName}` : ''}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`);
      params.set(`line_items[${lineIndex}][quantity]`, '1');
      lineIndex += 1;
    }
    if (prepared.shipping > 0) {
      params.set(`line_items[${lineIndex}][price_data][currency]`, prepared.currency.toLowerCase());
      params.set(`line_items[${lineIndex}][price_data][unit_amount]`, String(Math.round(prepared.shipping * 100)));
      params.set(`line_items[${lineIndex}][price_data][product_data][name]`, 'Shipping');
      params.set(`line_items[${lineIndex}][quantity]`, '1');
      lineIndex += 1;
    }
    if (prepared.tax > 0) {
      params.set(`line_items[${lineIndex}][price_data][currency]`, prepared.currency.toLowerCase());
      params.set(`line_items[${lineIndex}][price_data][unit_amount]`, String(Math.round(prepared.tax * 100)));
      params.set(`line_items[${lineIndex}][price_data][product_data][name]`, 'Tax');
      params.set(`line_items[${lineIndex}][quantity]`, '1');
      lineIndex += 1;
    }
    if (lineIndex === 0) throw new Error('Stripe cannot create a zero-value checkout.');
    params.set('metadata[local_session_id]', paymentSession.id);
    const data = await jsonChecked('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${connection.secrets.secretKey}`, 'content-type': 'application/x-www-form-urlencoded' }, body: params }, 'Stripe');
    return { providerSessionId: data.id, redirectUrl: data.url, client: { mode: 'redirect' } };
  }
  if (provider === 'RAZORPAY') {
    const data = await jsonChecked('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { Authorization: basic(connection.config.keyId, connection.secrets.keySecret), 'content-type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(prepared.total * 100), currency: prepared.currency, receipt: paymentSession.id, notes: { local_session_id: paymentSession.id } })
    }, 'Razorpay');
    return { providerSessionId: data.id, client: { mode: 'popup', keyId: connection.config.keyId, amount: data.amount, currency: data.currency, orderId: data.id, name: prepared.customer.name, email: prepared.customer.email, phone: prepared.customer.phone } };
  }
  throw new Error('Unsupported payment provider.');
}

export async function verifyProviderPayment(provider, paymentSession, input) {
  const connection = await getConnection('PAYMENT', provider, { enabledOnly: true });
  if (!connection || connection.status !== 'CONNECTED') throw new Error(`${provider} is not enabled and connected.`);
  if (provider === 'STRIPE') {
    const providerSessionId = input.providerSessionId || paymentSession.providerSessionId;
    if (!providerSessionId || providerSessionId !== paymentSession.providerSessionId) throw new Error('Payment session does not match.');
    const data = await jsonChecked(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(providerSessionId)}`, { headers: { Authorization: `Bearer ${connection.secrets.secretKey}` } }, 'Stripe');
    if (data.payment_status !== 'paid') throw new Error('Stripe payment is not marked paid yet.');
    if (Math.abs(Number(data.amount_total || 0) - Math.round(Number(paymentSession.amount) * 100)) > 1) throw new Error('Stripe payment amount does not match this checkout.');
    return { ok: true, providerSessionId, providerPaymentId: data.payment_intent || data.id };
  }
  if (provider === 'RAZORPAY') {
    const paymentId = String(input.razorpay_payment_id || '');
    const orderId = String(input.razorpay_order_id || '');
    const signature = String(input.razorpay_signature || '');
    if (!paymentId || !orderId || !signature || orderId !== paymentSession.providerSessionId) throw new Error('Razorpay payment details are incomplete.');
    const expected = crypto.createHmac('sha256', connection.secrets.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(signature) || expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new Error('Razorpay signature verification failed.');
    return { ok: true, providerSessionId: orderId, providerPaymentId: paymentId };
  }
  throw new Error('Unsupported payment provider.');
}

export async function refundProviderPayment(payment, amount) {
  const provider = payment.provider;
  const connection = await getConnection('PAYMENT', provider, { enabledOnly: true });
  if (!connection || connection.status !== 'CONNECTED') throw new Error(`${provider} is not enabled and connected.`);
  const refundAmount = Number(amount ?? payment.amount);
  if (!(refundAmount > 0) || refundAmount > Number(payment.amount) - Number(payment.refundedAmount || 0) + 0.001) throw new Error('Refund amount is invalid.');
  if (!payment.providerPaymentId) throw new Error('The payment provider reference is missing.');
  if (provider === 'STRIPE') {
    const params = new URLSearchParams({ payment_intent: payment.providerPaymentId, amount: String(Math.round(refundAmount * 100)) });
    const data = await jsonChecked('https://api.stripe.com/v1/refunds', { method: 'POST', headers: { Authorization: `Bearer ${connection.secrets.secretKey}`, 'content-type': 'application/x-www-form-urlencoded' }, body: params }, 'Stripe');
    return { provider: 'STRIPE', refundId: data.id, status: data.status || 'succeeded', amount: refundAmount };
  }
  if (provider === 'RAZORPAY') {
    const data = await jsonChecked(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`, { method: 'POST', headers: { Authorization: basic(connection.config.keyId, connection.secrets.keySecret), 'content-type': 'application/json' }, body: JSON.stringify({ amount: Math.round(refundAmount * 100), speed: 'normal' }) }, 'Razorpay');
    return { provider: 'RAZORPAY', refundId: data.id, status: data.status || 'processed', amount: refundAmount };
  }
  throw new Error('This payment provider does not support refunds.');
}

function timingSafeHexEqual(expected, actual) {
  const a = Buffer.from(String(expected || ''), 'utf8');
  const b = Buffer.from(String(actual || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function parseProviderWebhook(provider, rawBody, headers = {}) {
  const connection = await getConnection('PAYMENT', provider, { enabledOnly: true });
  if (!connection || connection.status !== 'CONNECTED') throw new Error(`${provider} webhook received while the provider is not enabled and connected.`);
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '');
  if (!body.length) throw new Error('Payment webhook body is missing.');
  if (provider === 'STRIPE') {
    const secret = connection.secrets?.webhookSecret;
    if (!secret) throw new Error('Stripe webhook secret is not configured.');
    const signatureHeader = String(headers['stripe-signature'] || '');
    const pairs = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=', 2)).filter((part) => part.length === 2));
    const timestamp = pairs.t; const signature = pairs.v1;
    if (!timestamp || !signature) throw new Error('Stripe webhook signature is missing.');
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) throw new Error('Stripe webhook timestamp is outside the allowed tolerance.');
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body.toString('utf8')}`).digest('hex');
    if (!timingSafeHexEqual(expected, signature)) throw new Error('Stripe webhook signature verification failed.');
    const event = JSON.parse(body.toString('utf8'));
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return { ignored: true, event: event.type };
    const entity = event.data?.object || {};
    if (entity.payment_status && entity.payment_status !== 'paid') return { ignored: true, event: event.type };
    return { ignored: false, providerSessionId: entity.id, providerPaymentId: entity.payment_intent || entity.id, amountMinor: Number(entity.amount_total), currency: String(entity.currency || '').toUpperCase(), event: event.type };
  }
  if (provider === 'RAZORPAY') {
    const secret = connection.secrets?.webhookSecret;
    if (!secret) throw new Error('Razorpay webhook secret is not configured.');
    const signature = String(headers['x-razorpay-signature'] || '');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (!timingSafeHexEqual(expected, signature)) throw new Error('Razorpay webhook signature verification failed.');
    const event = JSON.parse(body.toString('utf8'));
    if (event.event !== 'payment.captured') return { ignored: true, event: event.event };
    const entity = event.payload?.payment?.entity || {};
    return { ignored: false, providerSessionId: entity.order_id, providerPaymentId: entity.id, amountMinor: Number(entity.amount), currency: String(entity.currency || '').toUpperCase(), event: event.event };
  }
  throw new Error('Unsupported payment webhook provider.');
}

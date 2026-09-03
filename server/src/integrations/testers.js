import { testS3 } from './s3.js';

async function fetchChecked(url, options = {}, label = 'Provider') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text().catch(() => '');
    if (!response.ok) throw new Error(`${label} returned ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`);
    return { response, body };
  } finally { clearTimeout(timer); }
}

const basic = (username, password) => `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

export async function testConnection(connection) {
  const { category, provider, config = {}, secrets = {} } = connection;
  if (category === 'PAYMENT' && provider === 'STRIPE') {
    if (!secrets.secretKey) throw new Error('Stripe secret key is required.');
    await fetchChecked('https://api.stripe.com/v1/account', { headers: { Authorization: `Bearer ${secrets.secretKey}` } }, 'Stripe');
    return { ok: true, message: 'Stripe credentials are valid.' };
  }
  if (category === 'PAYMENT' && provider === 'RAZORPAY') {
    if (!config.keyId || !secrets.keySecret) throw new Error('Razorpay key ID and key secret are required.');
    await fetchChecked('https://api.razorpay.com/v1/orders?count=1', { headers: { Authorization: basic(config.keyId, secrets.keySecret) } }, 'Razorpay');
    return { ok: true, message: 'Razorpay credentials are valid.' };
  }
  if (category === 'STORAGE' && provider === 'CLOUDINARY') {
    if (!config.cloudName || !secrets.apiKey || !secrets.apiSecret) throw new Error('Cloudinary cloud name, API key and API secret are required.');
    await fetchChecked(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/image?max_results=1`, { headers: { Authorization: basic(secrets.apiKey, secrets.apiSecret) } }, 'Cloudinary');
    return { ok: true, message: 'Cloudinary credentials are valid.' };
  }
  if (category === 'STORAGE' && provider === 'S3') return testS3(connection);
  if (category === 'EMAIL' && provider === 'SMTP') {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: config.host, port: Number(config.port || 587), secure: Boolean(config.secure),
      auth: config.username ? { user: config.username, pass: secrets.password || '' } : undefined
    });
    await transporter.verify();
    return { ok: true, message: 'SMTP connection and authentication succeeded.' };
  }
  if (category === 'SMS' && provider === 'TWILIO') {
    if (!config.accountSid || !secrets.authToken) throw new Error('Twilio account SID and auth token are required.');
    await fetchChecked(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}.json`, { headers: { Authorization: basic(config.accountSid, secrets.authToken) } }, 'Twilio');
    return { ok: true, message: 'Twilio credentials are valid.' };
  }
  if (category === 'WHATSAPP' && provider === 'META') {
    if (!config.phoneNumberId || !secrets.accessToken) throw new Error('WhatsApp phone number ID and access token are required.');
    const version = config.apiVersion || 'v21.0';
    await fetchChecked(`https://graph.facebook.com/${version}/${encodeURIComponent(config.phoneNumberId)}?fields=display_phone_number,verified_name`, { headers: { Authorization: `Bearer ${secrets.accessToken}` } }, 'Meta');
    return { ok: true, message: 'WhatsApp Cloud API credentials are valid.' };
  }
  if (category === 'SHIPPING' && provider === 'SHIPROCKET') {
    if (!config.email || !secrets.password) throw new Error('Shiprocket email and password are required.');
    await fetchChecked('https://apiv2.shiprocket.in/v1/external/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: config.email, password: secrets.password }) }, 'Shiprocket');
    return { ok: true, message: 'Shiprocket login succeeded.' };
  }
  if (category === 'SHIPPING' && provider === 'CUSTOM_API') {
    if (!config.healthUrl) throw new Error('Add a health/test URL first.');
    await fetchChecked(config.healthUrl, { headers: secrets.bearerToken ? { Authorization: `Bearer ${secrets.bearerToken}` } : {} }, 'Shipping API');
    return { ok: true, message: 'Custom shipping API responded successfully.' };
  }
  if (category === 'WEBHOOK' && provider === 'CUSTOM') {
    if (!config.url) throw new Error('Webhook URL is required.');
    const parsed = new URL(config.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Webhook URL must use HTTP or HTTPS.');
    return { ok: true, message: 'Webhook URL is valid. Use the test-send action to verify the receiver.' };
  }
  throw new Error('No connection test is available for this provider.');
}

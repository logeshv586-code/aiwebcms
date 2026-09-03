import crypto from 'crypto';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest();

function encodePathPart(value) { return encodeURIComponent(value).replace(/%2F/g, '/').replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }

function resolveUrl(config, key = '') {
  const bucket = String(config.bucket || '').trim();
  const region = String(config.region || 'us-east-1').trim();
  if (!bucket) throw new Error('S3 bucket is required.');
  if (config.endpoint) {
    const url = new URL(config.endpoint);
    const base = url.pathname.replace(/\/$/, '');
    url.pathname = `${base}${config.forcePathStyle === false ? '' : `/${bucket}`}${key ? `/${encodePathPart(key)}` : ''}` || '/';
    return url;
  }
  const url = new URL(`https://${bucket}.s3.${region}.amazonaws.com`);
  url.pathname = key ? `/${encodePathPart(key)}` : '/';
  return url;
}

function signingHeaders(method, url, body, region, accessKeyId, secretAccessKey) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = amzDate.slice(0, 8);
  const payloadHash = sha256(body || Buffer.alloc(0));
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, url.pathname || '/', url.searchParams.toString(), canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${shortDate}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;
  const dateKey = hmac(Buffer.from(`AWS4${secretAccessKey}`, 'utf8'), shortDate);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return {
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

async function signedRequest(method, connection, key = '', body = null, extraHeaders = {}) {
  const { config = {}, secrets = {} } = connection;
  const region = String(config.region || 'us-east-1');
  if (!secrets.accessKeyId || !secrets.secretAccessKey) throw new Error('S3 access key ID and secret access key are required.');
  const url = resolveUrl(config, key);
  const buffer = body ? Buffer.from(body) : Buffer.alloc(0);
  const headers = { ...signingHeaders(method, url, buffer, region, secrets.accessKeyId, secrets.secretAccessKey), ...extraHeaders };
  const response = await fetch(url, { method, headers, ...(method === 'PUT' ? { body: buffer } : {}) });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`S3 returned ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`);
  }
  return { response, url };
}

export async function testS3(connection) {
  await signedRequest('HEAD', connection);
  return { ok: true, message: 'Bucket connection succeeded.' };
}

export async function uploadS3(connection, { buffer, filename, mimeType }) {
  const prefix = String(connection.config?.folder || 'store-media').replace(/^\/+|\/+$/g, '');
  const key = `${prefix}/${filename}`;
  const { url } = await signedRequest('PUT', connection, key, buffer, { 'content-type': mimeType || 'application/octet-stream' });
  const base = String(connection.config?.publicBaseUrl || '').replace(/\/$/, '');
  return base ? `${base}/${key.split('/').map(encodeURIComponent).join('/')}` : url.toString();
}

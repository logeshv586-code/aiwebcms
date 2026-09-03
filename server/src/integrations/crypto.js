import crypto from 'crypto';

function encryptionKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) {
    const error = new Error('INTEGRATION_ENCRYPTION_KEY is required before saving merchant credentials.');
    error.status = 500;
    throw error;
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecrets(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value || {}), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecrets(payload) {
  if (!payload) return {};
  const [ivRaw, tagRaw, dataRaw] = String(payload).split('.');
  if (!ivRaw || !tagRaw || !dataRaw) throw new Error('Stored integration credentials are invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataRaw, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
}

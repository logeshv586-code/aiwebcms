import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getEnabledConnections } from './service.js';
import { uploadS3 } from './s3.js';

function safeExtension(originalName, mimeType) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (/^\.(png|jpe?g|webp|gif)$/.test(ext)) return ext;
  const map = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
  return map[mimeType] || '.bin';
}

async function uploadLocal(file) {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file.originalname, file.mimetype)}`;
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);
  return `/uploads/${encodeURIComponent(filename)}`;
}

async function uploadCloudinary(connection, file) {
  const { config = {}, secrets = {} } = connection;
  if (!config.cloudName || !secrets.apiKey || !secrets.apiSecret) throw new Error('Cloudinary integration is incomplete.');
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = config.folder || 'store-media';
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${secrets.apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'upload');
  form.append('api_key', secrets.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) throw new Error(data.error?.message || `Cloudinary upload failed (${response.status}).`);
  return data.secure_url;
}

export async function uploadMedia(file) {
  const [connection] = await getEnabledConnections('STORAGE');
  if (!connection) return { url: await uploadLocal(file), provider: 'LOCAL' };
  if (connection.provider === 'CLOUDINARY') return { url: await uploadCloudinary(connection, file), provider: 'CLOUDINARY' };
  if (connection.provider === 'S3') {
    const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file.originalname, file.mimetype)}`;
    return { url: await uploadS3(connection, { buffer: file.buffer, filename, mimeType: file.mimetype }), provider: 'S3' };
  }
  return { url: await uploadLocal(file), provider: 'LOCAL' };
}

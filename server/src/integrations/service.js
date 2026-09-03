import { prisma } from '../lib/prisma.js';
import { decryptSecrets, encryptSecrets } from './crypto.js';
import { findIntegrationSpec, integrationCatalog } from './catalog.js';
import { testConnection } from './testers.js';

const STORE_ID = 'default-store';

function normalizeRecord(record) {
  let secretKeys = [];
  if (record?.secretPayload) {
    try { secretKeys = Object.keys(decryptSecrets(record.secretPayload)); } catch { secretKeys = ['unavailable']; }
  }
  return {
    id: record?.id || null,
    category: record.category,
    provider: record.provider,
    label: record.label || null,
    isEnabled: Boolean(record.isEnabled),
    config: record.config || {},
    status: record.status || 'NOT_CONFIGURED',
    lastTestedAt: record.lastTestedAt || null,
    lastTestMessage: record.lastTestMessage || null,
    hasSecrets: Object.fromEntries(secretKeys.map((key) => [key, true]))
  };
}

export async function listConnections() {
  const rows = await prisma.integrationConnection.findMany({ where: { storeConfigId: STORE_ID }, orderBy: [{ category: 'asc' }, { provider: 'asc' }] });
  const byKey = new Map(rows.map((row) => [`${row.category}:${row.provider}`, row]));
  return integrationCatalog.map((spec) => ({ ...spec, ...normalizeRecord(byKey.get(`${spec.category}:${spec.provider}`) || { category: spec.category, provider: spec.provider }) }));
}

export async function getConnection(category, provider, { enabledOnly = false } = {}) {
  const row = await prisma.integrationConnection.findUnique({ where: { storeConfigId_category_provider: { storeConfigId: STORE_ID, category, provider } } });
  if (!row || (enabledOnly && !row.isEnabled)) return null;
  return { ...row, config: row.config || {}, secrets: row.secretPayload ? decryptSecrets(row.secretPayload) : {} };
}

export async function getEnabledConnections(category) {
  const rows = await prisma.integrationConnection.findMany({ where: { storeConfigId: STORE_ID, category, isEnabled: true }, orderBy: { updatedAt: 'desc' } });
  return rows.map((row) => ({ ...row, config: row.config || {}, secrets: row.secretPayload ? decryptSecrets(row.secretPayload) : {} }));
}

export async function saveConnection(category, provider, input) {
  const spec = findIntegrationSpec(category, provider);
  if (!spec) { const error = new Error('Unsupported integration provider.'); error.status = 404; throw error; }
  const existing = await prisma.integrationConnection.findUnique({ where: { storeConfigId_category_provider: { storeConfigId: STORE_ID, category, provider } } });
  const existingSecrets = existing?.secretPayload ? decryptSecrets(existing.secretPayload) : {};
  const incomingSecrets = Object.fromEntries(Object.entries(input.secrets || {}).filter(([, value]) => String(value ?? '').trim() !== ''));
  const mergedSecrets = { ...existingSecrets, ...incomingSecrets };
  const nextConfig = input.config || {};
  const configChanged = JSON.stringify(existing?.config || {}) !== JSON.stringify(nextConfig);
  const secretsChanged = Object.entries(incomingSecrets).some(([key, value]) => existingSecrets[key] !== value);
  const connectionChanged = !existing || configChanged || secretsChanged;
  const secretPayload = Object.keys(mergedSecrets).length ? encryptSecrets(mergedSecrets) : existing?.secretPayload || null;
  const requestedEnabled = Boolean(input.isEnabled);
  const status = connectionChanged ? 'NOT_CONFIGURED' : (existing?.status || 'NOT_CONFIGURED');
  const isEnabled = connectionChanged ? false : requestedEnabled && status === 'CONNECTED';
  const row = await prisma.integrationConnection.upsert({
    where: { storeConfigId_category_provider: { storeConfigId: STORE_ID, category, provider } },
    update: { label: input.label || spec.name, isEnabled, config: nextConfig, secretPayload, status, ...(connectionChanged ? { lastTestedAt: null, lastTestMessage: 'Configuration changed. Test the connection again before enabling it.' } : {}) },
    create: { storeConfigId: STORE_ID, category, provider, label: input.label || spec.name, isEnabled: false, config: nextConfig, secretPayload, status: 'NOT_CONFIGURED', lastTestMessage: 'Save complete. Test the connection before enabling it.' }
  });
  if (category === 'STORAGE' && row.isEnabled) {
    await prisma.integrationConnection.updateMany({ where: { storeConfigId: STORE_ID, category: 'STORAGE', id: { not: row.id } }, data: { isEnabled: false } });
  }
  if (category === 'SHIPPING' && row.isEnabled) {
    await prisma.integrationConnection.updateMany({ where: { storeConfigId: STORE_ID, category: 'SHIPPING', id: { not: row.id } }, data: { isEnabled: false } });
  }
  return normalizeRecord(row);
}

export async function removeConnection(category, provider) {
  await prisma.integrationConnection.deleteMany({ where: { storeConfigId: STORE_ID, category, provider } });
}

export async function testAndRecordConnection(category, provider) {
  const connection = await getConnection(category, provider);
  if (!connection) { const error = new Error('Save this integration before testing it.'); error.status = 404; throw error; }
  let result;
  try { result = await testConnection(connection); }
  catch (error) { result = { ok: false, message: error.message || 'Connection test failed.' }; }
  const row = await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: { status: result.ok ? 'CONNECTED' : 'ERROR', lastTestedAt: new Date(), lastTestMessage: String(result.message || '').slice(0, 500) }
  });
  return { ...normalizeRecord(row), test: result };
}

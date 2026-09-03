import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationCatalog, findIntegrationSpec } from '../src/integrations/catalog.js';
import { encryptSecrets, decryptSecrets } from '../src/integrations/crypto.js';

test('integration catalog exposes the merchant connection categories', () => {
  const categories = new Set(integrationCatalog.map((item) => item.category));
  for (const required of ['PAYMENT', 'STORAGE', 'EMAIL', 'SMS', 'WHATSAPP', 'SHIPPING', 'WEBHOOK']) {
    assert.equal(categories.has(required), true, `${required} integration category should exist`);
  }
  assert.ok(findIntegrationSpec('PAYMENT', 'STRIPE'));
  assert.ok(findIntegrationSpec('PAYMENT', 'RAZORPAY'));
  assert.ok(findIntegrationSpec('STORAGE', 'CLOUDINARY'));
  assert.ok(findIntegrationSpec('STORAGE', 'S3'));
  assert.ok(findIntegrationSpec('SHIPPING', 'SHIPROCKET'));
  assert.ok(findIntegrationSpec('SHIPPING', 'CUSTOM_API'));
});

test('merchant integration secrets encrypt and decrypt without exposing plaintext', () => {
  const previous = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = 'unit-test-encryption-key';
  try {
    const source = { apiKey: 'private-key', token: 'private-token' };
    const encrypted = encryptSecrets(source);
    assert.equal(typeof encrypted, 'string');
    assert.equal(encrypted.includes('private-key'), false);
    assert.equal(encrypted.includes('private-token'), false);
    assert.deepEqual(decryptSecrets(encrypted), source);
  } finally {
    if (previous === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
    else process.env.INTEGRATION_ENCRYPTION_KEY = previous;
  }
});

test('credential encryption refuses to run without a configured server key', () => {
  const previous = process.env.INTEGRATION_ENCRYPTION_KEY;
  delete process.env.INTEGRATION_ENCRYPTION_KEY;
  try {
    assert.throws(() => encryptSecrets({ token: 'x' }), /INTEGRATION_ENCRYPTION_KEY/);
  } finally {
    if (previous !== undefined) process.env.INTEGRATION_ENCRYPTION_KEY = previous;
  }
});

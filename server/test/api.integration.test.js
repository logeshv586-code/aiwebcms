import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'owner@example.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function auth(token, options = {}) {
  return { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } };
}

test('core ecommerce workflow works end to end', { timeout: 30_000 }, async () => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString(36);
  let createdProductId;
  let createdCategoryId;
  let createdBlogId;

  try {
    let result = await json(base, '/api/health');
    assert.equal(result.response.status, 200);
    assert.equal(result.data.ok, true);

    result = await json(base, '/api/storefront/config');
    assert.equal(result.response.status, 200);
    assert.ok(result.data.storeName);

    result = await json(base, '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password: adminPassword }) });
    assert.equal(result.response.status, 200);
    const token = result.data.token;
    assert.ok(token);

    result = await json(base, '/api/admin/dashboard', auth(token));
    assert.equal(result.response.status, 200);
    assert.equal(typeof result.data.products, 'number');

    result = await json(base, '/api/admin/integrations', auth(token));
    assert.equal(result.response.status, 200);
    assert.ok(result.data.some((item) => item.category === 'PAYMENT' && item.provider === 'STRIPE'));

    result = await json(base, '/api/admin/integrations/WEBHOOK/CUSTOM', auth(token, { method: 'PUT', body: JSON.stringify({ label: 'Automation webhook', isEnabled: false, config: { url: 'https://example.com/hooks', events: 'order.created' }, secrets: { signingSecret: 'integration-test-secret' } }) }));
    assert.equal(result.response.status, 200);
    assert.equal(result.data.hasSecrets.signingSecret, true);
    assert.equal(result.data.secretPayload, undefined);

    result = await json(base, '/api/admin/store-config', auth(token, { method: 'PUT', body: JSON.stringify({ storefrontText: { searchPlaceholder: 'Find anything', codLabel: 'Pay on delivery' } }) }));
    assert.equal(result.response.status, 200);
    assert.equal(result.data.storefrontText.searchPlaceholder, 'Find anything');

    result = await json(base, '/api/payments/methods');
    assert.equal(result.response.status, 200);
    assert.equal(result.data[0].provider, 'COD');
    assert.equal(result.data[0].label, 'Pay on delivery');

    result = await json(base, '/api/shipping/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderValue: 100, address: { postalCode: '600001', country: 'India' }, items: [] }) });
    assert.equal(result.response.status, 200);
    assert.equal(result.data.provider, 'FLAT_RATE');

    result = await json(base, '/api/admin/categories', auth(token, { method: 'POST', body: JSON.stringify({ name: `Test Category ${suffix}`, slug: `test-category-${suffix}`, isActive: true }) }));
    assert.equal(result.response.status, 201);
    createdCategoryId = result.data.id;

    result = await json(base, '/api/admin/products', auth(token, { method: 'POST', body: JSON.stringify({
      name: `Integration Product ${suffix}`,
      slug: `integration-product-${suffix}`,
      sku: `INT-${suffix}`.toUpperCase(),
      price: 1000,
      compareAtPrice: 1200,
      stock: 3,
      status: 'PUBLISHED',
      isFeatured: true,
      categoryId: createdCategoryId,
      imageUrls: [],
      variants: [],
      collectionIds: [],
      attributes: { Material: 'Test material' },
      specifications: { Size: 'Universal' },
      shippingInfo: { weightKg: 0.25 }
    }) }));
    assert.equal(result.response.status, 201);
    createdProductId = result.data.id;

    result = await json(base, `/api/storefront/products/integration-product-${suffix}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.stock, 3);
    assert.equal(result.data.attributes.Material, 'Test material');
    assert.equal(Number(result.data.shippingInfo.weightKg), 0.25);

    result = await json(base, '/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      items: [{ productId: createdProductId, quantity: 1 }],
      customer: { name: 'Integration Buyer', email: 'buyer@example.com', phone: '9999999999' },
      shippingAddress: { fullName: 'Integration Buyer', phone: '9999999999', line1: '1 Test Street', city: 'Chennai', state: 'Tamil Nadu', postalCode: '600001', country: 'India' },
      paymentMethod: 'COD'
    }) });
    assert.equal(result.response.status, 201);
    assert.equal(result.data.order.status, 'CONFIRMED');
    const orderNumber = result.data.order.orderNumber;

    result = await json(base, `/api/storefront/products/integration-product-${suffix}`);
    assert.equal(Number(result.data.stock), 2);

    result = await json(base, `/api/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent('wrong@example.com')}`);
    assert.equal(result.response.status, 404);
    result = await json(base, `/api/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent('buyer@example.com')}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.orderNumber, orderNumber);

    result = await json(base, '/api/storefront/forms/general-enquiry/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Integration', email: 'integration@example.com', message: 'Testing the dynamic form queue', ignoredField: 'must not persist' }) });
    assert.equal(result.response.status, 201);
    const storedSubmission = await prisma.formSubmission.findUnique({ where: { id: result.data.id } });
    assert.equal(storedSubmission.payload.ignoredField, undefined);

    result = await json(base, '/api/admin/blogs', auth(token, { method: 'POST', body: JSON.stringify({ title: `Integration Article ${suffix}`, slug: `integration-article-${suffix}`, excerpt: 'Integration article', content: { blocks: [{ type: 'paragraph', text: 'Test article body.' }] }, isPublished: true }) }));
    assert.equal(result.response.status, 201);
    createdBlogId = result.data.id;
    result = await json(base, `/api/storefront/blogs/integration-article-${suffix}`);
    assert.equal(result.response.status, 200);

    const form = new FormData();
    form.append('file', new Blob(['fake-png-content'], { type: 'image/png' }), 'integration.png');
    const uploadResponse = await fetch(`${base}/api/admin/media/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    assert.equal(uploadResponse.status, 201);
    const upload = await uploadResponse.json();
    assert.match(upload.url, /^\/uploads\//);
    const imageResponse = await fetch(`${base}${upload.url}`);
    assert.equal(imageResponse.status, 200);

    const sitemapResponse = await fetch(`${base}/api/storefront/sitemap.xml`);
    assert.equal(sitemapResponse.status, 200);
    const sitemap = await sitemapResponse.text();
    assert.match(sitemap, new RegExp(`integration-product-${suffix}`));
    assert.match(sitemap, new RegExp(`integration-article-${suffix}`));

    const robotsResponse = await fetch(`${base}/api/storefront/robots.txt`);
    assert.equal(robotsResponse.status, 200);
    assert.match(await robotsResponse.text(), /Sitemap:/);
  } finally {
    if (createdBlogId) await prisma.blogPost.deleteMany({ where: { id: createdBlogId } });
    if (createdProductId) await prisma.product.deleteMany({ where: { id: createdProductId } });
    if (createdCategoryId) await prisma.category.deleteMany({ where: { id: createdCategoryId } });
    server.close();
  }
});

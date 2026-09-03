import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug } from '../src/utils/slug.js';

test('slugify creates URL-friendly slugs', () => {
  assert.equal(slugify('Premium Running Shoes 2026!'), 'premium-running-shoes-2026');
  assert.equal(slugify('  Fresh & Organic  '), 'fresh-organic');
});

test('uniqueSlug adds a suffix when supplied', () => {
  assert.equal(uniqueSlug('New Product', 'abc'), 'new-product-abc');
});

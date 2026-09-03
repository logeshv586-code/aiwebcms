import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('app factory exposes an express application', () => {
  const app = createApp();
  assert.equal(typeof app.listen, 'function');
});

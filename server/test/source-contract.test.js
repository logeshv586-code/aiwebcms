import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.cwd(),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('storefront quality source contracts stay wired',()=>{
  const faq=read('client/src/pages/Faq.jsx'); const home=read('client/src/pages/Home.jsx'); const product=read('client/src/pages/Product.jsx'); const homepage=read('client/src/admin/pages/Homepage.jsx'); const schema=read('server/prisma/schema.prisma'); const workflow=read('.github/workflows/ci.yml');
  assert.match(faq,/FAQPage/); assert.match(faq,/breadcrumbSchema/); assert.match(home,/storeSchema/); assert.match(home,/content\.imageAlt/); assert.match(homepage,/Image alt text/);
  assert.match(product,/variant\?\.imageUrl/); assert.match(product,/compareAtPrice/); assert.match(product,/Recently viewed/); assert.match(product,/You may also like/); assert.match(product,/breadcrumbSchema/);
  assert.match(schema,/compareAtPrice\s+Decimal\?/); assert.match(schema,/imageUrl\s+String\?/); assert.match(schema,/altText\s+String\?/); assert.match(workflow,/postgres:16/); assert.match(workflow,/prisma validate/); assert.match(workflow,/npm run build/);
});

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, httpError } from '../utils/http.js';
import { dispatchCommerceEvent } from '../integrations/notifications.js';

const router = Router();

async function activeCategoryIdsForSlug(slug) {
  if (!slug) return null;
  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, parentId: true } });
  const root = categories.find((item) => item.slug === slug);
  if (!root) return [];
  const ids = new Set([root.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

router.get('/config', asyncRoute(async (req, res) => {
  const config = await prisma.storeConfig.findFirst({
    include: {
      menus: { include: { items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } } },
      sections: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }
    }
  });
  res.json(config);
}));

router.get('/categories', asyncRoute(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });
  res.json(categories);
}));

router.get('/collections', asyncRoute(async (req, res) => {
  res.json(await prisma.collection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }));
}));

router.get('/brands', asyncRoute(async (req, res) => {
  res.json(await prisma.brand.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }));
}));

router.get('/products', asyncRoute(async (req, res) => {
  const {
    category, collection, brand, search, featured, inStock, onSale, minRating,
    minPrice, maxPrice, sort = 'newest', page = '1', limit = '24'
  } = req.query;
  const take = Math.min(Math.max(Number(limit) || 24, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
  const orderBy = sort === 'price_asc' ? { price: 'asc' }
    : sort === 'price_desc' ? { price: 'desc' }
      : sort === 'name' ? { name: 'asc' }
        : { createdAt: 'desc' };
  const categoryIds = await activeCategoryIdsForSlug(category);

  const where = {
    status: 'PUBLISHED',
    ...(featured === 'true' ? { isFeatured: true } : {}),
    ...(category ? { categoryId: { in: categoryIds } } : {}),
    ...(brand ? { brand: { slug: brand } } : {}),
    ...(collection ? { collections: { some: { collection: { slug: collection } } } } : {}),
    ...(inStock === 'true' ? { OR: [{ stock: { gt: 0 } }, { variants: { some: { isActive: true, stock: { gt: 0 } } } }] } : {}),
    ...(onSale === 'true' ? { compareAtPrice: { not: null } } : {}),
    ...(minRating ? { reviews: { some: { isApproved: true, rating: { gte: Math.min(Math.max(Number(minRating) || 1, 1), 5) } } } } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { brand: { name: { contains: search, mode: 'insensitive' } } },
      { category: { name: { contains: search, mode: 'insensitive' } } }
    ] } : {}),
    ...((minPrice || maxPrice) ? { price: {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {})
    } } : {})
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, brand: true, variants: { where: { isActive: true } } }, orderBy, skip, take }),
    prisma.product.count({ where })
  ]);
  res.json({ items, total, page: Math.floor(skip / take) + 1, pages: Math.max(Math.ceil(total / take), 1) });
}));

router.get('/search-suggestions', asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const items = await prisma.product.findMany({
    where: { status: 'PUBLISHED', name: { contains: q, mode: 'insensitive' } },
    select: { id: true, name: true, slug: true, price: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
    take: 8,
    orderBy: { name: 'asc' }
  });
  res.json(items);
}));

router.get('/products/:slug', asyncRoute(async (req, res) => {
  const item = await prisma.product.findFirst({
    where: { slug: req.params.slug, status: 'PUBLISHED' },
    include: {
      images: { orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true } }, category: true, brand: true,
      collections: { include: { collection: true } },
      reviews: { where: { isApproved: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
    }
  });
  if (!item) throw httpError(404, 'Product not found.');
  res.json(item);
}));

router.get('/pages/:slug', asyncRoute(async (req, res) => {
  const page = await prisma.page.findFirst({ where: { slug: req.params.slug, isPublished: true } });
  if (!page) throw httpError(404, 'Page not found.');
  res.json(page);
}));

router.get('/blogs', asyncRoute(async (req, res) => {
  const take = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
  const items = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take
  });
  res.json(items);
}));

router.get('/blogs/:slug', asyncRoute(async (req, res) => {
  const item = await prisma.blogPost.findFirst({ where: { slug: req.params.slug, isPublished: true } });
  if (!item) throw httpError(404, 'Article not found.');
  res.json(item);
}));

router.get('/faqs', asyncRoute(async (req, res) => {
  res.json(await prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));
}));

router.get('/forms/:formKey', asyncRoute(async (req, res) => {
  const form = await prisma.dynamicForm.findFirst({ where: { key: req.params.formKey, isActive: true } });
  if (!form) throw httpError(404, 'Form not found.');
  res.json(form);
}));

router.post('/forms/:formKey/submissions', asyncRoute(async (req, res) => {
  const form = await prisma.dynamicForm.findFirst({ where: { key: req.params.formKey, isActive: true } });
  if (!form) throw httpError(404, 'This form is unavailable.');
  const fields = Array.isArray(form.fields) ? form.fields : [];
  const allowedKeys = new Set(fields.map((field) => field.key));
  const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowedKeys.has(key)));
  for (const field of fields) {
    const value = payload[field.key];
    if (field.required && (field.type === 'checkbox' ? value !== true : !String(value ?? '').trim())) throw httpError(400, `${field.label || field.key} is required.`);
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) throw httpError(400, `${field.label || 'Email'} is not valid.`);
    if (field.type === 'number' && value !== undefined && value !== '' && !Number.isFinite(Number(value))) throw httpError(400, `${field.label || field.key} must be a number.`);
    if (field.type === 'select' && value && Array.isArray(field.options) && field.options.length && !field.options.includes(value)) throw httpError(400, `${field.label || field.key} has an invalid option.`);
  }
  const submission = await prisma.formSubmission.create({ data: { formId: form.id, payload } });
  dispatchCommerceEvent('form.submitted', { form: { key: form.key, title: form.title }, submission: { id: submission.id, payload } }).catch(() => {});
  res.status(201).json({ id: submission.id, message: form.successText || 'Thank you. Your submission has been received.' });
}));

router.get('/sitemap.xml', asyncRoute(async (req, res) => {
  const base = String(process.env.PUBLIC_SITE_URL || 'http://localhost:4173').replace(/\/$/, '');
  const [products, categories, collections, brands, pages, blogs] = await Promise.all([
    prisma.product.findMany({ where: { status: 'PUBLISHED', noIndex: false }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true, noIndex: false }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { isActive: true, noIndex: false }, select: { slug: true, updatedAt: true } }),
    prisma.brand.findMany({ where: { isActive: true, noIndex: false }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { isPublished: true, noIndex: false }, select: { slug: true, updatedAt: true } }),
    prisma.blogPost.findMany({ where: { isPublished: true, noIndex: false }, select: { slug: true, updatedAt: true } })
  ]);
  const urls = [
    { loc: `${base}/`, date: new Date() },
    { loc: `${base}/shop`, date: new Date() },
    { loc: `${base}/faq`, date: new Date() },
    ...products.map((item) => ({ loc: `${base}/product/${encodeURIComponent(item.slug)}`, date: item.updatedAt })),
    ...categories.map((item) => ({ loc: `${base}/category/${encodeURIComponent(item.slug)}`, date: item.updatedAt })),
    ...collections.map((item) => ({ loc: `${base}/collection/${encodeURIComponent(item.slug)}`, date: item.updatedAt })),
    ...brands.map((item) => ({ loc: `${base}/brand/${encodeURIComponent(item.slug)}`, date: item.updatedAt })),
    ...pages.map((item) => ({ loc: `${base}/page/${encodeURIComponent(item.slug)}`, date: item.updatedAt })),
    ...blogs.map((item) => ({ loc: `${base}/blog/${encodeURIComponent(item.slug)}`, date: item.updatedAt }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${item.loc.replace(/&/g, '&amp;')}</loc><lastmod>${new Date(item.date).toISOString()}</lastmod></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
}));

router.get('/robots.txt', asyncRoute(async (req, res) => {
  const base = String(process.env.PUBLIC_SITE_URL || 'http://localhost:4173').replace(/\/$/, '');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${base}/sitemap.xml\n`);
}));

export default router;

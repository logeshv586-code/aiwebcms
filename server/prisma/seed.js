import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.SEED_ADMIN_EMAIL || 'owner@example.com';
  const ownerPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { role: 'OWNER', isActive: true },
    create: {
      name: 'Store Owner',
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      role: 'OWNER'
    }
  });

  const config = await prisma.storeConfig.upsert({
    where: { id: 'default-store' },
    update: {},
    create: {
      id: 'default-store',
      storeName: 'Your Store',
      tagline: 'A storefront configured entirely from your CMS.',
      currency: 'INR',
      locale: 'en-IN',
      supportEmail: 'support@example.com',
      theme: {
        modePolicy: 'BOTH', defaultMode: 'light', primary: '#176B5B', background: '#FAFAF7', surface: '#FFFFFF',
        ink: '#1C2320', muted: '#69736E', border: '#E7EAE5', soft: '#F1F3EF',
        darkBackground: '#090C0B', darkSurface: '#111513', darkInk: '#F4F7F5', darkMuted: '#9BA5A0', darkBorder: '#252C28', darkSoft: '#171C19',
        radius: 16, container: 1240, buttonRadius: 11, sectionSpacing: 58, headerHeight: 68, headerSticky: true, productImageRatio: '1 / 1', fontFamily: 'SYSTEM', motionEnabled: true, smoothScroll: true
      },
      announcement: { enabled: true, text: 'Welcome — update this announcement from Settings.', linkLabel: '', linkUrl: '' },
      seoDefaults: {
        title: 'Your Store', titleTemplate: '%s | Your Store',
        description: 'Discover products selected for your store.'
      },
      commerceSettings: { freeShippingThreshold: 999, shippingFee: 80, taxPercent: 0, codEnabled: true, defaultCountry: 'India' },
      storefrontText: { searchPlaceholder: 'Search products', accountLabel: 'Account', cartLabel: 'Cart', footerLinksHeading: 'Links', supportHeading: 'Support', trackOrderLabel: 'Track order', viewAllLabel: 'View all', addToCartLabel: 'Add to cart', chooseOptionsLabel: 'Choose options', browseProductsLabel: 'Browse products', checkoutLabel: 'Checkout', codLabel: 'Cash on Delivery' }
    }
  });

  const sampleCategory = await prisma.category.upsert({
    where: { slug: 'sample-category' }, update: {},
    create: { name: 'Sample Category', slug: 'sample-category', description: 'Replace or remove this sample category from the CMS.', sortOrder: 1 }
  });
  const sampleCollection = await prisma.collection.upsert({
    where: { slug: 'featured' }, update: {},
    create: { name: 'Featured', slug: 'featured', description: 'Use collections for any grouping you need.', sortOrder: 1 }
  });
  const sampleBrand = await prisma.brand.upsert({
    where: { slug: 'sample-brand' }, update: {},
    create: { name: 'Sample Brand', slug: 'sample-brand', description: 'Optional brand information.', sortOrder: 1 }
  });

  const product = await prisma.product.upsert({
    where: { slug: 'sample-product' },
    update: {},
    create: {
      name: 'Sample Product', slug: 'sample-product', sku: 'SAMPLE-001',
      shortDescription: 'A neutral demo product. Replace it with your own catalog item.',
      description: 'This starter content is intentionally generic so the same project can become any type of store.',
      price: 1499, compareAtPrice: 1799, stock: 25, status: 'PUBLISHED', isFeatured: true,
      categoryId: sampleCategory.id, brandId: sampleBrand.id,
      metaTitle: 'Sample Product', metaDescription: 'A sample product used to verify the storefront workflow.',
      images: { create: [{ url: 'https://placehold.co/1000x1000/F1F3EF/39423E?text=Your+Product', altText: 'Sample product', sortOrder: 0 }] }
    }
  });
  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: sampleCollection.id, productId: product.id } },
    update: {}, create: { collectionId: sampleCollection.id, productId: product.id, sortOrder: 1 }
  });

  const sections = [
    { key: 'hero', type: 'HERO', title: 'Build the store around your business.', subtitle: 'Change every word, section, product and category from the CMS — no code edits.', content: { eyebrow: 'Your storefront', ctaLabel: 'Browse catalog', ctaUrl: '/shop' }, sortOrder: 1 },
    { key: 'categories', type: 'CATEGORY_GRID', title: 'Browse categories', subtitle: 'Categories are created by the store owner.', content: { limit: 8 }, sortOrder: 2 },
    { key: 'featured', type: 'PRODUCT_GRID', title: 'Featured products', subtitle: 'Choose which products appear here from the CMS.', content: { featured: true, limit: 8 }, sortOrder: 3 },
    { key: 'trust', type: 'TRUST', title: 'Why customers choose us', subtitle: 'Edit these service promises to match your business.', content: { items: [{ title: 'Secure checkout', text: 'Protected customer and order flows.' }, { title: 'Clear delivery', text: 'Set your own shipping rules.' }, { title: 'Helpful support', text: 'Publish your support details from Settings.' }] }, sortOrder: 4 },
    { key: 'blog', type: 'BLOG_GRID', title: 'Stories & guides', subtitle: 'Publish useful content from the CMS.', content: { limit: 3 }, sortOrder: 5 }
  ];
  for (const section of sections) {
    await prisma.homeSection.upsert({
      where: { storeConfigId_key: { storeConfigId: config.id, key: section.key } },
      update: {}, create: { storeConfigId: config.id, ...section }
    });
  }

  const header = await prisma.menu.upsert({
    where: { storeConfigId_key: { storeConfigId: config.id, key: 'header' } },
    update: {}, create: { storeConfigId: config.id, key: 'header', title: 'Main navigation' }
  });
  if ((await prisma.menuItem.count({ where: { menuId: header.id } })) === 0) {
    await prisma.menuItem.createMany({ data: [
      { menuId: header.id, label: 'Home', target: '/', sortOrder: 1 },
      { menuId: header.id, label: 'Catalog', target: '/shop', sortOrder: 2 },
      { menuId: header.id, label: 'FAQ', target: '/faq', sortOrder: 3 },
      { menuId: header.id, label: 'Blog', target: '/blog', sortOrder: 4 },
      { menuId: header.id, label: 'Contact', target: '/form/general-enquiry', sortOrder: 5 }
    ] });
  }

  const footer = await prisma.menu.upsert({
    where: { storeConfigId_key: { storeConfigId: config.id, key: 'footer' } },
    update: {}, create: { storeConfigId: config.id, key: 'footer', title: 'Footer links' }
  });
  if ((await prisma.menuItem.count({ where: { menuId: footer.id } })) === 0) {
    await prisma.menuItem.createMany({ data: [
      { menuId: footer.id, label: 'About', target: '/page/about', sortOrder: 1 },
      { menuId: footer.id, label: 'Shipping', target: '/page/shipping-policy', sortOrder: 2 },
      { menuId: footer.id, label: 'Returns', target: '/page/return-policy', sortOrder: 3 },
      { menuId: footer.id, label: 'Privacy', target: '/page/privacy-policy', sortOrder: 4 },
      { menuId: footer.id, label: 'Terms', target: '/page/terms', sortOrder: 5 },
      { menuId: footer.id, label: 'FAQ', target: '/faq', sortOrder: 6 }
    ] });
  }

  const pages = [
    ['About', 'about', 'Tell customers about your business from the CMS.'],
    ['Shipping Policy', 'shipping-policy', 'Add your shipping terms here.'],
    ['Return Policy', 'return-policy', 'Add your return and refund rules here.'],
    ['Privacy Policy', 'privacy-policy', 'Add your privacy policy here.'],
    ['Terms', 'terms', 'Add your terms and conditions here.']
  ];
  for (const [title, slug, text] of pages) {
    await prisma.page.upsert({ where: { slug }, update: {}, create: { title, slug, excerpt: text, content: { blocks: [{ type: 'paragraph', text }] }, metaTitle: title } });
  }

  await prisma.blogPost.upsert({
    where: { slug: 'welcome-to-your-store' }, update: {},
    create: {
      title: 'Welcome to your store', slug: 'welcome-to-your-store',
      excerpt: 'Use the blog for buying guides, announcements, product education or stories.',
      content: { blocks: [{ type: 'paragraph', text: 'This sample article is intentionally generic. Replace it with content that helps your customers and improves organic search visibility.' }] },
      metaTitle: 'Welcome to your store', metaDescription: 'A sample article that verifies the CMS blog workflow.',
      isPublished: true, publishedAt: new Date()
    }
  });

  await prisma.faq.upsert({
    where: { id: 'seed-faq' }, update: {},
    create: { id: 'seed-faq', question: 'Can I edit this question?', answer: 'Yes. FAQs are managed from the CMS and can be changed, reordered, enabled or removed.', sortOrder: 1 }
  });

  const forms = [
    {
      key: 'general-enquiry', title: 'General Enquiry', description: 'A generic contact form that can be renamed and edited.',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'tel', required: false },
        { key: 'message', label: 'Message', type: 'textarea', required: true }
      ]
    },
    {
      key: 'seller-application', title: 'Seller Application', description: 'Rename this form or create your own workflow.',
      fields: [
        { key: 'businessName', label: 'Business name', type: 'text', required: true },
        { key: 'contactName', label: 'Contact name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'tel', required: true },
        { key: 'details', label: 'Tell us about your requirement', type: 'textarea', required: false }
      ]
    }
  ];
  for (const form of forms) await prisma.dynamicForm.upsert({ where: { key: form.key }, update: {}, create: form });

  await prisma.coupon.upsert({ where: { code: 'WELCOME10' }, update: {}, create: { code: 'WELCOME10', description: '10% off demo coupon', type: 'PERCENT', value: 10, maxDiscount: 500, isActive: true } });

  console.log(`Seed complete. Admin: ${ownerEmail} / ${ownerPassword}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

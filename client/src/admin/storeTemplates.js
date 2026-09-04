export const DEFAULT_LAYOUT = {
  width: 'BOXED',
  paddingY: 58,
  radius: 20,
  desktopHeight: 0,
  mobileHeight: 0,
  imageFit: 'cover',
  textAlign: 'left',
  columns: 4,
  mobileColumns: 2,
  gap: 15,
  background: '',
  textColor: ''
};

export const SECTION_TYPES = [
  ['HERO', 'Hero banner'],
  ['HERO_SLIDER', 'Hero slider'],
  ['OFFER_SLIDER', 'Small offer slider'],
  ['MARQUEE', 'Scrolling announcement'],
  ['CATEGORY_GRID', 'Category grid'],
  ['PRODUCT_GRID', 'Product grid'],
  ['PRODUCT_CAROUSEL', 'Product slider'],
  ['COLLECTION_GRID', 'Collection grid'],
  ['BRAND_GRID', 'Brand grid'],
  ['PROMO_GRID', 'Offer / promo cards'],
  ['IMAGE_TEXT', 'Image + text'],
  ['BLOG_GRID', 'Blog articles'],
  ['BANNER', 'Promotional banner'],
  ['TEXT', 'Text section'],
  ['TRUST', 'Trust / service cards'],
  ['FAQ', 'FAQ section']
];

const layout = (overrides = {}) => ({ ...DEFAULT_LAYOUT, ...overrides });
const section = (type, title, subtitle, content = {}) => ({ type, title, subtitle, isActive: true, content });

export const STORE_TEMPLATES = [
  {
    id: 'luxe-editorial',
    name: 'Luxe Editorial',
    category: 'Fashion · Beauty · Premium',
    description: 'Large editorial imagery, refined typography and generous spacing for high-end brands.',
    preview: ['#f8f6f1', '#181818', '#9c7b58'],
    theme: {
      templateId: 'luxe-editorial', primary: '#181818', primaryDark: '#000000', background: '#f8f6f1', surface: '#ffffff', ink: '#171717', muted: '#6e6a65', border: '#e7e1d8', soft: '#f0ece5',
      darkBackground: '#0a0a0a', darkSurface: '#121212', darkInk: '#f8f6f1', darkMuted: '#aaa39a', darkBorder: '#2b2926', darkSoft: '#191816',
      fontFamily: 'CLASSIC', productImageRatio: '4 / 5', radius: 4, buttonRadius: 2, container: 1360, sectionSpacing: 76, headerHeight: 76, headerSticky: true, motionEnabled: true, smoothScroll: true
    },
    sections: [
      section('HERO_SLIDER', 'A new point of view', 'Editorial collections built for a premium first impression.', {
        interval: 5200,
        slides: [
          { title: 'A new point of view', text: 'Discover the latest collection with an editorial storefront experience.', ctaLabel: 'Shop new arrivals', ctaUrl: '/shop', imageUrl: '' },
          { title: 'Quiet luxury, considered', text: 'Curated products presented with space, confidence and timeless typography.', ctaLabel: 'Explore collection', ctaUrl: '/shop', imageUrl: '' }
        ],
        layout: layout({ width: 'FULL', paddingY: 0, radius: 0, desktopHeight: 650, mobileHeight: 520 })
      }),
      section('OFFER_SLIDER', 'Private client benefits', '', { items: [{ title: 'Complimentary shipping', text: 'On selected orders', link: '/shop' }, { title: 'New season', text: 'Fresh arrivals now available', link: '/shop' }, { title: 'Secure checkout', text: 'Protected payment experience', link: '/checkout' }], layout: layout({ paddingY: 18, radius: 0 }) }),
      section('CATEGORY_GRID', 'Shop the edit', 'A visual path into your most important categories.', { limit: 4, layout: layout({ columns: 4, mobileColumns: 2, gap: 22 }) }),
      section('PRODUCT_GRID', 'New arrivals', 'The latest products, styled with a spacious premium grid.', { source: 'LATEST', limit: 8, layout: layout({ columns: 4, gap: 24 }) }),
      section('IMAGE_TEXT', 'Designed with intention', 'Use this story block for brand values, craftsmanship or a seasonal campaign.', { ctaLabel: 'Our story', ctaUrl: '/shop', imageUrl: '', imagePosition: 'left', layout: layout({ paddingY: 72, radius: 0 }) }),
      section('PRODUCT_CAROUSEL', 'Curated for you', 'A horizontal product rail that keeps browsing fluid.', { source: 'FEATURED', limit: 10, layout: layout({ width: 'FULL', paddingY: 64, gap: 20 }) }),
      section('TRUST', 'The service standard', '', { items: [{ title: 'Thoughtful delivery', text: 'A polished delivery experience from checkout to doorstep.' }, { title: 'Secure payments', text: 'Trusted checkout options and protected transactions.' }, { title: 'Personal support', text: 'Clear support information whenever customers need help.' }], layout: layout({ columns: 3, mobileColumns: 1 }) })
    ]
  },
  {
    id: 'marketplace-pro',
    name: 'Marketplace Pro',
    category: 'Electronics · General store · Deals',
    description: 'High-conversion marketplace layout with deal rails, categories, promos and dense product discovery.',
    preview: ['#f5f7fb', '#1457d9', '#ffb020'],
    theme: {
      templateId: 'marketplace-pro', primary: '#1457d9', primaryDark: '#0f43aa', background: '#f5f7fb', surface: '#ffffff', ink: '#172033', muted: '#697386', border: '#e0e6ef', soft: '#edf2f8',
      darkBackground: '#0d1320', darkSurface: '#151d2c', darkInk: '#f5f7fb', darkMuted: '#9aa8bc', darkBorder: '#29364b', darkSoft: '#1b2638',
      fontFamily: 'MODERN', productImageRatio: '1 / 1', radius: 16, buttonRadius: 10, container: 1420, sectionSpacing: 48, headerHeight: 72, headerSticky: true, motionEnabled: true, smoothScroll: true
    },
    sections: [
      section('OFFER_SLIDER', 'Today’s advantages', '', { items: [{ title: 'Limited-time deals', text: 'Highlight your strongest offer', link: '/shop' }, { title: 'Fast-moving products', text: 'Push best sellers and new launches', link: '/shop' }, { title: 'Easy checkout', text: 'Help customers buy with confidence', link: '/checkout' }], layout: layout({ width: 'FULL', paddingY: 14, radius: 0 }) }),
      section('HERO_SLIDER', 'Deals built to be discovered', 'A bold promotional hero for campaigns and major category pushes.', { interval: 4200, slides: [{ title: 'Deals built to be discovered', text: 'Use strong campaign imagery and clear calls to action.', ctaLabel: 'Shop deals', ctaUrl: '/shop', imageUrl: '' }, { title: 'Everything in one store', text: 'Categories, offers and new arrivals stay one swipe away.', ctaLabel: 'Browse catalog', ctaUrl: '/shop', imageUrl: '' }], layout: layout({ width: 'FULL', desktopHeight: 520, mobileHeight: 450, radius: 0, paddingY: 18 }) }),
      section('CATEGORY_GRID', 'Browse top categories', 'Make product discovery fast for large catalogs.', { limit: 8, layout: layout({ columns: 6, mobileColumns: 2, gap: 14 }) }),
      section('PRODUCT_CAROUSEL', 'Top deals', 'Keep high-intent products visible in a quick horizontal rail.', { source: 'FEATURED', limit: 12, layout: layout({ width: 'FULL', paddingY: 44, gap: 14 }) }),
      section('PROMO_GRID', 'More ways to save', '', { items: [{ title: 'Weekend offer', text: 'Use this card for a campaign or collection.', imageUrl: '', link: '/shop' }, { title: 'Bundle and save', text: 'Promote product groups or category offers.', imageUrl: '', link: '/shop' }, { title: 'New launches', text: 'Spotlight a new range without code.', imageUrl: '', link: '/shop' }], layout: layout({ columns: 3, mobileColumns: 1, gap: 16 }) }),
      section('PRODUCT_GRID', 'Recommended products', 'A conversion-focused grid for ongoing discovery.', { source: 'LATEST', limit: 12, layout: layout({ columns: 5, mobileColumns: 2, gap: 14 }) }),
      section('TRUST', 'Shop with confidence', '', { items: [{ title: 'Secure checkout', text: 'Clear payment options and protected transactions.' }, { title: 'Order visibility', text: 'Keep customers informed through the order journey.' }, { title: 'Helpful support', text: 'Make contact and support details easy to find.' }], layout: layout({ columns: 3, mobileColumns: 1 }) })
    ]
  },
  {
    id: 'minimal-studio',
    name: 'Minimal Studio',
    category: 'Lifestyle · Home · D2C',
    description: 'Calm, modern and product-first with clean lines, generous whitespace and subtle motion.',
    preview: ['#ffffff', '#111111', '#d8d8d8'],
    theme: {
      templateId: 'minimal-studio', primary: '#111111', primaryDark: '#000000', background: '#ffffff', surface: '#ffffff', ink: '#111111', muted: '#707070', border: '#e8e8e8', soft: '#f6f6f4',
      darkBackground: '#0a0a0a', darkSurface: '#111111', darkInk: '#ffffff', darkMuted: '#a8a8a8', darkBorder: '#282828', darkSoft: '#171717',
      fontFamily: 'SYSTEM', productImageRatio: '4 / 5', radius: 0, buttonRadius: 0, container: 1280, sectionSpacing: 88, headerHeight: 70, headerSticky: true, motionEnabled: true, smoothScroll: true
    },
    sections: [
      section('HERO', 'Simple products. Strong point of view.', 'Lead with one focused campaign and let the product imagery do the work.', { ctaLabel: 'Explore products', ctaUrl: '/shop', imageUrl: '', layout: layout({ width: 'FULL', radius: 0, desktopHeight: 610, mobileHeight: 500, paddingY: 0 }) }),
      section('MARQUEE', '', '', { items: ['New arrivals', 'Designed for everyday use', 'Simple checkout', 'Thoughtful support'], speed: 34, layout: layout({ width: 'FULL', paddingY: 14, radius: 0 }) }),
      section('PRODUCT_GRID', 'The essentials', 'A clean product grid with no visual noise.', { source: 'FEATURED', limit: 8, layout: layout({ columns: 4, gap: 28 }) }),
      section('IMAGE_TEXT', 'Made to fit real life', 'Use this section for product philosophy, materials, process or brand story.', { imageUrl: '', imagePosition: 'right', ctaLabel: 'Discover more', ctaUrl: '/shop', layout: layout({ paddingY: 88, radius: 0 }) }),
      section('CATEGORY_GRID', 'Explore by category', '', { limit: 4, layout: layout({ columns: 4, gap: 28, radius: 0 }) }),
      section('PRODUCT_CAROUSEL', 'Recently added', '', { source: 'LATEST', limit: 10, layout: layout({ width: 'FULL', paddingY: 72, gap: 22 }) }),
      section('FAQ', 'Good to know', 'Answer common customer questions before they become support requests.', { limit: 5, layout: layout({ width: 'NARROW', paddingY: 74 }) })
    ]
  },
  {
    id: 'fresh-organic',
    name: 'Fresh Organic',
    category: 'Food · Wellness · Natural products',
    description: 'Warm, friendly and colorful with rounded cards, soft surfaces and story-led merchandising.',
    preview: ['#fbf8ef', '#2f6f4e', '#d89a44'],
    theme: {
      templateId: 'fresh-organic', primary: '#2f6f4e', primaryDark: '#24563d', background: '#fbf8ef', surface: '#ffffff', ink: '#25352b', muted: '#6c786f', border: '#e5dfcf', soft: '#f2eddf',
      darkBackground: '#111914', darkSurface: '#18231c', darkInk: '#f8f3e8', darkMuted: '#aab7ae', darkBorder: '#304039', darkSoft: '#202d25',
      fontFamily: 'ROUNDED', productImageRatio: '1 / 1', radius: 24, buttonRadius: 999, container: 1260, sectionSpacing: 64, headerHeight: 72, headerSticky: true, motionEnabled: true, smoothScroll: true
    },
    sections: [
      section('HERO_SLIDER', 'Fresh choices, beautifully presented', 'A welcoming storefront for food, wellness and natural product brands.', { interval: 4800, slides: [{ title: 'Fresh choices, beautifully presented', text: 'Use bright product photography and simple benefit-led copy.', ctaLabel: 'Shop fresh picks', ctaUrl: '/shop', imageUrl: '' }, { title: 'Made for everyday wellbeing', text: 'Tell customers what makes your products worth choosing.', ctaLabel: 'Explore the range', ctaUrl: '/shop', imageUrl: '' }], layout: layout({ width: 'BOXED', desktopHeight: 560, mobileHeight: 500, radius: 28, paddingY: 26 }) }),
      section('CATEGORY_GRID', 'Shop by need', 'Friendly visual categories help customers quickly find the right product.', { limit: 6, layout: layout({ columns: 3, mobileColumns: 2, gap: 18 }) }),
      section('PROMO_GRID', 'Small offers, big reasons to return', '', { items: [{ title: 'Seasonal picks', text: 'Feature limited or seasonal products here.', imageUrl: '', link: '/shop' }, { title: 'Everyday favourites', text: 'Keep your dependable best sellers visible.', imageUrl: '', link: '/shop' }], layout: layout({ columns: 2, mobileColumns: 1, gap: 18 }) }),
      section('PRODUCT_CAROUSEL', 'Customer favourites', '', { source: 'FEATURED', limit: 10, layout: layout({ width: 'FULL', paddingY: 54, gap: 18 }) }),
      section('IMAGE_TEXT', 'Good products deserve a clear story', 'Share sourcing, ingredients, materials, values or your founder story without touching code.', { imageUrl: '', imagePosition: 'left', ctaLabel: 'Learn more', ctaUrl: '/shop', layout: layout({ paddingY: 70, radius: 28 }) }),
      section('PRODUCT_GRID', 'Just added', '', { source: 'LATEST', limit: 8, layout: layout({ columns: 4, gap: 18 }) }),
      section('TRUST', 'Simple from cart to doorstep', '', { items: [{ title: 'Clear product details', text: 'Help shoppers understand what they are buying.' }, { title: 'Flexible payments', text: 'Use the payment options enabled for your store.' }, { title: 'Human support', text: 'Keep your support details easy to reach.' }], layout: layout({ columns: 3, mobileColumns: 1 }) })
    ]
  },
  {
    id: 'tech-motion',
    name: 'Tech Motion',
    category: 'Tech · Gadgets · Modern brands',
    description: 'Sharper contrast, strong media, animated rails and a modern product-launch feel.',
    preview: ['#0b0f18', '#5d6bff', '#eef1ff'],
    theme: {
      templateId: 'tech-motion', primary: '#5d6bff', primaryDark: '#4653d8', background: '#f5f7ff', surface: '#ffffff', ink: '#111827', muted: '#687085', border: '#e1e5f0', soft: '#edf0fa',
      darkBackground: '#090d15', darkSurface: '#111827', darkInk: '#f6f8ff', darkMuted: '#9da7bd', darkBorder: '#273249', darkSoft: '#182136',
      fontFamily: 'MODERN', productImageRatio: '16 / 11', radius: 18, buttonRadius: 12, container: 1380, sectionSpacing: 60, headerHeight: 74, headerSticky: true, motionEnabled: true, smoothScroll: true
    },
    sections: [
      section('HERO_SLIDER', 'Launch products like they matter', 'Large media, strong contrast and fast product discovery for modern technology brands.', { interval: 4500, slides: [{ title: 'Launch products like they matter', text: 'Turn your first screen into a focused launch moment.', ctaLabel: 'Explore technology', ctaUrl: '/shop', imageUrl: '' }, { title: 'Powerful products. Clear choices.', text: 'Use category and product rails to keep complex catalogs easy to browse.', ctaLabel: 'Browse products', ctaUrl: '/shop', imageUrl: '' }], layout: layout({ width: 'FULL', desktopHeight: 600, mobileHeight: 500, radius: 0, paddingY: 0 }) }),
      section('MARQUEE', '', '', { items: ['Latest technology', 'New product launches', 'Fast discovery', 'Secure checkout'], speed: 28, layout: layout({ width: 'FULL', paddingY: 15, radius: 0 }) }),
      section('PRODUCT_CAROUSEL', 'Trending now', 'A motion-friendly horizontal product rail for high-interest items.', { source: 'FEATURED', limit: 12, layout: layout({ width: 'FULL', paddingY: 52, gap: 18 }) }),
      section('CATEGORY_GRID', 'Explore the ecosystem', '', { limit: 8, layout: layout({ columns: 4, mobileColumns: 2, gap: 16 }) }),
      section('PROMO_GRID', 'Built for launches and campaigns', '', { items: [{ title: 'New release', text: 'Feature your latest flagship product.', imageUrl: '', link: '/shop' }, { title: 'Upgrade your setup', text: 'Group accessories or related categories.', imageUrl: '', link: '/shop' }, { title: 'Performance picks', text: 'Highlight products around a specific use case.', imageUrl: '', link: '/shop' }], layout: layout({ columns: 3, mobileColumns: 1, gap: 16 }) }),
      section('PRODUCT_GRID', 'Latest products', '', { source: 'LATEST', limit: 10, layout: layout({ columns: 5, mobileColumns: 2, gap: 16 }) }),
      section('TRUST', 'A storefront customers can trust', '', { items: [{ title: 'Detailed product information', text: 'Organize specs, variants and images clearly.' }, { title: 'Order tracking', text: 'Give customers visibility after purchase.' }, { title: 'Connected integrations', text: 'Use the integrations configured by your store team.' }], layout: layout({ columns: 3, mobileColumns: 1 }) })
    ]
  }
];

export function getTemplate(id) {
  return STORE_TEMPLATES.find((template) => template.id === id) || STORE_TEMPLATES[0];
}

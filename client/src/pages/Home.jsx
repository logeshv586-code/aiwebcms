import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Headphones, Truck } from 'lucide-react';
import { get } from '../services/api';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { storeSchema, useSeo } from '../utils/seo';

const trustIcons = [BadgeCheck, Truck, Headphones];
const defaultLayout = { width: 'BOXED', paddingY: 58, radius: 20, desktopHeight: 0, mobileHeight: 0, imageFit: 'cover', textAlign: 'left', columns: 4, mobileColumns: 2, gap: 15, background: '', textColor: '' };

function sectionProps(section) {
  const l = { ...defaultLayout, ...(section.content?.layout || {}) };
  return {
    l,
    style: {
      '--dyn-pad': `${Math.max(0, Number(l.paddingY) || 0)}px`,
      '--dyn-radius': `${Math.max(0, Number(l.radius) || 0)}px`,
      '--dyn-height': `${Math.max(0, Number(l.desktopHeight) || 0)}px`,
      '--dyn-mobile-height': `${Math.max(0, Number(l.mobileHeight) || 0)}px`,
      '--dyn-fit': l.imageFit || 'cover',
      '--dyn-cols': Math.max(1, Number(l.columns) || 4),
      '--dyn-mobile-cols': Math.max(1, Math.min(2, Number(l.mobileColumns) || 2)),
      '--dyn-gap': `${Math.max(0, Number(l.gap) || 0)}px`,
      '--dyn-bg': l.background || undefined,
      '--dyn-text': l.textColor || undefined,
      textAlign: l.textAlign || 'left'
    }
  };
}

function Wrapper({ section, children, className = '' }) {
  const { l, style } = sectionProps(section);
  const inner = l.width === 'FULL' ? children : <div className={`container ${l.width === 'NARROW' ? 'narrow' : ''}`}>{children}</div>;
  return <section className={`dynamic-home-section ${className}`} style={style}>{inner}</section>;
}

export default function Home() {
  const { config, categories } = useOutletContext();
  const [faqs, setFaqs] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([get('/storefront/faqs'), get('/storefront/blogs?limit=24'), get('/storefront/collections'), get('/storefront/brands')])
      .then(([f, b, c, br]) => { setFaqs(f || []); setBlogs(b || []); setCollections(c || []); setBrands(br || []); })
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => config?.sections || [], [config]);
  useSeo({ title: config?.seoDefaults?.title || config?.storeName, description: config?.seoDefaults?.description, image: config?.seoDefaults?.image, schema: config ? storeSchema(config) : undefined });
  if (!config && loading) return <main><Loading label="Preparing storefront…"/></main>;

  function renderSection(section) {
    const content = section.content || {};

    if (section.type === 'HERO') return <Wrapper section={section} className="dynamic-hero" key={section.id}><div className="hero-panel dynamic-panel">
      <div className="hero-copy"><span className="eyebrow">{content.eyebrow || ''}</span><h1>{section.title}</h1><p>{section.subtitle}</p>{content.ctaUrl && <Link className="button primary" to={content.ctaUrl}>{content.ctaLabel || 'Explore'} <ArrowRight size={17}/></Link>}</div>
      <div className="hero-visual">{content.imageUrl ? <img src={content.imageUrl} alt={content.imageAlt || section.title || config?.storeName || ''}/> : <div className="hero-shape"><span>{config?.storeName?.slice(0, 2).toUpperCase() || 'CMS'}</span><small>{config?.tagline || ''}</small></div>}</div>
    </div></Wrapper>;

    if (section.type === 'HERO_SLIDER') return <HeroSliderSection key={section.id} section={section}/>;
    if (section.type === 'OFFER_SLIDER') return <OfferSliderSection key={section.id} section={section}/>;
    if (section.type === 'MARQUEE') return <MarqueeSection key={section.id} section={section}/>;

    if (section.type === 'CATEGORY_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section} link="/shop"/><div className="dynamic-grid">{categories.filter((category) => !category.parentId).slice(0, Number(content.limit || 8)).map((category) => <Link className="category-card" key={category.id} to={`/category/${category.slug}`}><div className="category-image">{category.imageUrl ? <img src={category.imageUrl} alt={category.name}/> : <span>{category.name.slice(0, 1).toUpperCase()}</span>}</div><div><strong>{category.name}</strong><small>{category.description || ''}</small></div><ArrowRight size={18}/></Link>)}</div></Wrapper>;

    if (section.type === 'PRODUCT_GRID') return <ProductGridSection key={section.id} section={section}/>;
    if (section.type === 'PRODUCT_CAROUSEL') return <ProductCarouselSection key={section.id} section={section}/>;

    if (section.type === 'COLLECTION_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="dynamic-grid">{collections.slice(0, Number(content.limit || 8)).map((item) => <Link className="collection-card" to={`/collection/${encodeURIComponent(item.slug)}`} key={item.id}>{item.imageUrl && <img src={item.imageUrl} alt={item.name}/>}<strong>{item.name}</strong><small>{item.description || ''}</small></Link>)}</div></Wrapper>;

    if (section.type === 'BRAND_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="dynamic-grid">{brands.slice(0, Number(content.limit || 8)).map((item) => <Link className="collection-card" to={`/brand/${encodeURIComponent(item.slug)}`} key={item.id}>{item.logoUrl && <img src={item.logoUrl} alt={`${item.name} logo`}/>}<strong>{item.name}</strong><small>{item.description || ''}</small></Link>)}</div></Wrapper>;

    if (section.type === 'PROMO_GRID') return <PromoGridSection key={section.id} section={section}/>;
    if (section.type === 'IMAGE_TEXT') return <ImageTextSection key={section.id} section={section}/>;

    if (section.type === 'BLOG_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section} link="/blog"/>{blogs.length ? <div className="dynamic-grid">{blogs.slice(0, Number(content.limit || 3)).map((item) => <article className="blog-card" key={item.id}>{item.coverImageUrl && <Link className="blog-image" to={`/blog/${item.slug}`}><img src={item.coverImageUrl} alt={item.title}/></Link>}<div><small>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}</small><Link to={`/blog/${item.slug}`}><h2>{item.title}</h2></Link><p>{item.excerpt || ''}</p></div></article>)}</div> : <div className="soft-panel">No published articles yet.</div>}</Wrapper>;

    if (section.type === 'TRUST') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="dynamic-grid">{(content.items || []).map((item, index) => { const Icon = trustIcons[index % trustIcons.length]; return <div className="trust-card" key={`${item.title}-${index}`}><div className="trust-icon"><Icon size={22}/></div><strong>{item.title}</strong><p>{item.text}</p></div>; })}</div></Wrapper>;

    if (section.type === 'FAQ') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="faq-list">{faqs.slice(0, Number(content.limit || 6)).map((f) => <details key={f.id}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div></Wrapper>;

    if (section.type === 'BANNER' || section.type === 'TEXT') return <Wrapper section={section} key={section.id}><div className={`content-banner dynamic-panel ${section.type === 'BANNER' ? 'has-image' : ''}`}>{content.imageUrl && <img className="banner-image" src={content.imageUrl} alt={content.imageAlt || section.title || ''}/>}<div className="banner-copy"><span className="eyebrow">{content.eyebrow || ''}</span><h2>{section.title}</h2><p>{section.subtitle}</p>{content.ctaUrl && <Link className="text-link" to={content.ctaUrl}>{content.ctaLabel || 'Learn more'} <ArrowRight size={16}/></Link>}</div></div></Wrapper>;

    return null;
  }

  return <main className="store-home">{sections.filter((section) => section.isActive !== false).map(renderSection)}</main>;
}

function HeroSliderSection({ section }) {
  const content = section.content || {};
  const { config } = useOutletContext();
  const slides = content.slides?.length ? content.slides : [{ title: section.title, text: section.subtitle, ctaLabel: content.ctaLabel, ctaUrl: content.ctaUrl, imageUrl: content.imageUrl }];
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), Math.max(2500, Number(content.interval) || 4800));
    return () => window.clearInterval(timer);
  }, [section.id, slides.length, content.interval]);

  function go(direction) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  return <Wrapper section={section} className="hero-slider-section">
    <div className="commerce-hero-slider dynamic-panel">
      {slides.map((slide, index) => <article className={`commerce-hero-slide ${index === active ? 'active' : ''}`} key={`${slide.title}-${index}`} aria-hidden={index !== active}>
        <div className="commerce-hero-media">{slide.imageUrl ? <img src={slide.imageUrl} alt={slide.imageAlt || slide.title || config?.storeName || ''}/> : <div className="hero-slider-placeholder"><span>{config?.storeName || 'Your Store'}</span></div>}</div>
        <div className="commerce-hero-copy"><h1>{slide.title || section.title}</h1><p>{slide.text || section.subtitle}</p>{slide.ctaUrl && <Link className="button primary" to={slide.ctaUrl}>{slide.ctaLabel || 'Shop now'} <ArrowRight size={17}/></Link>}</div>
      </article>)}
      {slides.length > 1 && <>
        <button className="hero-slider-arrow prev" onClick={() => go(-1)} aria-label="Previous slide"><ArrowLeft/></button>
        <button className="hero-slider-arrow next" onClick={() => go(1)} aria-label="Next slide"><ArrowRight/></button>
        <div className="hero-slider-dots">{slides.map((_, index) => <button key={index} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Go to slide ${index + 1}`}/>)}</div>
      </>}
    </div>
  </Wrapper>;
}

function OfferSliderSection({ section }) {
  const items = section.content?.items || [];
  return <Wrapper section={section} className="offer-slider-section">
    <div className="offer-slider-track">
      {items.map((item, index) => item.link ? <Link className="offer-slide-card" to={item.link} key={`${item.title}-${index}`}><strong>{item.title}</strong><span>{item.text}</span><ArrowRight size={16}/></Link> : <div className="offer-slide-card" key={`${item.title}-${index}`}><strong>{item.title}</strong><span>{item.text}</span></div>)}
    </div>
  </Wrapper>;
}

function MarqueeSection({ section }) {
  const items = (section.content?.items || []).filter(Boolean);
  if (!items.length) return null;
  const repeated = [...items, ...items];
  return <Wrapper section={section} className="marquee-section">
    <div className="commerce-marquee" style={{ '--marquee-duration': `${Math.max(12, Number(section.content?.speed) || 32)}s` }}>
      <div className="commerce-marquee-track">{repeated.map((item, index) => <span key={`${item}-${index}`}>{item}<i>•</i></span>)}</div>
    </div>
  </Wrapper>;
}

function PromoGridSection({ section }) {
  const content = section.content || {};
  return <Wrapper section={section}>
    <SectionHead section={section}/>
    <div className="dynamic-grid promo-grid">
      {(content.items || []).map((item, index) => <Link to={item.link || '/shop'} className={`promo-card ${item.imageUrl ? 'has-image' : ''}`} key={`${item.title}-${index}`}>
        {item.imageUrl && <img src={item.imageUrl} alt={item.title || ''}/>}<div className="promo-card-copy"><strong>{item.title}</strong><p>{item.text}</p><span>Explore <ArrowRight size={16}/></span></div>
      </Link>)}
    </div>
  </Wrapper>;
}

function ImageTextSection({ section }) {
  const content = section.content || {};
  const imageRight = content.imagePosition === 'right';
  return <Wrapper section={section} className="image-text-section">
    <div className={`image-text-panel dynamic-panel ${imageRight ? 'image-right' : ''}`}>
      <div className="image-text-media">{content.imageUrl ? <img src={content.imageUrl} alt={content.imageAlt || section.title || ''}/> : <div className="image-text-placeholder"/>}</div>
      <div className="image-text-copy"><span className="eyebrow">{content.eyebrow || ''}</span><h2>{section.title}</h2><p>{section.subtitle}</p>{content.ctaUrl && <Link className="button primary" to={content.ctaUrl}>{content.ctaLabel || 'Learn more'} <ArrowRight size={16}/></Link>}</div>
    </div>
  </Wrapper>;
}

function productParams(content) {
  const params = new URLSearchParams({ limit: String(content.limit || 8) });
  const source = content.source || 'FEATURED';
  if (source === 'FEATURED') params.set('featured', 'true');
  if (source === 'CATEGORY' && content.sourceValue) params.set('category', content.sourceValue);
  if (source === 'COLLECTION' && content.sourceValue) params.set('collection', content.sourceValue);
  if (source === 'BRAND' && content.sourceValue) params.set('brand', content.sourceValue);
  return params;
}

function useProducts(section) {
  const content = section.content || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    get(`/storefront/products?${productParams(content)}`).then((data) => setProducts(data.items || [])).finally(() => setLoading(false));
  }, [section.id, content.source, content.sourceValue, content.limit]);
  return { products, loading };
}

function ProductGridSection({ section }) {
  const { products, loading } = useProducts(section);
  return <Wrapper section={section}><SectionHead section={section} link="/shop"/>{loading ? <Loading label="Loading products…"/> : products.length ? <div className="dynamic-grid">{products.map((product) => <ProductCard product={product} key={product.id}/>)}</div> : <div className="soft-panel">No matching published products yet.</div>}</Wrapper>;
}

function ProductCarouselSection({ section }) {
  const { products, loading } = useProducts(section);
  return <Wrapper section={section} className="product-carousel-section"><SectionHead section={section} link="/shop"/>{loading ? <Loading label="Loading products…"/> : products.length ? <div className="product-rail">{products.map((product) => <div className="product-rail-item" key={product.id}><ProductCard product={product}/></div>)}</div> : <div className="soft-panel">No matching published products yet.</div>}</Wrapper>;
}

function SectionHead({ section, link }) {
  const { config } = useOutletContext();
  return <div className="section-head"><div><h2>{section.title}</h2>{section.subtitle && <p>{section.subtitle}</p>}</div>{link && <Link className="text-link" to={link}>{config?.storefrontText?.viewAllLabel || 'View all'} <ArrowRight size={16}/></Link>}</div>;
}

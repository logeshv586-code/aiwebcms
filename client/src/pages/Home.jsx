import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Headphones, Truck } from 'lucide-react';
import { get } from '../services/api';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { storeSchema, useSeo } from '../utils/seo';

const trustIcons = [BadgeCheck, Truck, Headphones];
const defaultLayout={width:'BOXED',paddingY:58,radius:20,desktopHeight:0,mobileHeight:0,imageFit:'cover',textAlign:'left',columns:4,mobileColumns:2,gap:15,background:'',textColor:''};

function sectionProps(section){
  const l={...defaultLayout,...(section.content?.layout||{})};
  return {l,style:{'--dyn-pad':`${Math.max(0,Number(l.paddingY)||0)}px`,'--dyn-radius':`${Math.max(0,Number(l.radius)||0)}px`,'--dyn-height':`${Math.max(0,Number(l.desktopHeight)||0)}px`,'--dyn-mobile-height':`${Math.max(0,Number(l.mobileHeight)||0)}px`,'--dyn-fit':l.imageFit||'cover','--dyn-cols':Math.max(1,Number(l.columns)||4),'--dyn-mobile-cols':Math.max(1,Math.min(2,Number(l.mobileColumns)||2)),'--dyn-gap':`${Math.max(0,Number(l.gap)||0)}px`,'--dyn-bg':l.background||undefined,'--dyn-text':l.textColor||undefined,textAlign:l.textAlign||'left'}};
}
function Wrapper({section,children,className=''}){const{l,style}=sectionProps(section);const inner=l.width==='FULL'?children:<div className={`container ${l.width==='NARROW'?'narrow':''}`}>{children}</div>;return <section className={`dynamic-home-section ${className}`} style={style}>{inner}</section>}

export default function Home() {
  const { config, categories } = useOutletContext();
  const [faqs, setFaqs] = useState([]); const [blogs, setBlogs] = useState([]);const[collections,setCollections]=useState([]);const[brands,setBrands]=useState([]);const [loading, setLoading] = useState(true);
  useEffect(() => {Promise.all([get('/storefront/faqs'), get('/storefront/blogs?limit=24'),get('/storefront/collections'),get('/storefront/brands')]).then(([f,b,c,br])=>{setFaqs(f||[]);setBlogs(b||[]);setCollections(c||[]);setBrands(br||[]);}).finally(()=>setLoading(false));}, []);
  const sections = useMemo(() => config?.sections || [], [config]);
  useSeo({ title: config?.seoDefaults?.title || config?.storeName, description: config?.seoDefaults?.description, image: config?.seoDefaults?.image, schema: config ? storeSchema(config) : undefined });
  if (!config && loading) return <main><Loading label="Preparing storefront…"/></main>;
  function renderSection(section) {
    const content = section.content || {};const {l}=sectionProps(section);
    if (section.type === 'HERO') return <Wrapper section={section} className="dynamic-hero" key={section.id}><div className="hero-panel dynamic-panel">
      <div className="hero-copy"><span className="eyebrow">{content.eyebrow || ''}</span><h1>{section.title}</h1><p>{section.subtitle}</p>{content.ctaUrl && <Link className="button primary" to={content.ctaUrl}>{content.ctaLabel || 'Explore'} <ArrowRight size={17}/></Link>}</div>
      <div className="hero-visual">{content.imageUrl ? <img src={content.imageUrl} alt={content.imageAlt || section.title || config?.storeName || ""}/> : <div className="hero-shape"><span>{config?.storeName?.slice(0,2).toUpperCase() || 'CMS'}</span><small>{config?.tagline || ''}</small></div>}</div>
    </div></Wrapper>;
    if (section.type === 'CATEGORY_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section} link="/shop"/><div className="dynamic-grid">{categories.filter((category)=>!category.parentId).slice(0, Number(content.limit || 8)).map((category)=><Link className="category-card" key={category.id} to={`/category/${category.slug}`}><div className="category-image">{category.imageUrl?<img src={category.imageUrl} alt={category.name}/>:<span>{category.name.slice(0,1).toUpperCase()}</span>}</div><div><strong>{category.name}</strong><small>{category.description||''}</small></div><ArrowRight size={18}/></Link>)}</div></Wrapper>;
    if (section.type === 'PRODUCT_GRID') return <ProductGridSection key={section.id} section={section}/>;
    if (section.type === 'COLLECTION_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="dynamic-grid">{collections.slice(0,Number(content.limit||8)).map((item)=><Link className="collection-card" to={`/collection/${encodeURIComponent(item.slug)}`} key={item.id}>{item.imageUrl&&<img src={item.imageUrl} alt={item.name}/>}<strong>{item.name}</strong><small>{item.description||''}</small></Link>)}</div></Wrapper>;
    if (section.type === 'BRAND_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="dynamic-grid">{brands.slice(0,Number(content.limit||8)).map((item)=><Link className="collection-card" to={`/brand/${encodeURIComponent(item.slug)}`} key={item.id}>{item.logoUrl&&<img src={item.logoUrl} alt={`${item.name} logo`}/>}<strong>{item.name}</strong><small>{item.description||''}</small></Link>)}</div></Wrapper>;
    if (section.type === 'BLOG_GRID') return <Wrapper section={section} key={section.id}><SectionHead section={section} link="/blog"/>{blogs.length?<div className="dynamic-grid">{blogs.slice(0,Number(content.limit||3)).map((item)=><article className="blog-card" key={item.id}>{item.coverImageUrl&&<Link className="blog-image" to={`/blog/${item.slug}`}><img src={item.coverImageUrl} alt={item.title}/></Link>}<div><small>{item.publishedAt?new Date(item.publishedAt).toLocaleDateString():''}</small><Link to={`/blog/${item.slug}`}><h2>{item.title}</h2></Link><p>{item.excerpt||''}</p></div></article>)}</div>:<div className="soft-panel">No published articles yet.</div>}</Wrapper>;
    if (section.type === 'TRUST') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="dynamic-grid">{(content.items||[]).map((item,index)=>{const Icon=trustIcons[index%trustIcons.length];return <div className="trust-card" key={`${item.title}-${index}`}><div className="trust-icon"><Icon size={22}/></div><strong>{item.title}</strong><p>{item.text}</p></div>})}</div></Wrapper>;
    if (section.type === 'FAQ') return <Wrapper section={section} key={section.id}><SectionHead section={section}/><div className="faq-list">{faqs.slice(0,Number(content.limit||6)).map((f)=><details key={f.id}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div></Wrapper>;
    if (section.type === 'BANNER' || section.type === 'TEXT') return <Wrapper section={section} key={section.id}><div className={`content-banner dynamic-panel ${section.type==='BANNER'?'has-image':''}`}>{content.imageUrl&&<img className="banner-image" src={content.imageUrl} alt={content.imageAlt || section.title || ""}/>}<div className="banner-copy"><span className="eyebrow">{content.eyebrow||''}</span><h2>{section.title}</h2><p>{section.subtitle}</p>{content.ctaUrl&&<Link className="text-link" to={content.ctaUrl}>{content.ctaLabel||'Learn more'} <ArrowRight size={16}/></Link>}</div></div></Wrapper>;
    return null;
  }
  return <main>{sections.filter((s)=>s.isActive!==false).map(renderSection)}</main>;
}

function ProductGridSection({section}){
  const content=section.content||{};const[products,setProducts]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{const params=new URLSearchParams({limit:String(content.limit||8)});const source=content.source||'FEATURED';if(source==='FEATURED')params.set('featured','true');if(source==='CATEGORY'&&content.sourceValue)params.set('category',content.sourceValue);if(source==='COLLECTION'&&content.sourceValue)params.set('collection',content.sourceValue);if(source==='BRAND'&&content.sourceValue)params.set('brand',content.sourceValue);get(`/storefront/products?${params}`).then((data)=>setProducts(data.items||[])).finally(()=>setLoading(false));},[section.id,content.source,content.sourceValue,content.limit]);
  return <Wrapper section={section}><SectionHead section={section} link="/shop"/>{loading?<Loading label="Loading products…"/>:products.length?<div className="dynamic-grid">{products.map((p)=><ProductCard product={p} key={p.id}/>)}</div>:<div className="soft-panel">No matching published products yet.</div>}</Wrapper>;
}
function SectionHead({ section, link }) {const { config }=useOutletContext();return <div className="section-head"><div><h2>{section.title}</h2>{section.subtitle && <p>{section.subtitle}</p>}</div>{link && <Link className="text-link" to={link}>{config?.storefrontText?.viewAllLabel || 'View all'} <ArrowRight size={16}/></Link>}</div>}

import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { get } from '../services/api';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { useSeo } from '../utils/seo';

export default function Shop() {
  const { categories, config } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [lookups, setLookups] = useState({ collections: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const query = params.toString();
  const text = config?.storefrontText || {};
  useSeo({ title: `Products | ${config?.storeName || 'Store'}`, description: config?.seoDefaults?.shopDescription || 'Browse the product catalog.' });

  useEffect(() => { Promise.all([get('/storefront/collections'), get('/storefront/brands')]).then(([collections, brands]) => setLookups({ collections, brands })).catch(() => {}); }, []);
  useEffect(() => { setLoading(true); get(`/storefront/products?${query}`).then(setData).catch(() => setData({ items: [], total: 0, page: 1, pages: 1 })).finally(() => setLoading(false)); }, [query]);

  function set(key, value) {
    const next = new URLSearchParams(params);
    if (value !== '' && value !== false && value != null) next.set(key, String(value)); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const filters = <div className="filters">
    <div className="filter-head"><strong>Filters</strong><button className="text-button" onClick={() => setParams({})}>Clear</button></div>
    <label>Search<div className="input-with-icon"><Search size={16}/><input value={params.get('search') || ''} onChange={(e) => set('search', e.target.value)} placeholder="Search catalog"/></div></label>
    <label>Category<select value={params.get('category') || ''} onChange={(e) => set('category', e.target.value)}><option value="">All categories</option>{categories.map((c) => <option value={c.slug} key={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>)}</select></label>
    {lookups.collections.length > 0 && <label>Collection<select value={params.get('collection') || ''} onChange={(e) => set('collection', e.target.value)}><option value="">All collections</option>{lookups.collections.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label>}
    {lookups.brands.length > 0 && <label>Brand<select value={params.get('brand') || ''} onChange={(e) => set('brand', e.target.value)}><option value="">All brands</option>{lookups.brands.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label>}
    <div className="price-pair"><label>Min price<input type="number" min="0" value={params.get('minPrice') || ''} onChange={(e) => set('minPrice', e.target.value)}/></label><label>Max price<input type="number" min="0" value={params.get('maxPrice') || ''} onChange={(e) => set('maxPrice', e.target.value)}/></label></div>
    <label>Minimum rating<select value={params.get('minRating') || ''} onChange={(e) => set('minRating', e.target.value)}><option value="">Any rating</option><option value="4">4★ & up</option><option value="3">3★ & up</option><option value="2">2★ & up</option></select></label>
    <label className="check-card compact"><input type="checkbox" checked={params.get('inStock') === 'true'} onChange={(e) => set('inStock', e.target.checked ? 'true' : '')}/><span><strong>In stock only</strong></span></label>
    <label className="check-card compact"><input type="checkbox" checked={params.get('onSale') === 'true'} onChange={(e) => set('onSale', e.target.checked ? 'true' : '')}/><span><strong>On sale</strong></span></label>
  </div>;

  const page = Number(data.page || 1); const pages = Number(data.pages || 1);
  return <main className="section"><div className="container">
    <div className="shop-toolbar"><div><span className="eyebrow">Catalog</span><h1>{text.shopTitle || 'Products'}</h1><p>{data.total} item{data.total === 1 ? '' : 's'}</p></div><div className="toolbar-actions"><button className="button secondary mobile-filter" onClick={() => setMobileFilters(!mobileFilters)}><SlidersHorizontal size={17}/> Filters</button><select value={params.get('sort') || 'newest'} onChange={(e) => set('sort', e.target.value)}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name">Name</option></select></div></div>
    <div className="shop-layout"><aside className={mobileFilters ? 'filter-mobile-open' : ''}>{filters}</aside><div>{loading ? <Loading/> : data.items.length ? <><div className="product-grid three">{data.items.map((p) => <ProductCard key={p.id} product={p}/>)}</div>{pages > 1 && <nav className="pagination" aria-label="Catalog pages"><button className="button secondary small" disabled={page <= 1} onClick={() => set('page', page - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="button secondary small" disabled={page >= pages} onClick={() => set('page', page + 1)}>Next</button></nav>}</> : <EmptyState title="No products found" text="Try changing the filters, or add/publish products from the CMS."/>}</div></div>
  </div></main>;
}

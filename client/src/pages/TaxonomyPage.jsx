import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../services/api';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { useSeo } from '../utils/seo';

export default function TaxonomyPage({ type }) {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, item: null, products: [] });
  useEffect(() => {
    setState({ loading: true, item: null, products: [] });
    const plural = type === 'brand' ? 'brands' : 'collections';
    Promise.all([get(`/storefront/${plural}`), get(`/storefront/products?${type}=${encodeURIComponent(slug)}&limit=48`)]).then(([items, data]) => {
      setState({ loading: false, item: (items || []).find((entry) => entry.slug === slug) || null, products: data.items || [] });
    }).catch(() => setState({ loading: false, item: null, products: [] }));
  }, [slug, type]);
  useSeo({ title: state.item?.metaTitle || state.item?.name, description: state.item?.metaDescription || state.item?.description, noIndex: state.item?.noIndex });
  if (state.loading) return <Loading/>;
  return <main className="section"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/shop">Catalog</Link><span>/</span><b>{state.item?.name || slug}</b></div><div className="page-title"><span className="eyebrow">{type === 'brand' ? 'Brand' : 'Collection'}</span><h1>{state.item?.name || slug}</h1>{state.item?.description&&<p>{state.item.description}</p>}</div>{state.products.length?<div className="product-grid">{state.products.map((product)=><ProductCard key={product.id} product={product}/>)}</div>:<EmptyState title={`No published products in this ${type} yet`}/>}</div></main>;
}

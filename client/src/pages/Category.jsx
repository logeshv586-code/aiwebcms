import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { get } from '../services/api';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { useSeo } from '../utils/seo';

export default function Category(){
 const{slug}=useParams();const{categories}=useOutletContext();const[data,setData]=useState(null);const category=useMemo(()=>categories.find((item)=>item.slug===slug),[categories,slug]);
 useEffect(()=>{setData(null);get(`/storefront/products?category=${encodeURIComponent(slug)}&limit=48`).then(setData).catch(()=>setData({items:[],total:0}));},[slug]);
 useSeo({title:category?.metaTitle||category?.name,description:category?.metaDescription||category?.description,noIndex:category?.noIndex});if(!data)return <Loading/>;
 return <main className="section"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/shop">Catalog</Link><span>/</span><b>{category?.name||slug}</b></div><div className="page-title"><span className="eyebrow">Category</span><h1>{category?.name||slug}</h1>{category?.description&&<p>{category.description}</p>}</div>{data.items.length?<div className="product-grid">{data.items.map((product)=><ProductCard key={product.id} product={product}/>)}</div>:<EmptyState title="No products in this category yet"/>}</div></main>;
}

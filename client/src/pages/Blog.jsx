import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { useSeo } from '../utils/seo';

export default function Blog(){
 const[items,setItems]=useState(null);useEffect(()=>{get('/storefront/blogs?limit=50').then(setItems).catch(()=>setItems([]));},[]);useSeo({title:'Blog'});if(!items)return <Loading/>;
 return <main className="section"><div className="container"><div className="page-title"><span className="eyebrow">Stories & guides</span><h1>Blog</h1></div>{items.length?<div className="blog-grid">{items.map((item)=><article className="blog-card" key={item.id}>{item.coverImageUrl&&<Link to={`/blog/${item.slug}`} className="blog-image"><img src={item.coverImageUrl} alt=""/></Link>}<div><small>{item.publishedAt?new Date(item.publishedAt).toLocaleDateString():''}</small><Link to={`/blog/${item.slug}`}><h2>{item.title}</h2></Link><p>{item.excerpt||''}</p><Link className="text-link" to={`/blog/${item.slug}`}>Read article →</Link></div></article>)}</div>:<EmptyState title="No articles yet" text="Publish articles from the CMS when you are ready."/>}</div></main>;
}

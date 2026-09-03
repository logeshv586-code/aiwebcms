import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../services/api';
import Loading from '../components/Loading';
import { useSeo } from '../utils/seo';

export default function BlogPost(){
 const{slug}=useParams();const[item,setItem]=useState(null);const[error,setError]=useState('');useEffect(()=>{get(`/storefront/blogs/${slug}`).then(setItem).catch((e)=>setError(e.message));},[slug]);useSeo({title:item?.metaTitle||item?.title,description:item?.metaDescription||item?.excerpt,image:item?.ogImageUrl||item?.coverImageUrl,noIndex:item?.noIndex,schema:item?{'@context':'https://schema.org','@type':'Article',headline:item.title,description:item.excerpt||'',image:item.coverImageUrl||undefined,datePublished:item.publishedAt||item.createdAt,dateModified:item.updatedAt}:undefined});if(error)return <main className="section"><div className="container narrow"><div className="alert error">{error}</div></div></main>;if(!item)return <Loading/>;const blocks=Array.isArray(item.content?.blocks)?item.content.blocks:[];
 return <main className="section"><article className="container article narrow"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/blog">Blog</Link><span>/</span><b>{item.title}</b></div><div className="page-title"><span className="eyebrow">{item.publishedAt?new Date(item.publishedAt).toLocaleDateString():'Article'}</span><h1>{item.title}</h1>{item.excerpt&&<p>{item.excerpt}</p>}</div>{item.coverImageUrl&&<img className="article-cover" src={item.coverImageUrl} alt=""/>}<div className="article-body">{blocks.map((block,index)=>block.type==='heading'?<h2 key={index}>{block.text}</h2>:<p key={index}>{block.text}</p>)}</div></article></main>;
}

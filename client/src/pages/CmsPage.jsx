import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { get } from '../services/api';
import Loading from '../components/Loading';
import { useSeo } from '../utils/seo';

const defaultLayout={width:'NORMAL',align:'left',background:'',textColor:'',paddingY:18,radius:16};

export default function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { get(`/storefront/pages/${slug}`).then(setPage).catch((e) => setError(e.message)); }, [slug]);
  useSeo({ title: page?.metaTitle || page?.title, description: page?.metaDescription || page?.excerpt, image: page?.ogImageUrl, noIndex: page?.noIndex });
  if (error) return <main className="section"><div className="container narrow"><div className="alert error">{error}</div></div></main>;
  if (!page) return <Loading/>;
  const blocks = page.content?.blocks || [];
  return <main className="cms-page">
    <header className="cms-page-head section">
      <div className="container narrow"><span className="eyebrow">Information</span><h1>{page.title}</h1>{page.excerpt && <p className="lead">{page.excerpt}</p>}</div>
    </header>
    <article className="cms-blocks">{blocks.map((block, index) => <PageBlock block={block} key={`${block.type || 'block'}-${index}`}/>)}</article>
  </main>;
}

function PageBlock({block}){
  const layout={...defaultLayout,...(block.layout||{})};
  const style={
    '--page-block-bg':layout.background||undefined,
    '--page-block-text':layout.textColor||undefined,
    '--page-block-pad':`${Math.max(0,Number(layout.paddingY)||0)}px`,
    '--page-block-radius':`${Math.max(0,Number(layout.radius)||0)}px`,
    textAlign:layout.align||'left'
  };
  const width=layout.width==='FULL'?'full':layout.width==='WIDE'?'wide':'normal';
  if(block.type==='divider')return <div className="cms-page-block normal cms-divider-block"><div className="container narrow"><hr/></div></div>;
  return <section className={`cms-page-block ${width} cms-block-${block.type||'paragraph'}`} style={style}><div className={width==='full'?'cms-block-inner':`container ${width==='normal'?'narrow':''}`}>
    {renderBlock(block)}
  </div></section>;
}

function renderBlock(block){
  if(block.type==='heading')return block.level==='h3'?<h3 className="cms-block-heading">{block.text}</h3>:<h2 className="cms-block-heading">{block.text}</h2>;
  if(block.type==='paragraph')return <p className="cms-block-paragraph">{block.text}</p>;
  if(block.type==='list')return <ul className="cms-block-list">{(block.items||[]).filter(Boolean).map((item,index)=><li key={index}>{item}</li>)}</ul>;
  if(block.type==='image')return <figure className="cms-image-block">{block.imageUrl?<img src={block.imageUrl} alt={block.alt||block.caption||''}/>:<div className="cms-image-placeholder"/>}{block.caption&&<figcaption>{block.caption}</figcaption>}</figure>;
  if(block.type==='image_text')return <div className={`cms-image-text ${block.imagePosition==='right'?'image-right':''}`}><div className="cms-image-text-media">{block.imageUrl?<img src={block.imageUrl} alt={block.title||''}/>:<div className="cms-image-placeholder"/>}</div><div className="cms-image-text-copy"><h2>{block.title}</h2><p>{block.text}</p>{block.ctaLabel&&block.ctaUrl&&<SmartLink className="button primary" to={block.ctaUrl}>{block.ctaLabel}<ArrowRight size={16}/></SmartLink>}</div></div>;
  if(block.type==='banner')return <div className={`cms-banner tone-${block.tone||'accent'} ${block.imageUrl?'has-image':''}`} style={block.imageUrl?{backgroundImage:`linear-gradient(rgba(0,0,0,.38),rgba(0,0,0,.38)),url(${block.imageUrl})`}:undefined}><div><h2>{block.title}</h2><p>{block.text}</p>{block.ctaLabel&&block.ctaUrl&&<SmartLink className="button secondary" to={block.ctaUrl}>{block.ctaLabel}<ArrowRight size={16}/></SmartLink>}</div></div>;
  if(block.type==='button')return block.label&&block.url?<div className="cms-button-block"><SmartLink className={`button ${block.style==='secondary'?'secondary':'primary'}`} to={block.url}>{block.label}<ArrowRight size={16}/></SmartLink></div>:null;
  return block.text?<p className="cms-block-paragraph">{block.text}</p>:null;
}

function SmartLink({to,className,children}){
  if(/^https?:\/\//i.test(to||''))return <a className={className} href={to} target="_blank" rel="noreferrer">{children}</a>;
  return <Link className={className} to={to||'/'}>{children}</Link>;
}

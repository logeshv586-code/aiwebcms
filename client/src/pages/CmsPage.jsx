import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../services/api';
import Loading from '../components/Loading';
import { useSeo } from '../utils/seo';

export default function CmsPage() {
  const { slug } = useParams(); const [page, setPage] = useState(null); const [error, setError] = useState('');
  useEffect(() => { get(`/storefront/pages/${slug}`).then(setPage).catch((e) => setError(e.message)); }, [slug]);
  useSeo({ title: page?.metaTitle || page?.title, description: page?.metaDescription || page?.excerpt, image: page?.ogImageUrl, noIndex: page?.noIndex });
  if (error) return <main className="section"><div className="container narrow"><div className="alert error">{error}</div></div></main>;
  if (!page) return <Loading/>;
  const blocks = page.content?.blocks || [];
  return <main className="section"><article className="container article"><span className="eyebrow">Information</span><h1>{page.title}</h1>{page.excerpt && <p className="lead">{page.excerpt}</p>}{blocks.map((block, i) => block.type === 'heading' ? <h2 key={i}>{block.text}</h2> : block.type === 'list' ? <ul key={i}>{(block.items || []).map((item, x) => <li key={x}>{item}</li>)}</ul> : <p key={i}>{block.text}</p>)}</article></main>;
}

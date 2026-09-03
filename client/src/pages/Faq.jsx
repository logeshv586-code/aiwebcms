import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { get } from '../services/api';
import Loading from '../components/Loading';
import { breadcrumbSchema, useSeo } from '../utils/seo';

export default function Faq() {
  const { config } = useOutletContext();
  const [items, setItems] = useState(null);
  useEffect(() => { get('/storefront/faqs').then(setItems); }, []);
  const schema = useMemo(() => items ? { '@context': 'https://schema.org', '@graph': [
    breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }]),
    { '@type': 'FAQPage', mainEntity: items.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }
  ] } : undefined, [items]);
  useSeo({ title: `FAQ | ${config?.storeName || 'Store'}`, description: 'Frequently asked questions about shopping, orders, delivery and support.', schema });
  if (!items) return <Loading/>;
  return <main className="section"><div className="container narrow"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><b>FAQ</b></div><div className="page-title"><span className="eyebrow">Help</span><h1>Frequently asked questions</h1><p>These questions are managed from the CMS.</p></div><div className="faq-list">{items.map((item) => <details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></main>;
}

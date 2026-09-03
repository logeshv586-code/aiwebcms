import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../services/api';
import DynamicFormView from '../components/DynamicFormView';
import Loading from '../components/Loading';

export default function DynamicFormPage() {
  const { key } = useParams(); const [form, setForm] = useState(null); const [error, setError] = useState('');
  useEffect(() => { get(`/storefront/forms/${key}`).then(setForm).catch((e) => setError(e.message)); }, [key]);
  if (error) return <main className="section"><div className="container narrow"><div className="alert error">{error}</div></div></main>;
  if (!form) return <Loading/>;
  return <main className="section"><div className="container narrow"><div className="page-title"><span className="eyebrow">Get in touch</span><h1>{form.title}</h1></div><DynamicFormView form={form}/></div></main>;
}

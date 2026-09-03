import { useEffect, useState } from 'react';
import { Check, ChevronRight, Circle, PackagePlus, Settings2, Store, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { get } from '../../services/api';
import Loading from '../../components/Loading';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import { formatMoney } from '../../utils/money';

export default function Dashboard() {
  const [stats, setStats] = useState(null); const [config, setConfig] = useState(null); const [categories, setCategories] = useState([]);
  useEffect(() => { Promise.all([get('/admin/dashboard'), get('/admin/store-config'), get('/admin/categories')]).then(([s,c,cat]) => { setStats(s); setConfig(c); setCategories(cat); }); }, []);
  if (!stats) return <Loading label="Loading dashboard…"/>;
  const setup = [
    { label: 'Add your store name and brand', done: config?.storeName && config.storeName !== 'Your Store', to: '/admin/settings', icon: Store },
    { label: 'Create your categories', done: categories.some((c) => c.slug !== 'sample-category'), to: '/admin/catalog', icon: Tags },
    { label: 'Add and publish products', done: stats.products > 1, to: '/admin/products', icon: PackagePlus },
    { label: 'Arrange your homepage', done: true, to: '/admin/homepage', icon: Settings2 }
  ];
  return <>
    <AdminPageHead title="Good to see you." description="Everything you need to launch and operate the storefront is here. No code changes are required."/>
    <div className="metric-grid"><Metric label="Revenue" value={formatMoney(stats.revenue,config)}/><Metric label="Orders" value={stats.orders}/><Metric label="Products" value={stats.products}/><Metric label="Customers" value={stats.customers}/></div>
    <div className="admin-two-col">
      <section className="admin-panel"><div className="panel-head"><div><span className="eyebrow">Launch guide</span><h2>Set up your store</h2></div><span className="setup-count">{setup.filter((x) => x.done).length}/{setup.length}</span></div><div className="setup-list">{setup.map((item) => { const Icon = item.icon; return <Link to={item.to} key={item.label}><div className={item.done ? 'setup-check done' : 'setup-check'}>{item.done ? <Check size={15}/> : <Circle size={15}/>}</div><Icon size={19}/><span>{item.label}</span><ChevronRight size={17}/></Link>; })}</div></section>
      <section className="admin-panel"><div className="panel-head"><div><span className="eyebrow">Attention</span><h2>Needs review</h2></div></div><div className="attention-list"><Link to="/admin/orders"><span>Open orders</span><strong>{stats.pendingOrders}</strong></Link><Link to="/admin/inventory"><span>Low-stock products</span><strong>{stats.lowStock}</strong></Link><Link to="/admin/forms"><span>New enquiries</span><strong>{stats.newSubmissions}</strong></Link><Link to="/admin/payment-reviews"><span>Payment exceptions</span><strong>{stats.paymentReview || 0}</strong></Link></div></section>
    </div>
    <HelpNote title="Designed for non-technical owners">Start with the launch guide above. Storefront wording, categories, products, homepage sections, FAQs and forms are edited from this dashboard rather than inside React files.</HelpNote>
  </>;
}
function Metric({ label, value }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>; }

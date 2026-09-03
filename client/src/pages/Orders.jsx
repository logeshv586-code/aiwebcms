import { useEffect, useState } from 'react';
import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { get } from '../services/api';
import { useAuth } from '../store/auth';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatMoney } from '../utils/money';

export default function Orders() {
  const user = useAuth((s) => s.user); const { config } = useOutletContext(); const [items, setItems] = useState(null);
  useEffect(() => { if (user) get('/orders/my').then(setItems).catch(() => setItems([])); }, [user]);
  if (!user) return <Navigate to="/login" replace/>; if (!items) return <Loading/>;
  return <main className="section"><div className="container narrow"><div className="page-title"><span className="eyebrow">Account</span><h1>Your orders</h1></div>{items.length ? <div className="order-list">{items.map((o) => <Link className="order-card" key={o.id} to={`/track-order?order=${encodeURIComponent(o.orderNumber)}&email=${encodeURIComponent(user.email)}`}><div><strong>{o.orderNumber}</strong><small>{new Date(o.createdAt).toLocaleDateString()}</small></div><span className="status-pill">{o.status.replaceAll('_',' ')}</span><strong>{formatMoney(o.total, config)}</strong></Link>)}</div> : <EmptyState title="No orders yet"/>}</div></main>;
}

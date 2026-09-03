import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCcw, Undo2 } from 'lucide-react';
import { get, post } from '../../services/api';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import Loading from '../../components/Loading';
import { formatMoney } from '../../utils/money';

export default function PaymentReviews() {
  const [items, setItems] = useState(null);
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const [sessions, storeConfig] = await Promise.all([get('/admin/payment-sessions/review'), get('/admin/store-config')]);
    setItems(sessions);
    setConfig(storeConfig);
  }
  useEffect(() => { load(); }, []);

  async function act(item, action) {
    const warning = action === 'refund'
      ? `Refund ${formatMoney(item.amount, { ...config, currency: item.currency })} through ${item.provider} and close this review?`
      : 'Retry creating the order from this already-verified payment? Stock and coupon availability will be checked again.';
    if (!window.confirm(warning)) return;
    setBusy(`${item.id}:${action}`); setMessage('');
    try {
      const result = await post(`/admin/payment-sessions/${item.id}/${action}`, {});
      setMessage(action === 'retry' ? `Order ${result.order?.orderNumber || ''} created successfully.` : 'Provider refund completed and the payment review was closed.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(''); }
  }

  if (!items) return <Loading label="Loading payment reviews…"/>;
  return <>
    <AdminPageHead eyebrow="Payments" title="Payment review" description="Resolve rare cases where a gateway confirmed payment but the order could not be created, usually because stock changed at the same moment."/>
    <HelpNote title="Money is never silently ignored">Retry checks current stock and coupon rules before creating the paid order. Refund sends the captured amount back through the connected gateway. If provider credentials were disconnected, use that provider's dashboard before closing the case.</HelpNote>
    {message && <div className="alert warning">{message}</div>}
    {!items.length ? <div className="soft-panel">No payments need manual review.</div> : <div className="payment-review-list">{items.map((item) => <article className="admin-panel" key={item.id}>
      <div className="panel-head"><div><span className="eyebrow"><AlertTriangle size={14}/> Requires review</span><h2>{item.provider} · {formatMoney(item.amount, { ...config, currency: item.currency })}</h2></div><small>{new Date(item.updatedAt).toLocaleString()}</small></div>
      <div className="detail-grid"><div><span>Customer</span><strong>{item.customer?.name || 'Guest'}</strong><small>{item.customer?.email || 'No email'}</small></div><div><span>Items</span><strong>{item.itemCount}</strong></div><div><span>Gateway session</span><strong className="mono-small">{item.providerSessionId || '—'}</strong></div><div><span>Payment reference</span><strong className="mono-small">{item.providerPaymentId || 'Missing'}</strong></div></div>
      <div className="modal-actions"><button className="button secondary" disabled={Boolean(busy)} onClick={() => act(item, 'refund')}><Undo2 size={16}/> {busy===`${item.id}:refund`?'Refunding…':'Refund payment'}</button><button className="button primary" disabled={Boolean(busy) || !item.providerPaymentId} onClick={() => act(item, 'retry')}><RefreshCcw size={16}/> {busy===`${item.id}:retry`?'Retrying…':'Retry order creation'}</button></div>
    </article>)}</div>}
  </>;
}

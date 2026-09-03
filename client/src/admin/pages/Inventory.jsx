import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { get, patch } from '../../services/api';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import Loading from '../../components/Loading';

export default function Inventory() {
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function load() { setItems(await get('/admin/inventory')); }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  const filtered = useMemo(() => (items || []).filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || `${item.productName} ${item.name || ''} ${item.sku || ''}`.toLowerCase().includes(q);
    const matchesFilter = filter === 'ALL' || (filter === 'LOW' && item.stock > 0 && item.stock <= 5) || (filter === 'OUT' && item.stock === 0);
    return matchesSearch && matchesFilter;
  }), [items, search, filter]);
  async function save(item) {
    const key = `${item.kind}:${item.id}`;
    const stock = Number(drafts[key] ?? item.stock);
    setBusy(key); setError(''); setMessage('');
    try { await patch(`/admin/inventory/${item.kind}/${item.id}`, { stock }); setMessage(`${item.productName} stock updated.`); await load(); setDrafts((d) => { const next = { ...d }; delete next[key]; return next; }); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  if (!items) return <Loading/>;
  return <><AdminPageHead eyebrow="Operations" title="Inventory" description="Update product and variant stock without opening every product record."/>
    <HelpNote>Products with variants are tracked at variant level. Products without variants use their base stock. Checkout decrements stock transactionally and cancelled/returned/refunded orders restore it once.</HelpNote>
    <div className="admin-toolbar"><div className="input-with-icon"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search product, option or SKU"/></div><div className="segmented compact-tabs"><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>All</button><button className={filter==='LOW'?'active':''} onClick={()=>setFilter('LOW')}>Low stock</button><button className={filter==='OUT'?'active':''} onClick={()=>setFilter('OUT')}>Out of stock</button></div></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Item</th><th>SKU</th><th>Status</th><th>Stock</th><th></th></tr></thead><tbody>{filtered.map((item) => { const key=`${item.kind}:${item.id}`; const stock=Number(drafts[key] ?? item.stock); return <tr key={key}><td><div className="table-product"><div>{item.imageUrl?<img src={item.imageUrl} alt=""/>:<span/>}</div><div><strong>{item.productName}</strong><small>{item.name || 'Base product'}</small></div></div></td><td>{item.sku || '—'}</td><td><span className={`status-pill ${stock===0?'danger':stock<=5?'draft':'published'}`}>{stock===0?'OUT':stock<=5?'LOW':'IN STOCK'}</span></td><td><div className="inventory-input"><input type="number" min="0" value={drafts[key] ?? item.stock} onChange={(e)=>setDrafts({...drafts,[key]:e.target.value})}/>{stock<=5&&<AlertTriangle size={15}/>}</div></td><td><button className="button secondary small" disabled={busy===key || Number(drafts[key] ?? item.stock)===item.stock} onClick={()=>save(item)}>{busy===key?'Saving…':'Save'}</button></td></tr>; })}</tbody></table></div>
    {error&&<div className="alert error fixed-toast">{error}</div>}{message&&<div className="alert success fixed-toast">{message}</div>}
  </>;
}

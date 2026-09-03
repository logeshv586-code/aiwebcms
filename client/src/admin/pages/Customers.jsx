import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { get, patch } from '../../services/api';
import { AdminPageHead } from '../AdminLayout';
import { formatMoney } from '../../utils/money';

export default function Customers(){
  const[items,setItems]=useState([]);const[detail,setDetail]=useState(null);const[config,setConfig]=useState(null);const[error,setError]=useState('');
  async function load(){const [customers,store]=await Promise.all([get('/admin/customers'),get('/admin/store-config')]);setItems(customers);setConfig(store);}
  useEffect(()=>{load().catch((e)=>setError(e.message));},[]);
  async function toggle(item){try{await patch(`/admin/customers/${item.id}`,{isActive:!item.isActive});load();}catch(e){setError(e.message)}}
  async function open(item){try{setDetail(await get(`/admin/customers/${item.id}`));}catch(e){setError(e.message)}}
  return <><AdminPageHead eyebrow="Customers" title="Customer accounts" description="Inspect customer details, saved addresses and order history. Passwords and password hashes are never exposed."/>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>{items.map((c)=><tr key={c.id}><td><strong>{c.name||'Customer'}</strong><small className="block">{c.email}</small></td><td>{c.phone||'—'}</td><td>{c._count.orders}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td><td><button className={c.isActive?'status-pill published':'status-pill draft'} onClick={()=>toggle(c)}>{c.isActive?'Active':'Disabled'}</button></td><td><button className="icon-button" onClick={()=>open(c)} aria-label="View customer"><Eye size={16}/></button></td></tr>)}</tbody></table></div>
    {detail&&<div className="drawer-backdrop" onMouseDown={(e)=>e.currentTarget===e.target&&setDetail(null)}><aside className="editor-drawer"><div className="drawer-title"><div><span className="eyebrow">Customer</span><h2>{detail.name||detail.email}</h2></div><button onClick={()=>setDetail(null)}><X/></button></div><div className="drawer-form"><section><h3>Contact</h3><p><strong>{detail.email}</strong><br/>{detail.phone||'No phone'}<br/>Joined {new Date(detail.createdAt).toLocaleDateString()}</p></section><section><h3>Saved addresses</h3>{detail.addresses?.length?detail.addresses.map((a)=><div className="soft-row" key={a.id}><strong>{a.label||'Address'}{a.isDefault?' · Default':''}</strong><small>{a.fullName}, {a.line1}{a.line2?`, ${a.line2}`:''}, {a.city}, {a.state} {a.postalCode}, {a.country}</small></div>):<p>No saved addresses.</p>}</section><section><h3>Order history</h3>{detail.orders?.length?detail.orders.map((o)=><div className="soft-row" key={o.id}><div><strong>{o.orderNumber}</strong><small>{new Date(o.createdAt).toLocaleDateString()} · {o.status.replaceAll('_',' ')}</small></div><strong>{formatMoney(o.total,config)}</strong></div>):<p>No orders yet.</p>}</section></div></aside></div>}
    {error&&<div className="alert error fixed-toast">{error}</div>}
  </>;
}

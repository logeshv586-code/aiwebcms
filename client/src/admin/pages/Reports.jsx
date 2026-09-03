import { useEffect, useState } from 'react';
import { get } from '../../services/api';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import Loading from '../../components/Loading';
import { formatMoney } from '../../utils/money';

export default function Reports() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([get(`/admin/reports/summary?days=${days}`), get('/admin/store-config')]).then(([report, store]) => { setData(report); setConfig(store); }).catch((e)=>setError(e.message)); }, [days]);
  if (!data || !config) return <Loading/>;
  const maxDaily = Math.max(...data.daily.map((x)=>x.revenue), 1);
  return <><AdminPageHead eyebrow="Analytics" title="Reports" description="A lightweight operational view of sales, order status and top products." action={<select className="report-range" value={days} onChange={(e)=>{setData(null);setDays(Number(e.target.value));}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select>}/>
    <div className="metric-grid"><Metric label="Revenue" value={formatMoney(data.totals.revenue,config)}/><Metric label="Orders placed" value={data.totals.orders}/><Metric label="Revenue orders" value={data.totals.revenueOrders}/><Metric label="Average order" value={formatMoney(data.totals.averageOrderValue,config)}/></div>
    <HelpNote>Cancelled, returned and refunded orders are excluded from revenue. This report is intentionally dependency-free; connect analytics/BI through webhooks later if a merchant needs deeper attribution.</HelpNote>
    <div className="admin-two-col"><section className="admin-panel"><div className="panel-head"><div><span className="eyebrow">Revenue trend</span><h2>Daily sales</h2></div></div><div className="report-bars">{data.daily.length?data.daily.map((row)=><div className="report-bar-row" key={row.date}><span>{new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><div><i style={{width:`${Math.max((row.revenue/maxDaily)*100,2)}%`}}/></div><strong>{formatMoney(row.revenue,config)}</strong></div>):<p className="muted">No revenue in this period.</p>}</div></section>
    <section className="admin-panel"><div className="panel-head"><div><span className="eyebrow">Fulfillment</span><h2>Order status</h2></div></div><div className="simple-list">{data.statuses.map((row)=><div className="simple-row" key={row.status}><div className="grow"><strong>{row.status.replaceAll('_',' ')}</strong></div><span className="status-pill draft">{row.count}</span></div>)}</div></section></div>
    <section className="admin-panel"><div className="panel-head"><div><span className="eyebrow">Products</span><h2>Top products</h2></div></div><div className="admin-table-wrap flat"><table className="admin-table"><thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead><tbody>{data.topProducts.map((row)=><tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.quantity}</td><td>{formatMoney(row.revenue,config)}</td></tr>)}</tbody></table></div></section>
    {error&&<div className="alert error fixed-toast">{error}</div>}
  </>;
}
function Metric({label,value}){return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>}

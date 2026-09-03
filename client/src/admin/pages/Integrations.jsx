import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, CreditCard, Mail, MessageCircle, Plug, RefreshCw, Send, Truck, Webhook, XCircle } from 'lucide-react';
import { get, post, put } from '../../services/api';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import Loading from '../../components/Loading';

const categoryMeta = {
  PAYMENT: ['Payments', CreditCard, 'Enable payment gateways only after their test succeeds.'],
  STORAGE: ['Media storage', Cloud, 'Choose one active cloud storage provider. Local uploads remain the fallback.'],
  EMAIL: ['Email', Mail, 'Transactional email uses the merchant’s SMTP account.'],
  SMS: ['SMS', MessageCircle, 'Connect SMS without adding provider code to the storefront.'],
  WHATSAPP: ['WhatsApp', MessageCircle, 'Connect the merchant’s own Meta WhatsApp Business account.'],
  SHIPPING: ['Shipping', Truck, 'Choose one active carrier/aggregator or connect any compatible HTTP shipping API.'],
  WEBHOOK: ['Webhooks', Webhook, 'Send commerce events to CRM, ERP, automation or any custom service.']
};

function valueOf(value){ return value ?? ''; }

export default function Integrations(){
  const[items,setItems]=useState(null);const[busy,setBusy]=useState('');const[message,setMessage]=useState('');const[error,setError]=useState('');
  async function load(){setItems(await get('/admin/integrations'));}
  useEffect(()=>{load();},[]);
  const groups=useMemo(()=>{const map={};for(const item of items||[])(map[item.category]||=[]).push(item);return map;},[items]);
  function patchLocal(category,provider,patch){setItems((current)=>current.map((item)=>item.category===category&&item.provider===provider?{...item,...patch}:item));}
  function patchConfig(item,key,value){patchLocal(item.category,item.provider,{config:{...(item.config||{}),[key]:value}});}
  function patchSecret(item,key,value){patchLocal(item.category,item.provider,{draftSecrets:{...(item.draftSecrets||{}),[key]:value}});}
  async function save(item){const id=`${item.category}:${item.provider}:save`;setBusy(id);setMessage('');setError('');try{const saved=await put(`/admin/integrations/${item.category}/${item.provider}`,{label:item.label||item.name,isEnabled:Boolean(item.isEnabled),config:item.config||{},secrets:item.draftSecrets||{}});patchLocal(item.category,item.provider,{...saved,draftSecrets:{}});setMessage(`${item.name} saved.`);await load();}catch(e){setError(e.message)}finally{setBusy('')}}
  async function test(item){const id=`${item.category}:${item.provider}:test`;setBusy(id);setMessage('');setError('');try{const result=await post(`/admin/integrations/${item.category}/${item.provider}/test`,{});setMessage(result.test?.message||'Connection test completed.');await load();}catch(e){setError(e.message)}finally{setBusy('')}}
  async function testSend(item){const to=prompt(item.category==='EMAIL'?'Send test email to:':item.category==='SMS'||item.category==='WHATSAPP'?'Send test message to phone number:':'Test destination is taken from the saved configuration. Optional note:',item.category==='WEBHOOK'?'Test event':'');if(to===null)return;const id=`${item.category}:${item.provider}:send`;setBusy(id);setMessage('');setError('');try{await post(`/admin/integrations/${item.category}/${item.provider}/test-send`,item.category==='WEBHOOK'?{text:to||'Test event'}:{to,text:'Your Commerce CMS integration is working.'});setMessage('Test delivery succeeded.');}catch(e){setError(e.message)}finally{setBusy('')}}
  if(!items)return <Loading/>;
  return <><AdminPageHead eyebrow="Connections" title="Integrations" description="Connect each customer’s own payment, storage, messaging and delivery accounts without changing or pushing source code."/><HelpNote title="Safe merchant credentials">Secret keys are encrypted on the server and are never returned to this screen. Save the connection, test it, then enable it. Leave a provider disabled until the merchant has real credentials.</HelpNote>
    <div className="integration-groups">{Object.entries(groups).map(([category,connections])=>{const [title,Icon,description]=categoryMeta[category]||[category,Plug,''];return <section className="admin-panel integration-section" key={category}><div className="settings-title"><Icon/><div><h2>{title}</h2><p>{description}</p></div></div><div className="integration-cards">{connections.map((item)=><article className="integration-card" key={`${category}:${item.provider}`}><div className="integration-card-head"><div><strong>{item.name}</strong><small>{item.description}</small></div><span className={`status-pill ${item.status==='CONNECTED'?'published':item.status==='ERROR'?'danger':'draft'}`}>{item.status==='CONNECTED'?<CheckCircle2 size={13}/>:item.status==='ERROR'?<XCircle size={13}/>:<Plug size={13}/>} {item.status.replaceAll('_',' ')}</span></div>
      <label><span>Display name</span><input value={item.label||item.name} onChange={(e)=>patchLocal(category,item.provider,{label:e.target.value})}/></label>
      <div className="integration-fields">{(item.configFields||[]).map((field)=><label key={field.key}><span>{field.label}</span>{field.type==='boolean'?<label className="check-line"><input type="checkbox" checked={Boolean(item.config?.[field.key])} onChange={(e)=>patchConfig(item,field.key,e.target.checked)}/> Enabled</label>:<input type={field.type==='number'?'number':'text'} value={valueOf(item.config?.[field.key])} placeholder={field.placeholder||''} onChange={(e)=>patchConfig(item,field.key,field.type==='number'?Number(e.target.value):e.target.value)}/>}</label>)}</div>
      {(item.secretFields||[]).length>0&&<div className="secret-box"><strong>Credentials</strong><small>Existing values stay saved when these fields are left blank.</small><div className="integration-fields">{item.secretFields.map((field)=><label key={field.key}><span>{field.label}{item.hasSecrets?.[field.key]?' · saved':''}</span><input type="password" autoComplete="new-password" value={item.draftSecrets?.[field.key]||''} placeholder={item.hasSecrets?.[field.key]?'••••••••':'Enter credential'} onChange={(e)=>patchSecret(item,field.key,e.target.value)}/></label>)}</div></div>}
      <label className="check-card compact"><input type="checkbox" checked={Boolean(item.isEnabled)} onChange={(e)=>patchLocal(category,item.provider,{isEnabled:e.target.checked})}/><span><strong>Enable this provider</strong><small>Customer-facing flows use only enabled, successfully connected providers.</small></span></label>
      {item.lastTestMessage&&<div className="integration-last-test"><small>{item.lastTestedAt?new Date(item.lastTestedAt).toLocaleString():''}</small><span>{item.lastTestMessage}</span></div>}
      <div className="integration-actions"><button className="button secondary small" disabled={Boolean(busy)} onClick={()=>save(item)}>{busy===`${category}:${item.provider}:save`?'Saving…':'Save'}</button><button className="button secondary small" disabled={Boolean(busy)} onClick={()=>test(item)}><RefreshCw size={14}/>{busy===`${category}:${item.provider}:test`?'Testing…':'Test connection'}</button>{['EMAIL','SMS','WHATSAPP','WEBHOOK'].includes(category)&&<button className="button secondary small" disabled={Boolean(busy)||item.status!=='CONNECTED'||!item.isEnabled} onClick={()=>testSend(item)}><Send size={14}/> Test delivery</button>}</div>
    </article>)}</div></section>})}</div>
    <section className="admin-panel endpoint-panel"><h2>Built-in connection pathways</h2><p>These endpoints are already wired into the storefront/CMS. A merchant only supplies credentials above.</p><div className="endpoint-grid"><code>GET /api/payments/methods</code><code>POST /api/payments/session</code><code>POST /api/payments/verify</code><code>POST /api/payments/webhooks/stripe</code><code>POST /api/payments/webhooks/razorpay</code><code>POST /api/shipping/quote</code><code>POST /api/admin/orders/:id/shipment</code><code>POST /api/admin/orders/:id/refund</code><code>POST /api/admin/media/upload</code><code>POST /api/admin/integrations/:category/:provider/test</code></div></section>
    {error&&<div className="alert error fixed-toast">{error}</div>}{message&&<div className="alert success fixed-toast">{message}</div>}
  </>;
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CheckCircle2, CreditCard, WalletCards } from 'lucide-react';
import { get, post } from '../services/api';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import { formatMoney } from '../utils/money';

const empty = { name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: '', couponCode: '' };

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[src="${src}"]`);if(existing)return resolve();
    const script=document.createElement('script');script.src=src;script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error('Could not load the payment provider.'));document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { config } = useOutletContext(); const text = config?.storefrontText || {}; const user = useAuth((s) => s.user);
  const items = useCart((s) => s.items); const clear = useCart((s) => s.clear);
  const [values, setValues] = useState({ ...empty, name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [state, setState] = useState({ loading: false, error: '', order: null });
  const [coupon, setCoupon] = useState(null); const [methods,setMethods]=useState([]); const[paymentMethod,setPaymentMethod]=useState('COD'); const[shippingQuote,setShippingQuote]=useState(null); const[shippingMethodId,setShippingMethodId]=useState('');
  useEffect(() => { if (config?.commerceSettings?.defaultCountry) setValues((current) => ({ ...current, country: current.country || config.commerceSettings.defaultCountry })); }, [config?.commerceSettings?.defaultCountry]);
  useEffect(()=>{get('/payments/methods').then((list)=>{setMethods(list||[]);if(list?.length&&!list.some((item)=>item.provider===paymentMethod))setPaymentMethod(list[0].provider);}).catch(()=>setMethods(config?.commerceSettings?.codEnabled===false?[]:[{provider:'COD',label:'Cash on Delivery'}]));},[config?.commerceSettings?.codEnabled]);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  useEffect(()=>{
    if(!values.postalCode||String(values.postalCode).trim().length<3||!values.country)return;
    const timer=setTimeout(()=>{post('/shipping/quote',{items:items.map(({productId,variantId,quantity})=>({productId,variantId,quantity})),address:{postalCode:values.postalCode,country:values.country,state:values.state,city:values.city},orderValue:Math.max(subtotal-Number(coupon?.discount||0),0),paymentMethod}).then((quote)=>{setShippingQuote(quote);const first=quote.selected||quote.options?.[0];if(first)setShippingMethodId(String(first.courierId??first.id??first.code??first.name??''));}).catch(()=>setShippingQuote(null));},550);
    return()=>clearTimeout(timer);
  },[values.postalCode,values.country,values.state,values.city,items,subtotal,coupon?.discount,paymentMethod]);
  useEffect(() => {
    if (!user) return;
    get('/account/addresses').then((addresses) => {
      const address = addresses.find((item) => item.isDefault) || addresses[0];
      if (address) setValues((current) => ({ ...current, name: current.name || address.fullName, phone: current.phone || address.phone, line1: address.line1, line2: address.line2 || '', city: address.city, state: address.state, postalCode: address.postalCode, country: address.country || current.country }));
    }).catch(() => {});
  }, [user]);
  function field(key) { return { value: values[key], onChange: (e) => { setValues({ ...values, [key]: e.target.value }); if (key === 'couponCode') setCoupon(null); } }; }
  async function validateCoupon(){ setState((s)=>({...s,error:''})); try{ const data=await post('/coupons/validate',{code:values.couponCode,subtotal});setCoupon(data);}catch(error){setCoupon(null);setState((s)=>({...s,error:error.message}));} }
  const checkoutPayload=useMemo(()=>({
    items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
    customer: { name: values.name, email: values.email, phone: values.phone },
    shippingAddress: { fullName: values.name, phone: values.phone, line1: values.line1, line2: values.line2, city: values.city, state: values.state, postalCode: values.postalCode, country: values.country },
    couponCode: values.couponCode || undefined,
    shippingMethodId: shippingMethodId || undefined
  }),[items,values,shippingMethodId]);
  async function submit(e) {
    e.preventDefault(); setState({ loading: true, error: '', order: null });
    try {
      if(paymentMethod==='COD'){
        const data=await post('/checkout',{...checkoutPayload,paymentMethod:'COD'});clear();setState({loading:false,error:'',order:data.order});return;
      }
      const session=await post('/payments/session',{...checkoutPayload,provider:paymentMethod});
      if(paymentMethod==='STRIPE'){
        if(!session.redirectUrl)throw new Error('Stripe did not return a checkout URL.');
        window.location.assign(session.redirectUrl);return;
      }
      if(paymentMethod==='RAZORPAY'){
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if(!window.Razorpay)throw new Error('Razorpay Checkout is unavailable.');
        const options={
          key:session.client.keyId,amount:session.client.amount,currency:session.client.currency,order_id:session.client.orderId,
          name:config?.storeName||'Store',description:'Order payment',prefill:{name:values.name,email:values.email,contact:values.phone},
          handler:async(response)=>{try{const verified=await post('/payments/verify',{sessionId:session.id,...response});clear();setState({loading:false,error:'',order:verified.order});}catch(error){setState({loading:false,error:error.message,order:null});}},
          modal:{ondismiss:()=>setState((current)=>({...current,loading:false,error:'Payment was cancelled.'}))},theme:{color:config?.theme?.primary||'#176B5B'}
        };
        new window.Razorpay(options).open();return;
      }
    } catch (error) { setState({ loading: false, error: error.message, order: null }); }
  }
  if (state.order) return <main className="section"><div className="container narrow"><div className="success-panel"><CheckCircle2 size={46}/><span className="eyebrow">Order confirmed</span><h1>Thank you for your order.</h1><p>Your order number is <strong>{state.order.orderNumber}</strong>.</p><p>Total: <strong>{formatMoney(state.order.total, config)}</strong></p><Link className="button primary" to={`/track-order?order=${state.order.orderNumber}&email=${encodeURIComponent(values.email)}`}>Track order</Link></div></div></main>;
  if (!items.length) return <main className="section"><div className="container narrow"><div className="soft-panel">Your cart is empty. <Link className="text-link" to="/shop">Return to catalog</Link>.</div></div></main>;
  return <main className="section"><div className="container"><div className="page-title"><span className="eyebrow">Secure checkout</span><h1>Delivery details</h1></div><form onSubmit={submit} className="checkout-layout"><div className="form-card"><h2>Contact</h2><div className="form-grid"><label><span>Full name *</span><input required {...field('name')}/></label><label><span>Email *</span><input type="email" required {...field('email')}/></label><label><span>Phone *</span><input required {...field('phone')}/></label><label><span>Country *</span><input required {...field('country')}/></label><label className="span-2"><span>Address *</span><input required {...field('line1')}/></label><label className="span-2"><span>Address line 2</span><input {...field('line2')}/></label><label><span>City *</span><input required {...field('city')}/></label><label><span>State *</span><input required {...field('state')}/></label><label><span>Postal code *</span><input required {...field('postalCode')}/></label><label><span>Coupon</span><div className="inline-field"><input placeholder="Optional" {...field('couponCode')}/><button type="button" className="button secondary small" disabled={!values.couponCode} onClick={validateCoupon}>Apply</button></div></label></div>{coupon&&<div className="alert success">Coupon {coupon.code} applied: {formatMoney(coupon.discount,config)} discount.</div>}
    {shippingQuote&&<div className="payment-methods"><h2>{text.shippingLabel || 'Delivery'}</h2>{shippingQuote.options?.length>1?shippingQuote.options.map((option)=>{const id=String(option.courierId??option.id??option.code??option.name);return <label className={`payment-choice ${shippingMethodId===id?'selected':''}`} key={id}><input type="radio" name="shipping" checked={shippingMethodId===id} onChange={()=>setShippingMethodId(id)}/><div><strong>{option.name||'Delivery service'}</strong><small>{formatMoney(option.amount||0,config)}{option.estimatedDays?` · ${option.estimatedDays} days`:''}</small></div></label>}):<div className="payment-choice selected"><div><strong>{shippingQuote.selected?.name||shippingQuote.provider?.replaceAll('_',' ')||'Delivery'}</strong><small>{formatMoney(shippingQuote.amount||0,config)}{shippingQuote.selected?.estimatedDays?` · ${shippingQuote.selected.estimatedDays} days`:''}</small></div></div>}</div>}
    <div className="payment-methods"><h2>{text.paymentLabel || 'Payment'}</h2>{methods.length?methods.map((method)=><label className={`payment-choice ${paymentMethod===method.provider?'selected':''}`} key={method.provider}><input type="radio" name="payment" checked={paymentMethod===method.provider} onChange={()=>setPaymentMethod(method.provider)}/><div className="payment-choice-icon">{method.provider==='COD'?<WalletCards size={19}/>:<CreditCard size={19}/>}</div><div><strong>{method.label}</strong><small>{method.provider==='COD'?'Pay according to the store’s delivery policy.':method.provider==='STRIPE'?'Secure hosted checkout by Stripe.':'Secure Razorpay checkout using the merchant account.'}</small></div></label>):<div className="alert error">No payment method is enabled. Please contact the store.</div>}</div>
    {state.error && <div className="alert error">{state.error}</div>}</div><aside className="summary-card"><h2>Order</h2>{items.map((i) => <div className="summary-line" key={i.key}><span>{i.name} × {i.quantity}</span><b>{formatMoney(i.price * i.quantity, config)}</b></div>)}<hr/><div><span>Subtotal</span><strong>{formatMoney(subtotal, config)}</strong></div>{coupon&&<div><span>Discount</span><strong>-{formatMoney(coupon.discount,config)}</strong></div>}{shippingQuote&&<div><span>Delivery</span><strong>{formatMoney((shippingQuote.options?.find((o)=>String(o.courierId??o.id??o.code??o.name)===shippingMethodId)?.amount??shippingQuote.amount??0),config)}</strong></div>}<button className="button primary full" disabled={state.loading||!methods.length}>{state.loading ? 'Preparing…' : paymentMethod==='COD'?(text.placeOrderLabel || 'Place order'):'Continue to payment'}</button></aside></form></div></main>;
}

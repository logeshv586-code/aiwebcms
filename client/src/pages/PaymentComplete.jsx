import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { post } from '../services/api';
import { useCart } from '../store/cart';
import Loading from '../components/Loading';

export default function PaymentComplete(){
  const[params]=useSearchParams();const clear=useCart((s)=>s.clear);const[state,setState]=useState({loading:true,error:'',order:null});
  useEffect(()=>{const sessionId=params.get('local_session');const providerSessionId=params.get('session_id');if(!sessionId||!providerSessionId){setState({loading:false,error:'Payment confirmation details are missing.',order:null});return;}post('/payments/verify',{sessionId,providerSessionId}).then((data)=>{clear();setState({loading:false,error:'',order:data.order});}).catch((error)=>setState({loading:false,error:error.message,order:null}));},[]);
  if(state.loading)return <main className="section"><Loading label="Confirming payment…"/></main>;
  if(state.error)return <main className="section"><div className="container narrow"><div className="alert error">{state.error}</div><Link className="button secondary" to="/checkout">Return to checkout</Link></div></main>;
  return <main className="section"><div className="container narrow"><div className="success-panel"><CheckCircle2 size={46}/><span className="eyebrow">Payment confirmed</span><h1>Your order is confirmed.</h1><p>Order <strong>{state.order.orderNumber}</strong> is now in the store workflow.</p><Link className="button primary" to={`/track-order?order=${state.order.orderNumber}&email=${encodeURIComponent(state.order.customerSnapshot?.email||'')}`}>Track order</Link></div></div></main>;
}

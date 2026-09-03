import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import { useCart } from '../store/cart';
import EmptyState from '../components/EmptyState';
import { formatMoney } from '../utils/money';

export default function Cart() {
  const { config } = useOutletContext();
  const text = config?.storefrontText || {};
  const items = useCart((s) => s.items); const setQuantity = useCart((s) => s.setQuantity); const remove = useCart((s) => s.remove);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!items.length) return <main className="section"><div className="container narrow"><EmptyState title="Your cart is empty" text="Browse the catalog and add something you like." action={<Link className="button primary" to="/shop">{text.browseProductsLabel || 'Browse products'}</Link>}/></div></main>;
  return <main className="section"><div className="container"><div className="page-title"><span className="eyebrow">{text.checkoutLabel || 'Checkout'}</span><h1>Your cart</h1></div><div className="cart-layout"><div className="cart-list">{items.map((item) => <div className="cart-item" key={item.key}><div className="cart-image">{item.image ? <img src={item.image} alt=""/> : null}</div><div className="cart-info"><Link to={`/product/${item.slug}`}><strong>{item.name}</strong></Link>{item.variantName && <small>{item.variantName}</small>}<div>{formatMoney(item.price, config)}</div></div><input className="qty-input" type="number" min="1" max="99" value={item.quantity} onChange={(e) => setQuantity(item.key, Number(e.target.value))}/><strong>{formatMoney(item.price * item.quantity, config)}</strong><button className="icon-button danger" onClick={() => remove(item.key)}><Trash2 size={17}/></button></div>)}</div><aside className="summary-card"><h2>Summary</h2><div><span>Subtotal</span><strong>{formatMoney(subtotal, config)}</strong></div><p className="muted">Shipping, tax and discounts are calculated at checkout.</p><Link className="button primary full" to="/checkout">{text.checkoutLabel || 'Continue to checkout'} <ArrowRight size={17}/></Link></aside></div></div></main>;
}

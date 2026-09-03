import { useEffect, useState } from 'react';
import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { get, remove } from '../services/api';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatMoney } from '../utils/money';

export default function Wishlist() {
  const user = useAuth((s) => s.user); const add = useCart((s) => s.add); const { config } = useOutletContext(); const text = config?.storefrontText || {};
  const [list, setList] = useState(null);
  async function load(){ setList(await get('/account/wishlist')); }
  useEffect(() => { if (user) load().catch(() => setList({ items: [] })); }, [user]);
  if (!user) return <Navigate to="/login" replace/>;
  if (!list) return <Loading/>;
  const items = list.items || [];
  async function del(productId){ await remove(`/account/wishlist/${productId}`); await load(); }
  return <main className="section"><div className="container narrow"><div className="page-title"><span className="eyebrow">Account</span><h1>Wishlist</h1></div>{items.length ? <div className="wishlist-list">{items.map(({ id, product }) => { const variants=(product.variants||[]).filter((v)=>v.isActive); return <div className="cart-item" key={id}><div className="cart-image">{product.images?.[0]?.url && <img src={product.images[0].url} alt=""/>}</div><div className="cart-info grow"><Link to={`/product/${product.slug}`}><strong>{product.name}</strong></Link><div>{formatMoney(product.price, config)}</div></div>{variants.length ? <Link className="button secondary small" to={`/product/${product.slug}`}>{text.chooseOptionsLabel || 'Choose options'}</Link> : <button className="button secondary small" disabled={product.stock < 1} onClick={()=>add(product)}><ShoppingBag size={16}/> {text.addToCartLabel || 'Add to cart'}</button>}<button className="icon-button danger" onClick={()=>del(product.id)}><Trash2 size={16}/></button></div>; })}</div> : <EmptyState title="Your wishlist is empty" text="Save products from their product page." action={<Link className="button primary" to="/shop">{text.browseProductsLabel || 'Browse products'}</Link>}/>}</div></main>;
}

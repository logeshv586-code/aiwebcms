import { Link, useOutletContext } from 'react-router-dom';
import { Settings2, ShoppingBag } from 'lucide-react';
import { useCart } from '../store/cart';
import { formatMoney } from '../utils/money';

export default function ProductCard({ product }) {
  const { config } = useOutletContext();
  const text = config?.storefrontText || {};
  const add = useCart((state) => state.add);
  const image = product.images?.[0]?.url;
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const hasVariants = variants.length > 0;
  const basePrice = Number(product.price || 0);
  const prices = hasVariants ? variants.map((variant) => Number(variant.price)) : [basePrice];
  const price = Math.min(...prices);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const stock = hasVariants ? variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0) : Number(product.stock || 0);
  return <article className="product-card">
    <Link className="product-media" to={`/product/${product.slug}`}>
      {image ? <img src={image} alt={product.images?.[0]?.altText || product.name} /> : <div className="image-placeholder">No image</div>}
      {product.isFeatured && <span className="badge">Featured</span>}
    </Link>
    <div className="product-info">
      <div className="product-meta">{product.category?.name || product.brand?.name || 'Product'}</div>
      <Link to={`/product/${product.slug}`}><h3>{product.name}</h3></Link>
      <div className="product-bottom">
        <div><strong>{hasVariants ? `From ${formatMoney(price, config)}` : formatMoney(price, config)}</strong>{compare && compare > price ? <del>{formatMoney(compare, config)}</del> : null}</div>
        {hasVariants
          ? <Link className="icon-button" to={`/product/${product.slug}`} aria-label={`${text.chooseOptionsLabel || 'Choose options'}: ${product.name}`}><Settings2 size={18}/></Link>
          : <button className="icon-button" disabled={stock < 1} onClick={() => add(product)} aria-label={`${text.addToCartLabel || 'Add to cart'}: ${product.name}`}><ShoppingBag size={18}/></button>}
      </div>
    </div>
  </article>;
}

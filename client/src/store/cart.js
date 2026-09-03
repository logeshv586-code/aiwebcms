import { create } from 'zustand';

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('commerce_cart') || '[]'); } catch { return []; }
})();

function persist(items) {
  localStorage.setItem('commerce_cart', JSON.stringify(items));
  return items;
}

export const useCart = create((set, get) => ({
  items: saved,
  add(product, variant = null, quantity = 1) {
    const key = `${product.id}:${variant?.id || 'base'}`;
    const items = [...get().items];
    const index = items.findIndex((item) => item.key === key);
    if (index >= 0) items[index] = { ...items[index], quantity: Math.min(items[index].quantity + quantity, 99) };
    else items.push({ key, productId: product.id, variantId: variant?.id || null, name: product.name, slug: product.slug, image: variant?.imageUrl || product.images?.[0]?.url || '', variantName: variant?.title || '', price: Number(variant?.price ?? product.price), quantity });
    set({ items: persist(items) });
  },
  setQuantity(key, quantity) {
    const items = quantity <= 0 ? get().items.filter((i) => i.key !== key) : get().items.map((i) => i.key === key ? { ...i, quantity: Math.min(Number(quantity) || 1, 99) } : i);
    set({ items: persist(items) });
  },
  remove(key) { set({ items: persist(get().items.filter((i) => i.key !== key)) }); },
  replace(items) { set({ items: persist(Array.isArray(items) ? items : []) }); },
  clear() { set({ items: persist([]) }); },
  count() { return get().items.reduce((sum, item) => sum + item.quantity, 0); },
  subtotal() { return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0); }
}));

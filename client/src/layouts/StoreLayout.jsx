import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { get, put } from '../services/api';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import usePremiumMotion from '../hooks/usePremiumMotion';

const THEME_STORAGE_KEY = 'commerce-cms-store-theme';

function getInitialThemeMode(theme = {}) {
  const policy = theme.modePolicy || (theme.mode === 'dark' ? 'DARK_ONLY' : 'BOTH');
  if (policy === 'LIGHT_ONLY') return 'light';
  if (policy === 'DARK_ONLY') return 'dark';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return theme.defaultMode === 'dark' ? 'dark' : 'light';
}

export default function StoreLayout() {
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [cartSyncUser, setCartSyncUser] = useState(null);
  const [themeMode, setThemeMode] = useState('light');
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const shellRef = useRef(null);
  const navigate = useNavigate();
  const cartItems = useCart((state) => state.items);
  const replaceCart = useCart((state) => state.replace);
  const user = useAuth((state) => state.user);

  useEffect(() => {
    Promise.all([get('/storefront/config'), get('/storefront/categories')]).then(([store, cats]) => {
      setConfig(store); setCategories(cats || []);
      setThemeMode(getInitialThemeMode(store?.theme || {}));
      document.title = store?.seoDefaults?.title || store?.storeName || 'Store';
      if (store?.faviconUrl) {
        let icon = document.head.querySelector('link[rel="icon"]');
        if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
        icon.href = store.faviconUrl;
      }
    }).catch(() => {});
  }, []);

  const theme = config?.theme || {};
  const themePolicy = theme.modePolicy || (theme.mode === 'dark' ? 'DARK_ONLY' : 'BOTH');
  const fontPresets = {
    SYSTEM: 'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    MODERN: '"Segoe UI",Inter,ui-sans-serif,system-ui,sans-serif',
    CLASSIC: 'Georgia,"Times New Roman",serif',
    ROUNDED: '"Trebuchet MS",Inter,ui-sans-serif,system-ui,sans-serif'
  };
  const themeVars = useMemo(() => ({
    '--theme-light-bg': theme.background || '#fafaf7',
    '--theme-light-surface': theme.surface || '#ffffff',
    '--theme-light-ink': theme.ink || '#1c2320',
    '--theme-light-muted': theme.muted || '#69736e',
    '--theme-light-line': theme.border || '#e7eae5',
    '--theme-light-soft': theme.soft || '#f1f3ef',
    '--theme-dark-bg': theme.darkBackground || '#090c0b',
    '--theme-dark-surface': theme.darkSurface || '#111513',
    '--theme-dark-ink': theme.darkInk || '#f4f7f5',
    '--theme-dark-muted': theme.darkMuted || '#9ba5a0',
    '--theme-dark-line': theme.darkBorder || '#252c28',
    '--theme-dark-soft': theme.darkSoft || '#171c19',
    '--accent': theme.primary || '#176b5b',
    '--accent-dark': theme.primaryDark || '#105246',
    '--radius': `${Number(theme.radius ?? 16)}px`,
    '--max': `${Number(theme.container ?? 1240)}px`,
    '--button-radius': `${Number(theme.buttonRadius ?? 11)}px`,
    '--section-space': `${Number(theme.sectionSpacing ?? 58)}px`,
    '--header-height': `${Number(theme.headerHeight ?? 68)}px`,
    '--product-ratio': theme.productImageRatio || '1 / 1',
    '--store-font': fontPresets[theme.fontFamily] || fontPresets.SYSTEM
  }), [theme]);

  usePremiumMotion(shellRef, {
    enabled: theme.motionEnabled !== false,
    smoothScroll: theme.smoothScroll !== false
  });

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const forcedMode = themePolicy === 'LIGHT_ONLY' ? 'light' : themePolicy === 'DARK_ONLY' ? 'dark' : null;
    if (forcedMode && themeMode !== forcedMode) setThemeMode(forcedMode);
  }, [themePolicy, themeMode]);

  useEffect(() => {
    if (themePolicy === 'BOTH') localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode, themePolicy]);

  useEffect(() => {
    const value = search.trim();
    if (value.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(() => get(`/storefront/search-suggestions?q=${encodeURIComponent(value)}`).then(setSuggestions).catch(() => setSuggestions([])), 220);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setCartSyncUser(null); return () => { cancelled = true; }; }
    (async () => {
      try {
        const remote = await get('/cart');
        if (cancelled) return;
        const remoteItems = (remote.items || []).map((item) => {
          const variant = item.product.variants?.find((v) => v.id === item.variantId) || null;
          return { key: `${item.productId}:${item.variantId || 'base'}`, productId: item.productId, variantId: item.variantId || null, name: item.product.name, slug: item.product.slug, image: variant?.imageUrl || item.product.images?.[0]?.url || '', variantName: variant?.title || '', price: Number(variant?.price ?? item.product.price), quantity: item.quantity };
        });
        const local = useCart.getState().items;
        const merged = new Map(remoteItems.map((item) => [item.key, item]));
        for (const item of local) {
          const existing = merged.get(item.key);
          merged.set(item.key, existing ? { ...item, quantity: Math.max(item.quantity, existing.quantity) } : item);
        }
        const next = [...merged.values()];
        replaceCart(next);
        await put('/cart/sync', { items: next.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) });
      } catch {
        // Keep local cart usable even if account-cart synchronization fails.
      } finally {
        if (!cancelled) setCartSyncUser(user.id);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, replaceCart]);

  useEffect(() => {
    if (!user || cartSyncUser !== user.id) return;
    const timer = setTimeout(() => {
      put('/cart/sync', { items: cartItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [cartItems, cartSyncUser, user?.id]);

  const headerMenu = useMemo(() => config?.menus?.find((m) => m.key === 'header')?.items || [], [config]);
  const footerMenuRecord = useMemo(() => config?.menus?.find((m) => m.key === 'footer') || null, [config]);
  const footerMenu = footerMenuRecord?.items || [];
  const effectiveHeader = headerMenu.length ? headerMenu : [{ id: 'home', label: 'Home', target: '/' }, { id: 'catalog', label: 'Catalog', target: '/shop' }];
  const announcement = config?.announcement;
  const text = config?.storefrontText || {};
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function submitSearch(event) {
    event.preventDefault();
    setSuggestions([]);
    navigate(search.trim() ? `/shop?search=${encodeURIComponent(search.trim())}` : '/shop');
  }

  function toggleTheme() {
    if (themePolicy !== 'BOTH') return;
    setThemeMode((current) => current === 'dark' ? 'light' : 'dark');
  }

  return <div
    ref={shellRef}
    className="store-shell"
    data-store-theme={themeMode}
    data-store-template={theme.templateId || 'luxe-editorial'}
    data-theme-policy={themePolicy}
    data-header-sticky={theme.headerSticky === false ? 'false' : 'true'}
    style={themeVars}
  >
    {announcement?.enabled !== false && announcement?.text && <div className="topbar">{announcement.text}{announcement.linkUrl && <Link to={announcement.linkUrl}> {announcement.linkLabel || 'Learn more'}</Link>}</div>}
    <header className={`site-header ${headerScrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-row">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21}/></button>
        <Link to="/" className="brand-mark">{config?.logoUrl ? <img src={config.logoUrl} alt={config.storeName || 'Store'} /> : <span>{config?.storeName || 'Your Store'}</span>}</Link>
        <div className="search-wrap"><form className="search-box" onSubmit={submitSearch}>
          <Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => setTimeout(() => setSuggestions([]), 140)} placeholder={text.searchPlaceholder || 'Search products'} aria-label={text.searchPlaceholder || 'Search products'}/>
        </form>{suggestions.length > 0 && <div className="search-suggestions">{suggestions.map((item) => <Link key={item.id} to={`/product/${item.slug}`} onMouseDown={(e)=>e.preventDefault()} onClick={() => { setSearch(''); setSuggestions([]); }}><div>{item.images?.[0]?.url ? <img src={item.images[0].url} alt=""/> : <span/>}</div><strong>{item.name}</strong></Link>)}</div>}</div>
        <div className="header-actions">
          {themePolicy === 'BOTH' && <button className="header-icon theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}>{themeMode === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}<span className="hide-sm">{themeMode === 'dark' ? 'Light' : 'Dark'}</span></button>}
          <Link className="header-icon" to={user ? '/account' : '/login'}><User size={20}/><span className="hide-sm">{user?.name?.split(' ')[0] || text.accountLabel || 'Account'}</span></Link>
          <Link className="header-icon cart-link" to="/cart"><ShoppingBag size={20}/><span className="hide-sm">{text.cartLabel || 'Cart'}</span>{cartCount > 0 && <b>{cartCount}</b>}</Link>
        </div>
      </div>
      <nav className="main-nav">
        <div className="container nav-scroll">
          {effectiveHeader.map((item) => <NavLink key={item.id} to={item.target || '/'}>{item.label}</NavLink>)}
          {categories.filter((category)=>!category.parentId).slice(0, 6).map((category) => <NavLink key={category.id} to={`/category/${encodeURIComponent(category.slug)}`}>{category.name}</NavLink>)}
        </div>
      </nav>
    </header>

    {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
      <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><strong>{config?.storeName || 'Menu'}</strong><button onClick={() => setMobileOpen(false)}><X/></button></div>
        {themePolicy === 'BOTH' && <button className="mobile-theme-choice" type="button" onClick={toggleTheme}>{themeMode === 'dark' ? <Sun size={18}/> : <Moon size={18}/>} Use {themeMode === 'dark' ? 'light' : 'dark'} mode</button>}
        {[...effectiveHeader, ...categories.filter((category)=>!category.parentId).map((c) => ({ id: `cat-${c.id}`, label: c.name, target: `/category/${c.slug}` }))].map((item) => <Link key={item.id} to={item.target || '/'} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}
      </aside>
    </div>}

    <Outlet context={{ config, categories, themeMode }} />

    <footer className="site-footer">
      <div className="container footer-grid">
        <div><div className="brand-mark footer-brand">{config?.storeName || 'Your Store'}</div><p>{config?.tagline || ''}</p></div>
        <div><strong>{footerMenuRecord?.title || text.footerLinksHeading || 'Links'}</strong>{footerMenu.map((item) => <Link key={item.id} to={item.target || '/'}>{item.label}</Link>)}</div>
        <div><strong>{text.supportHeading || config?.commerceSettings?.supportHeading || 'Support'}</strong>{config?.supportEmail && <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>}{config?.supportPhone && <a href={`tel:${config.supportPhone}`}>{config.supportPhone}</a>}<Link to="/track-order">{text.trackOrderLabel || 'Track order'}</Link></div>
        <div><strong>{config?.storeName || 'Store'}</strong>{config?.socialLinks?.instagram&&<a href={config.socialLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>}{config?.socialLinks?.facebook&&<a href={config.socialLinks.facebook} target="_blank" rel="noreferrer">Facebook</a>}{config?.socialLinks?.youtube&&<a href={config.socialLinks.youtube} target="_blank" rel="noreferrer">YouTube</a>}{config?.socialLinks?.linkedin&&<a href={config.socialLinks.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}</div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} {config?.storeName || 'Store'}</div>
    </footer>
  </div>;
}

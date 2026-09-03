import { useEffect, useState } from 'react';
import { CheckCircle2, Globe2, MapPin, Palette, Search, Store, Truck } from 'lucide-react';
import { get, put } from '../../services/api';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import Loading from '../../components/Loading';
import ImageUploadButton from '../../components/ImageUploadButton';

const WORDING_FIELDS = [
  ['searchPlaceholder', 'Search placeholder'], ['accountLabel', 'Account label'], ['cartLabel', 'Cart label'],
  ['footerLinksHeading', 'Footer links heading'], ['supportHeading', 'Support heading'], ['trackOrderLabel', 'Track order label'],
  ['viewAllLabel', 'View all label'], ['addToCartLabel', 'Add to cart'], ['chooseOptionsLabel', 'Choose options'],
  ['browseProductsLabel', 'Browse products'], ['checkoutLabel', 'Checkout'], ['codLabel', 'Cash on Delivery'],
  ['shopTitle', 'Catalog page title'], ['shippingLabel', 'Shipping label'], ['paymentLabel', 'Payment label'],
  ['placeOrderLabel', 'Place order button'], ['wishlistLabel', 'Wishlist label'], ['ordersLabel', 'Orders label']
];

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [state, setState] = useState({ saving: false, message: '', error: '' });

  useEffect(() => { get('/admin/store-config').then(setConfig).catch((error) => setState((s) => ({ ...s, error: error.message }))); }, []);
  if (!config) return <Loading/>;

  const theme = config.theme || {};
  const modePolicy = theme.modePolicy || (theme.mode === 'dark' ? 'DARK_ONLY' : 'BOTH');
  const seo = config.seoDefaults || {};
  const commerce = config.commerceSettings || {};
  const announcement = config.announcement || {};
  const social = config.socialLinks || {};
  const text = config.storefrontText || {};
  const address = config.businessAddress || {};

  function change(key, value) { setConfig((current) => ({ ...current, [key]: value })); }
  function nested(key, name, value) { setConfig((current) => ({ ...current, [key]: { ...(current[key] || {}), [name]: value } })); }

  async function save(event) {
    event.preventDefault();
    setState({ saving: true, message: '', error: '' });
    try {
      const data = await put('/admin/store-config', config);
      setConfig((current) => ({ ...current, ...data }));
      setState({ saving: false, message: 'Settings saved.', error: '' });
    } catch (error) {
      setState({ saving: false, message: '', error: error.message });
    }
  }

  return <form onSubmit={save}>
    <AdminPageHead eyebrow="Store settings" title="Make it your store" description="Change branding, language-facing labels, layout, support, SEO and checkout rules without touching code." action={<button className="button primary" disabled={state.saving}>{state.saving ? 'Saving…' : 'Save changes'}</button>}/>
    <HelpNote>The storefront now supports a premium light theme, a premium dark theme, or both. When both are enabled, customers get a theme switch in the header and their choice is remembered on that device. Smooth scrolling and reveal motion can also be controlled here.</HelpNote>

    <div className="settings-grid">
      <section className="admin-panel settings-card">
        <div className="settings-title"><Store/><div><h2>Brand identity</h2><p>What customers see across the storefront.</p></div></div>
        <label><span>Store name</span><input value={config.storeName || ''} onChange={(e) => change('storeName', e.target.value)}/></label>
        <label><span>Tagline</span><input value={config.tagline || ''} onChange={(e) => change('tagline', e.target.value)}/></label>
        <div className="two-fields">
          <label><span>Logo</span><input value={config.logoUrl || ''} onChange={(e) => change('logoUrl', e.target.value)} placeholder="Upload or paste URL"/><ImageUploadButton label="Upload logo" onUploaded={(url) => change('logoUrl', url)}/></label>
          <label><span>Favicon</span><input value={config.faviconUrl || ''} onChange={(e) => change('faviconUrl', e.target.value)} placeholder="Upload or paste URL"/><ImageUploadButton label="Upload favicon" onUploaded={(url) => change('faviconUrl', url)}/></label>
        </div>
        <div className="two-fields"><label><span>Support email</span><input type="email" value={config.supportEmail || ''} onChange={(e) => change('supportEmail', e.target.value)}/></label><label><span>Support phone</span><input value={config.supportPhone || ''} onChange={(e) => change('supportPhone', e.target.value)}/></label></div>
      </section>

      <section className="admin-panel settings-card">
        <div className="settings-title"><Palette/><div><h2>Theme, mode & motion</h2><p>Give every store a premium visual system without locking the customer into black or white.</p></div></div>
        <div className="two-fields">
          <label><span>Available storefront modes</span><select value={modePolicy} onChange={(e) => nested('theme','modePolicy',e.target.value)}><option value="BOTH">Light + dark (customer can switch)</option><option value="LIGHT_ONLY">Light only</option><option value="DARK_ONLY">Dark only</option></select><small className="field-help">If both are enabled, a sun/moon switch appears in the storefront header.</small></label>
          <label><span>Default mode when both are enabled</span><select value={theme.defaultMode || 'light'} onChange={(e) => nested('theme','defaultMode',e.target.value)} disabled={modePolicy !== 'BOTH'}><option value="light">Light first</option><option value="dark">Dark first</option></select></label>
        </div>
        <div className="theme-palette-block"><div className="palette-heading"><strong>Light palette</strong><small>Clean premium storefront for daylight and general retail.</small></div><div className="color-grid">{[['primary','Accent'],['background','Background'],['surface','Cards'],['ink','Text'],['muted','Muted text'],['border','Borders']].map(([key,label]) => <label className="color-field" key={key}><span>{label}</span><div><input type="color" value={theme[key] || (key==='primary'?'#176b5b':'#ffffff')} onChange={(e) => nested('theme', key, e.target.value)}/><input value={theme[key] || ''} onChange={(e) => nested('theme', key, e.target.value)}/></div></label>)}</div></div>
        <div className="theme-palette-block dark-palette"><div className="palette-heading"><strong>Dark palette</strong><small>Premium night mode inspired by fashion-grade storefronts.</small></div><div className="color-grid">{[['darkBackground','Background'],['darkSurface','Cards'],['darkInk','Text'],['darkMuted','Muted text'],['darkBorder','Borders'],['darkSoft','Soft surfaces']].map(([key,label]) => <label className="color-field" key={key}><span>{label}</span><div><input type="color" value={theme[key] || ({darkBackground:'#090c0b',darkSurface:'#111513',darkInk:'#f4f7f5',darkMuted:'#9ba5a0',darkBorder:'#252c28',darkSoft:'#171c19'}[key])} onChange={(e) => nested('theme', key, e.target.value)}/><input value={theme[key] || ''} onChange={(e) => nested('theme', key, e.target.value)}/></div></label>)}</div></div>
        <div className="two-fields">
          <label><span>Font style</span><select value={theme.fontFamily || 'SYSTEM'} onChange={(e) => nested('theme','fontFamily',e.target.value)}><option value="SYSTEM">Clean system</option><option value="MODERN">Modern</option><option value="CLASSIC">Classic serif</option><option value="ROUNDED">Friendly rounded</option></select></label>
          <label><span>Product image shape</span><select value={theme.productImageRatio || '1 / 1'} onChange={(e) => nested('theme','productImageRatio',e.target.value)}><option value="1 / 1">Square 1:1</option><option value="4 / 5">Portrait 4:5</option><option value="3 / 4">Portrait 3:4</option><option value="16 / 11">Landscape 16:11</option></select></label>
        </div>
        <div className="three-fields"><label><span>Content width</span><input type="number" min="960" max="1600" value={theme.container ?? 1240} onChange={(e) => nested('theme','container',Number(e.target.value))}/></label><label><span>Section spacing</span><input type="number" min="24" max="110" value={theme.sectionSpacing ?? 58} onChange={(e) => nested('theme','sectionSpacing',Number(e.target.value))}/></label><label><span>Card radius</span><input type="number" min="0" max="40" value={theme.radius ?? 16} onChange={(e) => nested('theme','radius',Number(e.target.value))}/></label></div>
        <div className="three-fields"><label><span>Button radius</span><input type="number" min="0" max="40" value={theme.buttonRadius ?? 11} onChange={(e) => nested('theme','buttonRadius',Number(e.target.value))}/></label><label><span>Header height</span><input type="number" min="56" max="90" value={theme.headerHeight ?? 68} onChange={(e) => nested('theme','headerHeight',Number(e.target.value))}/></label><label className="check-card compact"><input type="checkbox" checked={theme.headerSticky !== false} onChange={(e) => nested('theme','headerSticky',e.target.checked)}/><span><strong>Sticky header</strong><small>Keep navigation visible while scrolling.</small></span></label></div>
        <div className="two-fields motion-options"><label className="check-card compact"><input type="checkbox" checked={theme.motionEnabled !== false} onChange={(e) => nested('theme','motionEnabled',e.target.checked)}/><span><strong>Premium reveal motion</strong><small>Fade-and-rise sections, cards and product content as customers browse.</small></span></label><label className="check-card compact"><input type="checkbox" checked={theme.smoothScroll !== false} onChange={(e) => nested('theme','smoothScroll',e.target.checked)} disabled={theme.motionEnabled === false}/><span><strong>Smooth scrolling</strong><small>Uses momentum scrolling similar to premium fashion storefronts.</small></span></label></div>
        <div className="dual-theme-preview">
          <div className="theme-preview" style={{background:theme.background || '#fafaf7',color:theme.ink || '#1c2320',borderColor:theme.border || '#e7eae5',borderRadius:`${theme.radius ?? 16}px`,fontFamily:theme.fontFamily==='CLASSIC'?'Georgia, serif':undefined}}><span style={{color:theme.primary}}>Light preview</span><strong>Your premium storefront</strong><p style={{color:theme.muted}}>Bright, clean and product-focused.</p><button type="button" style={{background:theme.primary,borderRadius:`${theme.buttonRadius ?? 11}px`}}>Primary action</button></div>
          <div className="theme-preview" style={{background:theme.darkBackground || '#090c0b',color:theme.darkInk || '#f4f7f5',borderColor:theme.darkBorder || '#252c28',borderRadius:`${theme.radius ?? 16}px`,fontFamily:theme.fontFamily==='CLASSIC'?'Georgia, serif':undefined}}><span style={{color:theme.primary}}>Dark preview</span><strong>Your premium storefront</strong><p style={{color:theme.darkMuted || '#9ba5a0'}}>Editorial, immersive and elegant.</p><button type="button" style={{background:theme.primary,borderRadius:`${theme.buttonRadius ?? 11}px`}}>Primary action</button></div>
        </div>
      </section>

      <section className="admin-panel settings-card">
        <div className="settings-title"><Search/><div><h2>SEO defaults</h2><p>Fallback metadata when content has no custom SEO fields.</p></div></div>
        <label><span>Default site title</span><input value={seo.title || ''} onChange={(e) => nested('seoDefaults','title',e.target.value)}/></label>
        <label><span>Title template</span><input value={seo.titleTemplate || ''} onChange={(e) => nested('seoDefaults','titleTemplate',e.target.value)} placeholder="%s | Store Name"/></label>
        <label><span>Default meta description</span><textarea rows="3" value={seo.description || ''} onChange={(e) => nested('seoDefaults','description',e.target.value)}/></label>
        <label><span>Default social share image</span><div className="inline-field"><input value={seo.ogImageUrl || ''} onChange={(e) => nested('seoDefaults','ogImageUrl',e.target.value)} placeholder="Upload or paste URL"/><ImageUploadButton onUploaded={(url) => nested('seoDefaults','ogImageUrl',url)}/></div></label>
      </section>

      <section className="admin-panel settings-card">
        <div className="settings-title"><Truck/><div><h2>Checkout rules</h2><p>Fallback delivery, tax and currency settings.</p></div></div>
        <div className="two-fields"><label><span>Currency</span><input value={config.currency || 'INR'} maxLength="3" onChange={(e) => change('currency',e.target.value.toUpperCase())} placeholder="INR, USD, EUR…"/></label><label><span>Store locale</span><input value={config.locale || 'en-IN'} onChange={(e) => change('locale',e.target.value)} placeholder="en-IN"/></label></div>
        <label><span>Default checkout country</span><input value={commerce.defaultCountry || ''} onChange={(e) => nested('commerceSettings','defaultCountry',e.target.value)} placeholder="India, United States, Singapore…"/></label>
        <div className="three-fields"><label><span>Free shipping above</span><input type="number" min="0" value={commerce.freeShippingThreshold ?? 999} onChange={(e) => nested('commerceSettings','freeShippingThreshold',Number(e.target.value))}/></label><label><span>Flat shipping fallback</span><input type="number" min="0" value={commerce.shippingFee ?? 80} onChange={(e) => nested('commerceSettings','shippingFee',Number(e.target.value))}/></label><label><span>Tax %</span><input type="number" min="0" value={commerce.taxPercent ?? 0} onChange={(e) => nested('commerceSettings','taxPercent',Number(e.target.value))}/></label></div>
        <label className="check-card compact"><input type="checkbox" checked={commerce.codEnabled !== false} onChange={(e) => nested('commerceSettings','codEnabled',e.target.checked)}/><span><strong>Allow Cash on Delivery</strong><small>Online gateways are managed from Integrations.</small></span></label>
      </section>

      <section className="admin-panel settings-card">
        <div className="settings-title"><MapPin/><div><h2>Business details</h2><p>Reusable business/contact information for policies, invoices and integrations.</p></div></div>
        <div className="two-fields"><label><span>Address line 1</span><input value={address.line1 || ''} onChange={(e) => nested('businessAddress','line1',e.target.value)}/></label><label><span>Address line 2</span><input value={address.line2 || ''} onChange={(e) => nested('businessAddress','line2',e.target.value)}/></label></div>
        <div className="three-fields"><label><span>City</span><input value={address.city || ''} onChange={(e) => nested('businessAddress','city',e.target.value)}/></label><label><span>State/region</span><input value={address.state || ''} onChange={(e) => nested('businessAddress','state',e.target.value)}/></label><label><span>Postal code</span><input value={address.postalCode || ''} onChange={(e) => nested('businessAddress','postalCode',e.target.value)}/></label></div>
        <label><span>Country</span><input value={address.country || ''} onChange={(e) => nested('businessAddress','country',e.target.value)}/></label>
      </section>

      <section className="admin-panel settings-card">
        <div className="settings-title"><Globe2/><div><h2>Social & support links</h2><p>Leave any network blank to hide it from the footer.</p></div></div>
        <label><span>Support column heading</span><input value={commerce.supportHeading || ''} onChange={(e) => nested('commerceSettings','supportHeading',e.target.value)} placeholder="Support"/></label>
        <div className="two-fields"><label><span>Instagram URL</span><input value={social.instagram || ''} onChange={(e) => nested('socialLinks','instagram',e.target.value)}/></label><label><span>Facebook URL</span><input value={social.facebook || ''} onChange={(e) => nested('socialLinks','facebook',e.target.value)}/></label><label><span>YouTube URL</span><input value={social.youtube || ''} onChange={(e) => nested('socialLinks','youtube',e.target.value)}/></label><label><span>LinkedIn URL</span><input value={social.linkedin || ''} onChange={(e) => nested('socialLinks','linkedin',e.target.value)}/></label></div>
      </section>

      <section className="admin-panel settings-card span-two">
        <div className="settings-title"><Store/><div><h2>Storefront wording</h2><p>Rename or translate common customer-facing labels. Product/category names remain fully content-driven.</p></div></div>
        <div className="three-fields">{WORDING_FIELDS.map(([key,label]) => <label key={key}><span>{label}</span><input value={text[key] || ''} onChange={(e) => nested('storefrontText',key,e.target.value)} placeholder={label}/></label>)}</div>
      </section>

      <section className="admin-panel settings-card span-two">
        <div className="settings-title"><CheckCircle2/><div><h2>Announcement bar</h2><p>Use this for shipping messages, launches or offers.</p></div></div>
        <label className="check-card"><input type="checkbox" checked={announcement.enabled !== false} onChange={(e) => nested('announcement','enabled',e.target.checked)}/><span><strong>Show announcement</strong><small>Visible above the main header.</small></span></label>
        <div className="three-fields"><label><span>Message</span><input value={announcement.text || ''} onChange={(e) => nested('announcement','text',e.target.value)}/></label><label><span>Optional link label</span><input value={announcement.linkLabel || ''} onChange={(e) => nested('announcement','linkLabel',e.target.value)}/></label><label><span>Optional link</span><input value={announcement.linkUrl || ''} onChange={(e) => nested('announcement','linkUrl',e.target.value)} placeholder="/shop"/></label></div>
      </section>
    </div>
    {state.error && <div className="alert error fixed-toast">{state.error}</div>}
    {state.message && <div className="alert success fixed-toast">{state.message}</div>}
  </form>;
}

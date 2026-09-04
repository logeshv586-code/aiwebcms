import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Edit3, Eye, EyeOff, GripVertical, LayoutTemplate,
  Monitor, Plus, RefreshCw, Smartphone, Sparkles, Trash2
} from 'lucide-react';
import { get, post, put, remove } from '../../services/api';
import { AdminPageHead, HelpNote } from '../AdminLayout';
import ImageUploadButton from '../../components/ImageUploadButton';
import { DEFAULT_LAYOUT, SECTION_TYPES, STORE_TEMPLATES } from '../storeTemplates';

const blank = { type: 'TEXT', title: '', subtitle: '', sortOrder: 0, isActive: true, content: { layout: { ...DEFAULT_LAYOUT } } };
const productTypes = ['PRODUCT_GRID', 'PRODUCT_CAROUSEL'];
const limitTypes = ['CATEGORY_GRID', 'COLLECTION_GRID', 'BRAND_GRID', 'PRODUCT_GRID', 'PRODUCT_CAROUSEL', 'BLOG_GRID', 'FAQ'];
const simpleMediaTypes = ['HERO', 'BANNER', 'TEXT', 'IMAGE_TEXT'];

function labelFor(type) {
  return SECTION_TYPES.find(([value]) => value === type)?.[1] || type;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function Homepage() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState({ categories: [], collections: [], brands: [] });
  const [config, setConfig] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [dragId, setDragId] = useState(null);
  const [busyTemplate, setBusyTemplate] = useState('');

  async function load() {
    const [sections, store] = await Promise.all([get('/admin/home-sections'), get('/admin/store-config')]);
    setItems((sections || []).sort((a, b) => a.sortOrder - b.sortOrder));
    setConfig(store);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    Promise.all([get('/storefront/categories'), get('/storefront/collections'), get('/storefront/brands')])
      .then(([categories, collections, brands]) => setCatalog({ categories, collections, brands }))
      .catch(() => {});
  }, []);

  const selectedTemplate = useMemo(
    () => STORE_TEMPLATES.find((template) => template.id === config?.theme?.templateId) || STORE_TEMPLATES[0],
    [config?.theme?.templateId]
  );

  function start(item = null) {
    const nextContent = item?.content || {};
    setEditing(item);
    setForm(item ? {
      ...blank,
      ...item,
      content: { ...nextContent, layout: { ...DEFAULT_LAYOUT, ...(nextContent.layout || {}) } }
    } : {
      ...blank,
      content: { layout: { ...DEFAULT_LAYOUT } },
      sortOrder: items.length + 1
    });
    setOpen(true);
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    try {
      editing ? await put(`/admin/home-sections/${editing.id}`, form) : await post('/admin/home-sections', form);
      setOpen(false);
      await load();
      setPreviewKey((key) => key + 1);
    } catch (e) {
      setError(e.message);
    }
  }

  async function update(item, patch) {
    await put(`/admin/home-sections/${item.id}`, { ...item, ...patch });
    await load();
    setPreviewKey((key) => key + 1);
  }

  async function move(item, direction) {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((current) => current.id === item.id);
    const target = sorted[index + direction];
    if (!target) return;
    await Promise.all([
      put(`/admin/home-sections/${item.id}`, { ...item, sortOrder: target.sortOrder }),
      put(`/admin/home-sections/${target.id}`, { ...target, sortOrder: item.sortOrder })
    ]);
    await load();
    setPreviewKey((key) => key + 1);
  }

  async function dropOn(targetId) {
    if (!dragId || dragId === targetId) return setDragId(null);
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const from = sorted.findIndex((item) => item.id === dragId);
    const to = sorted.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return setDragId(null);
    const [moved] = sorted.splice(from, 1);
    sorted.splice(to, 0, moved);
    setItems(sorted.map((item, index) => ({ ...item, sortOrder: index + 1 })));
    setDragId(null);
    await Promise.all(sorted.map((item, index) => put(`/admin/home-sections/${item.id}`, { ...item, sortOrder: index + 1 })));
    await load();
    setPreviewKey((key) => key + 1);
  }

  async function del(item) {
    if (!window.confirm(`Remove section “${item.title || item.type}”?`)) return;
    await remove(`/admin/home-sections/${item.id}`);
    await load();
    setPreviewKey((key) => key + 1);
  }

  async function applyTemplate(template, fullLayout = false) {
    if (!config) return;
    if (fullLayout && items.length && !window.confirm(`Use the complete ${template.name} layout? This replaces the current homepage sections, but products, categories, orders and store data stay unchanged.`)) return;
    setBusyTemplate(template.id + (fullLayout ? '-full' : '-style'));
    setError('');
    try {
      const nextConfig = { ...config, theme: { ...(config.theme || {}), ...template.theme } };
      const saved = await put('/admin/store-config', nextConfig);
      setConfig((current) => ({ ...current, ...saved, theme: nextConfig.theme }));
      if (fullLayout) {
        for (const item of items) await remove(`/admin/home-sections/${item.id}`);
        for (let index = 0; index < template.sections.length; index += 1) {
          const section = clone(template.sections[index]);
          await post('/admin/home-sections', { ...section, sortOrder: index + 1 });
        }
      }
      await load();
      setPreviewKey((key) => key + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyTemplate('');
    }
  }

  function content(key, value) {
    setForm((current) => ({ ...current, content: { ...(current.content || {}), [key]: value } }));
  }

  function layout(key, value) {
    setForm((current) => ({
      ...current,
      content: { ...(current.content || {}), layout: { ...DEFAULT_LAYOUT, ...(current.content?.layout || {}), [key]: value } }
    }));
  }

  function updateArray(key, index, patch) {
    const list = [...(form.content?.[key] || [])];
    list[index] = { ...(list[index] || {}), ...patch };
    content(key, list);
  }

  function removeArrayItem(key, index) {
    content(key, (form.content?.[key] || []).filter((_, itemIndex) => itemIndex !== index));
  }

  const l = { ...DEFAULT_LAYOUT, ...(form.content?.layout || {}) };

  return <>
    <AdminPageHead
      eyebrow="No-code storefront"
      title="Store Designer"
      description="Pick a complete storefront style, drag sections into place, edit the content in plain language and preview the real store before publishing."
      action={<button className="button primary" onClick={() => start()}><Plus size={17}/> Add section</button>}
    />

    <HelpNote title="Built for non-technical store owners">
      Applying a design changes the visual system only. “Use full layout” installs that template’s recommended homepage sections. Your products, customers, orders, payments and catalog data are not deleted.
    </HelpNote>

    {error && <div className="alert error designer-alert">{error}</div>}

    <section className="designer-template-panel">
      <div className="designer-panel-head">
        <div><span>1</span><div><strong>Choose a storefront style</strong><small>Five complete e-commerce directions. You can change colors and sections after applying.</small></div></div>
        <div className="current-template"><Sparkles size={16}/> Current: {selectedTemplate.name}</div>
      </div>
      <div className="template-grid">
        {STORE_TEMPLATES.map((template) => {
          const active = selectedTemplate.id === template.id;
          return <article className={`template-card ${active ? 'active' : ''}`} key={template.id}>
            <div className="template-mini-preview" data-template-preview={template.id}>
              <div className="template-preview-bar"/>
              <div className="template-preview-hero"><i/><div><b/><b/><em/></div></div>
              <div className="template-preview-products"><i/><i/><i/><i/></div>
              <div className="template-swatches">{template.preview.map((color) => <span key={color} style={{ background: color }}/>)}</div>
            </div>
            <div className="template-card-copy">
              <div><strong>{template.name}</strong>{active && <span className="template-active-label">Applied</span>}</div>
              <small>{template.category}</small>
              <p>{template.description}</p>
            </div>
            <div className="template-actions">
              <button className="button secondary small" disabled={Boolean(busyTemplate)} onClick={() => applyTemplate(template, false)}>{busyTemplate === `${template.id}-style` ? 'Applying…' : 'Apply design'}</button>
              <button className="button primary small" disabled={Boolean(busyTemplate)} onClick={() => applyTemplate(template, true)}><LayoutTemplate size={15}/>{busyTemplate === `${template.id}-full` ? 'Installing…' : 'Use full layout'}</button>
            </div>
          </article>;
        })}
      </div>
    </section>

    <div className="designer-workbench">
      <section className="designer-layers">
        <div className="designer-panel-head compact">
          <div><span>2</span><div><strong>Arrange your homepage</strong><small>Drag any block to move it. Tap Edit to change its content.</small></div></div>
        </div>
        <div className="section-list designer-section-list">
          {items.map((item, index) => <div
            className={`section-row-card designer-layer ${dragId === item.id ? 'dragging' : ''}`}
            key={item.id}
            draggable
            onDragStart={() => setDragId(item.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(item.id)}
          >
            <div className="drag-handle" title="Drag to reorder"><GripVertical size={18}/></div>
            <div className="section-order">
              <button disabled={index === 0} onClick={() => move(item, -1)} aria-label="Move up"><ArrowUp size={14}/></button>
              <span>{index + 1}</span>
              <button disabled={index === items.length - 1} onClick={() => move(item, 1)} aria-label="Move down"><ArrowDown size={14}/></button>
            </div>
            <div className="section-icon">{item.type.slice(0, 1)}</div>
            <div className="grow"><strong>{item.title || labelFor(item.type)}</strong><small>{labelFor(item.type)} · {item.content?.layout?.width || 'BOXED'}{item.subtitle ? ` · ${item.subtitle}` : ''}</small></div>
            <button className="visibility" onClick={() => update(item, { isActive: !item.isActive })}>{item.isActive ? <><Eye size={15}/> Visible</> : <><EyeOff size={15}/> Hidden</>}</button>
            <button className="icon-button" onClick={() => start(item)} aria-label="Edit section"><Edit3 size={16}/></button>
            <button className="icon-button danger" onClick={() => del(item)} aria-label="Delete section"><Trash2 size={16}/></button>
          </div>)}
          {!items.length && <div className="designer-empty"><LayoutTemplate/><strong>No homepage sections yet</strong><p>Choose “Use full layout” on any template or add your first section.</p></div>}
        </div>
      </section>

      <aside className="designer-preview-card">
        <div className="designer-preview-head">
          <div><span>3</span><div><strong>Live storefront preview</strong><small>Preview the real homepage using saved CMS content.</small></div></div>
          <div className="preview-controls">
            <button className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')} title="Desktop preview"><Monitor size={16}/></button>
            <button className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')} title="Mobile preview"><Smartphone size={16}/></button>
            <button onClick={() => setPreviewKey((key) => key + 1)} title="Refresh preview"><RefreshCw size={16}/></button>
          </div>
        </div>
        <div className={`designer-preview-stage ${previewMode}`}>
          <iframe key={previewKey} title="Storefront preview" src="/"/>
        </div>
      </aside>
    </div>

    {open && <div className="modal-backdrop" onMouseDown={(event) => event.currentTarget === event.target && setOpen(false)}>
      <form className="modal-card wide designer-modal" onSubmit={save}>
        <div className="modal-head"><div><span className="eyebrow">Store section</span><h2>{editing ? 'Edit section' : 'Add section'}</h2></div><button type="button" onClick={() => setOpen(false)}>×</button></div>

        <div className="designer-editor-grid">
          <label><span>Section type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{SECTION_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Heading</span><input value={form.title || ''} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Example: New arrivals"/></label>
        </div>
        <label><span>Supporting text</span><textarea rows="2" value={form.subtitle || ''} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="Optional short supporting message"/></label>

        {simpleMediaTypes.includes(form.type) && <>
          <div className="two-fields">
            <label><span>Small label</span><input value={form.content?.eyebrow || ''} onChange={(event) => content('eyebrow', event.target.value)} placeholder="Optional"/></label>
            {form.type === 'IMAGE_TEXT' && <label><span>Image position</span><select value={form.content?.imagePosition || 'left'} onChange={(event) => content('imagePosition', event.target.value)}><option value="left">Image left</option><option value="right">Image right</option></select></label>}
          </div>
          <div className="two-fields"><label><span>Button text</span><input value={form.content?.ctaLabel || ''} onChange={(event) => content('ctaLabel', event.target.value)}/></label><label><span>Button link</span><input value={form.content?.ctaUrl || ''} onChange={(event) => content('ctaUrl', event.target.value)} placeholder="/shop or /category/name"/></label></div>
          <label><span>Section image</span><div className="inline-field"><input value={form.content?.imageUrl || ''} onChange={(event) => content('imageUrl', event.target.value)} placeholder="Upload or paste image URL"/><ImageUploadButton onUploaded={(url) => content('imageUrl', url)}/></div></label>
          <label><span>Image description for SEO/accessibility</span><input value={form.content?.imageAlt || ''} onChange={(event) => content('imageAlt', event.target.value)} placeholder="Describe the image"/></label>
        </>}

        {form.type === 'HERO_SLIDER' && <div className="builder-array-block">
          <div className="builder-array-head"><div><strong>Hero slides</strong><small>Each slide can have different wording, image and destination.</small></div><button type="button" className="button secondary small" onClick={() => content('slides', [...(form.content?.slides || []), { title: '', text: '', ctaLabel: 'Shop now', ctaUrl: '/shop', imageUrl: '' }])}>+ Add slide</button></div>
          {(form.content?.slides || []).map((slide, index) => <div className="builder-item-card" key={index}>
            <div className="builder-item-title"><strong>Slide {index + 1}</strong><button type="button" onClick={() => removeArrayItem('slides', index)}>Remove</button></div>
            <div className="two-fields"><label><span>Headline</span><input value={slide.title || ''} onChange={(event) => updateArray('slides', index, { title: event.target.value })}/></label><label><span>Button text</span><input value={slide.ctaLabel || ''} onChange={(event) => updateArray('slides', index, { ctaLabel: event.target.value })}/></label></div>
            <label><span>Supporting text</span><textarea rows="2" value={slide.text || ''} onChange={(event) => updateArray('slides', index, { text: event.target.value })}/></label>
            <div className="two-fields"><label><span>Button link</span><input value={slide.ctaUrl || ''} onChange={(event) => updateArray('slides', index, { ctaUrl: event.target.value })}/></label><label><span>Image</span><div className="inline-field"><input value={slide.imageUrl || ''} onChange={(event) => updateArray('slides', index, { imageUrl: event.target.value })}/><ImageUploadButton onUploaded={(url) => updateArray('slides', index, { imageUrl: url })}/></div></label></div>
          </div>)}
          <label><span>Automatic slide interval (milliseconds)</span><input type="number" min="2500" max="12000" step="100" value={form.content?.interval || 4800} onChange={(event) => content('interval', Number(event.target.value))}/></label>
        </div>}

        {form.type === 'OFFER_SLIDER' && <SimpleCardsEditor
          title="Offer cards"
          help="Short, swipeable offer cards. Perfect for delivery messages, deals and store benefits."
          items={form.content?.items || []}
          onAdd={() => content('items', [...(form.content?.items || []), { title: '', text: '', link: '/shop' }])}
          onChange={(index, patch) => updateArray('items', index, patch)}
          onRemove={(index) => removeArrayItem('items', index)}
          fields={['title', 'text', 'link']}
        />}

        {form.type === 'PROMO_GRID' && <SimpleCardsEditor
          title="Promo cards"
          help="Use two or three campaign cards with an optional image and destination."
          items={form.content?.items || []}
          onAdd={() => content('items', [...(form.content?.items || []), { title: '', text: '', imageUrl: '', link: '/shop' }])}
          onChange={(index, patch) => updateArray('items', index, patch)}
          onRemove={(index) => removeArrayItem('items', index)}
          fields={['title', 'text', 'imageUrl', 'link']}
        />}

        {form.type === 'MARQUEE' && <div className="builder-array-block">
          <div className="builder-array-head"><div><strong>Scrolling messages</strong><small>Short phrases repeat smoothly across the screen.</small></div><button type="button" className="button secondary small" onClick={() => content('items', [...(form.content?.items || []), ''])}>+ Add message</button></div>
          {(form.content?.items || []).map((message, index) => <div className="inline-card" key={index}><input value={message} placeholder="Example: Free delivery over ₹999" onChange={(event) => { const next = [...(form.content?.items || [])]; next[index] = event.target.value; content('items', next); }}/><button type="button" onClick={() => removeArrayItem('items', index)}>×</button></div>)}
          <label><span>Scroll speed</span><input type="number" min="12" max="80" value={form.content?.speed || 32} onChange={(event) => content('speed', Number(event.target.value))}/></label>
        </div>}

        {limitTypes.includes(form.type) && <label><span>Maximum items</span><input type="number" min="1" max="48" value={form.content?.limit || 8} onChange={(event) => content('limit', Number(event.target.value))}/></label>}

        {productTypes.includes(form.type) && <>
          <label><span>Product source</span><select value={form.content?.source || 'FEATURED'} onChange={(event) => content('source', event.target.value)}><option value="FEATURED">Featured products</option><option value="LATEST">Newest products</option><option value="CATEGORY">A category</option><option value="COLLECTION">A collection</option><option value="BRAND">A brand</option></select></label>
          {form.content?.source === 'CATEGORY' && <SourceSelect label="Category" list={catalog.categories} value={form.content?.sourceValue || ''} onChange={(value) => content('sourceValue', value)}/>} 
          {form.content?.source === 'COLLECTION' && <SourceSelect label="Collection" list={catalog.collections} value={form.content?.sourceValue || ''} onChange={(value) => content('sourceValue', value)}/>} 
          {form.content?.source === 'BRAND' && <SourceSelect label="Brand" list={catalog.brands} value={form.content?.sourceValue || ''} onChange={(value) => content('sourceValue', value)}/>} 
        </>}

        {form.type === 'TRUST' && <SimpleCardsEditor
          title="Service cards"
          help="Explain delivery, support, payment, returns or other trust points."
          items={form.content?.items || []}
          onAdd={() => content('items', [...(form.content?.items || []), { title: '', text: '' }])}
          onChange={(index, patch) => updateArray('items', index, patch)}
          onRemove={(index) => removeArrayItem('items', index)}
          fields={['title', 'text']}
        />}

        <div className="builder-divider"><strong>Layout & appearance</strong><small>Plain-language controls for this section on desktop and mobile.</small></div>
        <div className="three-fields">
          <label><span>Section width</span><select value={l.width} onChange={(event) => layout('width', event.target.value)}><option value="BOXED">Normal page width</option><option value="FULL">Full browser width</option><option value="NARROW">Narrow reading width</option></select></label>
          <label><span>Text alignment</span><select value={l.textAlign} onChange={(event) => layout('textAlign', event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <label><span>Image fit</span><select value={l.imageFit} onChange={(event) => layout('imageFit', event.target.value)}><option value="cover">Fill area</option><option value="contain">Show full image</option></select></label>
        </div>
        <div className="three-fields"><label><span>Top & bottom space</span><input type="number" min="0" max="180" value={l.paddingY} onChange={(event) => layout('paddingY', Number(event.target.value))}/></label><label><span>Corner roundness</span><input type="number" min="0" max="60" value={l.radius} onChange={(event) => layout('radius', Number(event.target.value))}/></label><label><span>Gap between items</span><input type="number" min="0" max="60" value={l.gap} onChange={(event) => layout('gap', Number(event.target.value))}/></label></div>
        <div className="three-fields"><label><span>Desktop minimum height</span><input type="number" min="0" max="1000" value={l.desktopHeight} onChange={(event) => layout('desktopHeight', Number(event.target.value))}/></label><label><span>Mobile minimum height</span><input type="number" min="0" max="1000" value={l.mobileHeight} onChange={(event) => layout('mobileHeight', Number(event.target.value))}/></label><label><span>Desktop columns</span><input type="number" min="1" max="6" value={l.columns} onChange={(event) => layout('columns', Number(event.target.value))}/></label></div>
        <div className="three-fields"><label><span>Mobile columns</span><input type="number" min="1" max="2" value={l.mobileColumns} onChange={(event) => layout('mobileColumns', Number(event.target.value))}/></label><label><span>Section background</span><div className="color-input"><input type="color" value={l.background || '#ffffff'} onChange={(event) => layout('background', event.target.value)}/><input value={l.background || ''} placeholder="Use store default" onChange={(event) => layout('background', event.target.value)}/></div></label><label><span>Section text color</span><div className="color-input"><input type="color" value={l.textColor || '#111111'} onChange={(event) => layout('textColor', event.target.value)}/><input value={l.textColor || ''} placeholder="Use store default" onChange={(event) => layout('textColor', event.target.value)}/></div></label></div>

        <div className="two-fields"><label><span>Display order</span><input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}/></label><label className="check-card"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })}/><span><strong>Visible</strong><small>Show this section on the live store</small></span></label></div>
        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button><button className="button primary">Save section</button></div>
      </form>
    </div>}
  </>;
}

function SourceSelect({ label, list, value, onChange }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose {label.toLowerCase()}</option>{list.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>;
}

function SimpleCardsEditor({ title, help, items, onAdd, onChange, onRemove, fields }) {
  return <div className="builder-array-block">
    <div className="builder-array-head"><div><strong>{title}</strong><small>{help}</small></div><button type="button" className="button secondary small" onClick={onAdd}>+ Add card</button></div>
    {items.map((item, index) => <div className="builder-item-card" key={index}>
      <div className="builder-item-title"><strong>Card {index + 1}</strong><button type="button" onClick={() => onRemove(index)}>Remove</button></div>
      {fields.includes('title') && <label><span>Title</span><input value={item.title || ''} onChange={(event) => onChange(index, { title: event.target.value })}/></label>}
      {fields.includes('text') && <label><span>Short text</span><textarea rows="2" value={item.text || ''} onChange={(event) => onChange(index, { text: event.target.value })}/></label>}
      {fields.includes('imageUrl') && <label><span>Image</span><div className="inline-field"><input value={item.imageUrl || ''} onChange={(event) => onChange(index, { imageUrl: event.target.value })}/><ImageUploadButton onUploaded={(url) => onChange(index, { imageUrl: url })}/></div></label>}
      {fields.includes('link') && <label><span>Link</span><input value={item.link || ''} onChange={(event) => onChange(index, { link: event.target.value })} placeholder="/shop"/></label>}
    </div>)}
  </div>;
}

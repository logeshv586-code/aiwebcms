import { useEffect } from 'react';

function meta(name, content, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let node = document.head.querySelector(selector);
  if (!content) { node?.remove(); return; }
  if (!node) { node = document.createElement('meta'); node.setAttribute(property ? 'property' : 'name', name); document.head.appendChild(node); }
  node.setAttribute('content', content);
}

export function absoluteUrl(path = '') {
  if (!path) return typeof window !== 'undefined' ? window.location.origin : '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function breadcrumbSchema(items = []) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })) };
}

export function storeSchema(config = {}) {
  const org = { '@type': 'Organization', '@id': `${absoluteUrl('/') }#organization`, name: config.storeName || 'Online store', url: absoluteUrl('/'), logo: config.logoUrl ? absoluteUrl(config.logoUrl) : undefined, email: config.supportEmail || undefined, telephone: config.supportPhone || undefined, sameAs: Object.values(config.socialLinks || {}).filter(Boolean) };
  const site = { '@type': 'WebSite', '@id': `${absoluteUrl('/') }#website`, url: absoluteUrl('/'), name: config.storeName || 'Online store', publisher: { '@id': org['@id'] }, potentialAction: { '@type': 'SearchAction', target: `${absoluteUrl('/shop')}?search={search_term_string}`, 'query-input': 'required name=search_term_string' } };
  return { '@context': 'https://schema.org', '@graph': [org, site] };
}

export function useSeo({ title, description, canonical, image, noIndex = false, schema } = {}) {
  useEffect(() => {
    if (title) document.title = title;
    meta('description', description || ''); meta('robots', noIndex ? 'noindex,nofollow' : 'index,follow');
    meta('og:title', title || '', true); meta('og:description', description || '', true); meta('og:url', canonical || `${window.location.origin}${window.location.pathname}`, true);
    meta('twitter:card', image ? 'summary_large_image' : 'summary'); meta('twitter:title', title || ''); meta('twitter:description', description || ''); meta('og:image', image || '', true); meta('twitter:image', image || '');
    let canonicalNode = document.head.querySelector('link[rel="canonical"]'); const resolvedCanonical = canonical || `${window.location.origin}${window.location.pathname}`;
    if (resolvedCanonical) { if (!canonicalNode) { canonicalNode = document.createElement('link'); canonicalNode.rel = 'canonical'; document.head.appendChild(canonicalNode); } canonicalNode.href = resolvedCanonical; } else canonicalNode?.remove();
    const id = 'dynamic-jsonld'; document.getElementById(id)?.remove();
    if (schema) { const script = document.createElement('script'); script.id = id; script.type = 'application/ld+json'; script.textContent = JSON.stringify(schema); document.head.appendChild(script); }
    return () => document.getElementById(id)?.remove();
  }, [title, description, canonical, image, noIndex, schema ? JSON.stringify(schema) : '']);
}

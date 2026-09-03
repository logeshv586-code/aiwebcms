export function slugify(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function uniqueSlug(base, suffix = '') {
  const slug = slugify(base) || 'item';
  return suffix ? `${slug}-${suffix}` : slug;
}

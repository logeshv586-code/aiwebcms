export function formatMoney(value, config) {
  const currency = config?.currency || 'INR';
  const locale = config?.locale || undefined;
  try {
    return Number(value || 0).toLocaleString(locale, { style: 'currency', currency });
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

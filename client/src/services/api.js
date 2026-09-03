const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('commerce_token');
}

export function setSession(payload) {
  if (payload?.token) localStorage.setItem('commerce_token', payload.token);
  if (payload?.user) localStorage.setItem('commerce_user', JSON.stringify(payload.user));
}

export function clearSession() {
  localStorage.removeItem('commerce_token');
  localStorage.removeItem('commerce_user');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
export const remove = (path) => api(path, { method: 'DELETE' });

export async function uploadFile(file) {
  const token = getToken();
  const body = new FormData();
  body.append('file', file);
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}/admin/media/upload`, { method: 'POST', headers, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Upload failed');
  return data;
}

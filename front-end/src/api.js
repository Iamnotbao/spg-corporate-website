const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('spg_admin_token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload;
}

export function getApiUrl(path = '') { return `${API_URL}${path}`; }
export function getAdminToken() { return localStorage.getItem('spg_admin_token') || ''; }
export function getApplicationCvUrl(id) { return getApiUrl(`/admin/applications/${encodeURIComponent(id)}/cv`); }

export async function downloadApplicationCv(id) {
  const response = await fetch(getApplicationCvUrl(id), { headers: { Authorization: `Bearer ${getAdminToken()}` } });
  if (!response.ok) {
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = null; }
    throw new Error(payload?.error || 'Không thể tải CV');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || 'CV.pdf';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function verifyAdmin(token) { return apiFetch('/admin/verify', { headers: { Authorization: `Bearer ${token}` } }); }
export async function publicList(type, params = '') { return apiFetch(`/public/${type}${params}`); }
export async function adminList(type, params = '') { return apiFetch(`/admin/${type}${params}`); }
export async function adminGet(type, id) { return apiFetch(`/admin/${type}/${id}`); }
export async function adminCreate(type, body) { return apiFetch(`/admin/${type}`, { method: 'POST', body: JSON.stringify(body) }); }
export async function adminUpdate(type, id, body) { return apiFetch(`/admin/${type}/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export async function adminDelete(type, id) { return apiFetch(`/admin/${type}/${id}`, { method: 'DELETE' }); }
export async function adminApplications() { return apiFetch('/admin/applications'); }
export async function adminLogo() { return apiFetch('/admin/settings/logo'); }
export async function adminUpdateLogo(url) { return apiFetch('/admin/settings/logo', { method: 'PUT', body: JSON.stringify({ url }) }); }

const publicResource = (type) => async (params = '') => publicList(type, params);

export const api = {
  get: async (path, options = {}) => apiFetch(path, { ...options, method: 'GET' }),
  post: async (path, body, options = {}) => apiFetch(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: async (path, body, options = {}) => apiFetch(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  del: async (path, options = {}) => apiFetch(path, { ...options, method: 'DELETE' }),
  getPosts: publicResource('posts'),
  getJobs: publicResource('jobs'),
  getPost: async (id) => apiFetch(`/public/posts/${encodeURIComponent(id)}`),
  getJob: async (id) => apiFetch(`/public/jobs/${encodeURIComponent(id)}`),
};

export { API_URL };

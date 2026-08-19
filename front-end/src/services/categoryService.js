import { API_URL, apiRequest } from './httpClient.js';

export async function getPublicCategories(options = {}) {
  const params = new URLSearchParams({ type: options.type || 'posts' });
  const response = await fetch(`${API_URL}/categories?${params.toString()}`, {
    signal: options.signal,
  });
  if (!response.ok) throw new Error('Không thể tải category.');
  const payload = await response.json();
  return payload?.data || [];
}

export async function listAdminCategories(options = {}) {
  const params = new URLSearchParams({
    type: options.type || 'posts',
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);
  return apiRequest(`/admin/categories?${params.toString()}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export function createAdminCategory(payload) {
  return apiRequest('/admin/categories', { method: 'POST', auth: true, body: payload });
}

export function updateAdminCategory(id, payload) {
  return apiRequest(`/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export function deleteAdminCategory(id) {
  return apiRequest(`/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

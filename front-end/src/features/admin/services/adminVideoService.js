import { apiRequest } from '../../../services/httpClient.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

export function listAdminVideos(options = {}) {
  const params = new URLSearchParams({ page: String(options.page || 1), pageSize: String(options.pageSize || ADMIN_DEFAULT_PAGE_SIZE) });
  for (const key of ['search', 'status', 'hskLevel', 'from', 'to']) if (options[key]) params.set(key, options[key]);
  return apiRequest(`/admin/videos?${params}`, { auth: true, signal: options.signal });
}
export const createAdminVideo = (body) => apiRequest('/admin/videos', { auth: true, method: 'POST', body });
export const updateAdminVideo = (id, body) => apiRequest(`/admin/videos/${encodeURIComponent(id)}`, { auth: true, method: 'PUT', body });
export const deleteAdminVideo = (id) => apiRequest(`/admin/videos/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' });
export async function uploadAdminVideo(file) {
  const body = new FormData();
  body.append('video', file);
  const response = await apiRequest('/admin/uploads/videos', { auth: true, method: 'POST', body });
  return response.data;
}

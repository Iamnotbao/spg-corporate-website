import { apiRequest } from './httpClient.js';

export async function listAdminMedia(options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.folder) params.set('folder', options.folder);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/admin/media${suffix}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function deleteAdminMedia(publicId) {
  return apiRequest('/admin/media', {
    method: 'DELETE',
    auth: true,
    body: { publicId },
  });
}

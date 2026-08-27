import { apiRequest } from '../../../services/httpClient.js';

export function listAdminTrash(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);
  if (options.type) params.set('type', options.type);
  return apiRequest(`/admin/trash?${params.toString()}`, {
    auth: true,
    signal: options.signal,
  });
}

export function restoreAdminTrash(type, id) {
  return apiRequest(
    `/admin/trash/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`,
    { auth: true, method: 'POST' },
  );
}

export function purgeAdminTrash(type, id) {
  return apiRequest(`/admin/trash/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  });
}

export function emptyAdminTrash() {
  return apiRequest('/admin/trash', {
    auth: true,
    method: 'DELETE',
  });
}

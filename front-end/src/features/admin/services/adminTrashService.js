import { apiRequest } from '../../../services/httpClient.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

export function listAdminTrash(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || ADMIN_DEFAULT_PAGE_SIZE),
  });
  if (options.search) params.set('search', options.search);
  if (options.type) params.set('type', options.type);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
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

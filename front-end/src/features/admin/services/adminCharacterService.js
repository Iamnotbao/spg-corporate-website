import { apiRequest } from '../../../services/httpClient.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

export function listAdminCharacters(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || ADMIN_DEFAULT_PAGE_SIZE),
  });
  if (options.search) params.set('search', options.search);
  if (options.hskLevel) params.set('hskLevel', options.hskLevel);
  if (options.status) params.set('status', options.status);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  return apiRequest(`/admin/characters?${params.toString()}`, {
    auth: true,
    signal: options.signal,
  });
}

export function createAdminCharacter(payload) {
  return apiRequest('/admin/characters', { auth: true, method: 'POST', body: payload });
}

export function updateAdminCharacter(id, payload) {
  return apiRequest(`/admin/characters/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'PUT',
    body: payload,
  });
}

export function deleteAdminCharacter(id) {
  return apiRequest(`/admin/characters/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  });
}

export function bulkUpdateAdminCharacters(ids, status) {
  return apiRequest('/admin/characters/bulk-status', {
    auth: true,
    method: 'POST',
    body: { ids, status },
  });
}

export function bulkDeleteAdminCharacters(ids) {
  return apiRequest('/admin/characters/bulk-delete', {
    auth: true,
    method: 'POST',
    body: { ids },
  });
}

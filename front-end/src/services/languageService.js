import { apiRequest } from './httpClient.js';

export async function listPublicLanguages(options = {}) {
  return apiRequest('/languages', {
    method: 'GET',
    signal: options.signal,
  });
}

export async function listAdminLanguages(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);

  return apiRequest(`/admin/languages?${params.toString()}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function createAdminLanguage(payload) {
  return apiRequest('/admin/languages', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function updateAdminLanguage(id, payload) {
  return apiRequest(`/admin/languages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export async function deleteAdminLanguage(id) {
  return apiRequest(`/admin/languages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

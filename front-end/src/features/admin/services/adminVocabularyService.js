import { apiRequest } from '../../../services/httpClient.js';

export function listAdminVocabulary(options = {}) {
  return apiRequest('/admin/vocabulary', {
    auth: true,
    signal: options.signal,
  });
}

export function createAdminVocabulary(payload) {
  return apiRequest('/admin/vocabulary', {
    auth: true,
    method: 'POST',
    body: payload,
  });
}

export function updateAdminVocabulary(id, payload) {
  return apiRequest(`/admin/vocabulary/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'PUT',
    body: payload,
  });
}

export function deleteAdminVocabulary(id) {
  return apiRequest(`/admin/vocabulary/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  });
}

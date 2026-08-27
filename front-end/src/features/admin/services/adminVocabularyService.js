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

export function importAdminVocabulary(payload) {
  return apiRequest('/admin/vocabulary/import', {
    auth: true,
    method: 'POST',
    body: payload,
  });
}

export function analyzeAdminVocabularyDuplicates(options = {}) {
  return apiRequest('/admin/vocabulary/duplicates', {
    auth: true,
    signal: options.signal,
  });
}

export function cleanupAdminVocabularyDuplicates() {
  return apiRequest('/admin/vocabulary/duplicates/cleanup', {
    auth: true,
    method: 'POST',
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

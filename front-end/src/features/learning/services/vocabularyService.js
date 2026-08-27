import { apiRequest } from '../../../services/httpClient.js';

export function listPublicVocabulary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.hskLevel) params.set('hskLevel', filters.hskLevel);
  if (filters.lessonId) params.set('lessonId', filters.lessonId);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return apiRequest(`/vocabulary${query ? `?${query}` : ''}`);
}

export function listSavedVocabulary(filters = {}) {
  const params = new URLSearchParams({
    page: String(filters.page || 1),
    pageSize: String(filters.pageSize || 12),
  });
  if (filters.search) params.set('search', filters.search);
  if (filters.hskLevel) params.set('hskLevel', filters.hskLevel);
  return apiRequest(`/student/vocabulary?${params.toString()}`, {
    auth: 'student',
    signal: filters.signal,
  });
}

export function getSavedVocabularyStatus(ids, options = {}) {
  const params = new URLSearchParams({ ids: ids.slice(0, 100).join(',') });
  return apiRequest(`/student/vocabulary/saved-status?${params.toString()}`, {
    auth: 'student',
    signal: options.signal,
  });
}

export function saveVocabulary(id) {
  return apiRequest(`/student/vocabulary/${encodeURIComponent(id)}/saved`, {
    auth: 'student',
    method: 'PUT',
  });
}

export function unsaveVocabulary(id) {
  return apiRequest(`/student/vocabulary/${encodeURIComponent(id)}/saved`, {
    auth: 'student',
    method: 'DELETE',
  });
}

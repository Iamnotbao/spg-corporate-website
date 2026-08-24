import { apiRequest } from '../../../services/httpClient.js';

export function listPublicVocabulary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.hskLevel) params.set('hskLevel', filters.hskLevel);
  if (filters.lessonId) params.set('lessonId', filters.lessonId);
  const query = params.toString();
  return apiRequest(`/vocabulary${query ? `?${query}` : ''}`);
}

export function listSavedVocabulary() {
  return apiRequest('/student/vocabulary', { auth: 'student' });
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

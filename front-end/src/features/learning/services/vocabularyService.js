import { apiRequest } from '../../../services/httpClient.js';

export function listPublicVocabulary() {
  return apiRequest('/vocabulary');
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

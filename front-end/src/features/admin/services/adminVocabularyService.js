import { apiRequest } from '../../../services/httpClient.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

export function listAdminVocabulary(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || ADMIN_DEFAULT_PAGE_SIZE),
  });
  if (options.search) params.set('search', options.search);
  if (options.hskLevel) params.set('hskLevel', options.hskLevel);
  if (options.lessonId) params.set('lessonId', options.lessonId);
  if (options.status) params.set('status', options.status);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  return apiRequest(`/admin/vocabulary?${params.toString()}`, {
    auth: true,
    signal: options.signal,
  });
}

export function getAdminLessonVocabularyLinks(lessonId, options = {}) {
  return apiRequest(`/admin/vocabulary/lessons/${encodeURIComponent(lessonId)}`, {
    auth: true,
    signal: options.signal,
  });
}

export function replaceAdminLessonVocabularyLinks(lessonId, vocabularyIds) {
  return apiRequest(`/admin/vocabulary/lessons/${encodeURIComponent(lessonId)}`, {
    auth: true,
    method: 'PUT',
    body: { vocabularyIds },
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

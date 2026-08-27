import { apiRequest } from '../../../services/httpClient.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../../admin/constants.js';

export function listAdminQuizzes(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || ADMIN_DEFAULT_PAGE_SIZE),
  });
  if (options.search) params.set('search', options.search);
  if (options.status) params.set('status', options.status);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  return apiRequest(`/admin/quizzes?${params.toString()}`, {
    auth: true,
    signal: options.signal,
  });
}

export function getAdminQuiz(id) {
  return apiRequest(`/admin/quizzes/${encodeURIComponent(id)}`, { auth: true });
}

export function createAdminQuiz(payload) {
  return apiRequest('/admin/quizzes', { auth: true, method: 'POST', body: payload });
}

export function updateAdminQuiz(id, payload) {
  return apiRequest(`/admin/quizzes/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'PUT',
    body: payload,
  });
}

export function deleteAdminQuiz(id) {
  return apiRequest(`/admin/quizzes/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  });
}

export function createAdminQuestion(quizId, payload) {
  return apiRequest(`/admin/quizzes/${encodeURIComponent(quizId)}/questions`, {
    auth: true,
    method: 'POST',
    body: payload,
  });
}

export function updateAdminQuestion(id, payload) {
  return apiRequest(`/admin/quiz-questions/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'PUT',
    body: payload,
  });
}

export function deleteAdminQuestion(id) {
  return apiRequest(`/admin/quiz-questions/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  });
}

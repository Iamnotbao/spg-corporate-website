import { apiRequest } from '../../../services/httpClient.js';

export function listAdminQuizzes() {
  return apiRequest('/admin/quizzes', { auth: true });
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

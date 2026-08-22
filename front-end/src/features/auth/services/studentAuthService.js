import { apiRequest } from '../../../services/httpClient.js';

export function loginStudent(credentials) {
  return apiRequest('/auth/login', { method: 'POST', body: credentials });
}

export function registerStudent(details) {
  return apiRequest('/auth/register', { method: 'POST', body: details });
}

export function getStudentSession() {
  return apiRequest('/auth/session', { auth: 'student' });
}

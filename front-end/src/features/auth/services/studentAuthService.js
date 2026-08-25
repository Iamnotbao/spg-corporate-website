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

export function requestPasswordReset(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export function resetStudentPassword(details) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: details });
}

const verificationRequests = new Map();

export function verifyStudentEmail(token) {
  if (!verificationRequests.has(token)) {
    verificationRequests.set(
      token,
      apiRequest('/auth/verify-email', {
        method: 'POST',
        body: { token },
      }),
    );
  }
  return verificationRequests.get(token);
}

export function resendStudentVerification() {
  return apiRequest('/auth/send-verification', {
    auth: 'student',
    method: 'POST',
  });
}

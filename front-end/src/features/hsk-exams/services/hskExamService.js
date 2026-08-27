import { apiRequest } from '../../../services/httpClient.js';
export function listHskMockExams(options = {}) { const params = new URLSearchParams({ page: String(options.page || 1), pageSize: String(options.pageSize || 9) }); if (options.level) params.set('level', options.level); return apiRequest(`/hsk-mock-exams?${params}`, { signal: options.signal }); }
export const getHskMockExam = (id, options = {}) => apiRequest(`/hsk-mock-exams/${encodeURIComponent(id)}`, { signal: options.signal });
export const startHskMockAttempt = (examId) => apiRequest(`/student/hsk-mock-exams/${encodeURIComponent(examId)}/attempts`, { auth: 'student', method: 'POST' });
export const submitHskMockAttempt = (attemptId, answers) => apiRequest(`/student/hsk-mock-attempts/${encodeURIComponent(attemptId)}/submit`, { auth: 'student', method: 'PUT', body: { answers } });
export function listHskMockAttempts(examId, options = {}) { const params = new URLSearchParams({ page: String(options.page || 1), pageSize: String(options.pageSize || 10) }); return apiRequest(`/student/hsk-mock-exams/${encodeURIComponent(examId)}/attempts?${params}`, { auth: 'student', signal: options.signal }); }
export const getHskMockAttempt = (attemptId, options = {}) => apiRequest(`/student/hsk-mock-attempts/${encodeURIComponent(attemptId)}`, { auth: 'student', signal: options.signal });

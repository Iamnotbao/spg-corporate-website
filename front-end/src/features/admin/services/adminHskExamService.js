import { apiRequest } from '../../../services/httpClient.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

const paramsFor = (options = {}) => {
  const params = new URLSearchParams({ page: String(options.page || 1), pageSize: String(options.pageSize || ADMIN_DEFAULT_PAGE_SIZE) });
  for (const key of ['search', 'status', 'level', 'from', 'to']) if (options[key]) params.set(key, options[key]);
  return params;
};
export const listAdminHskExams = (options = {}) => apiRequest(`/admin/hsk-mock-exams?${paramsFor(options)}`, { auth: true, signal: options.signal });
export const getAdminHskExam = (id) => apiRequest(`/admin/hsk-mock-exams/${encodeURIComponent(id)}`, { auth: true });
export const createAdminHskExam = (body) => apiRequest('/admin/hsk-mock-exams', { auth: true, method: 'POST', body });
export const updateAdminHskExam = (id, body) => apiRequest(`/admin/hsk-mock-exams/${encodeURIComponent(id)}`, { auth: true, method: 'PUT', body });
export const deleteAdminHskExam = (id) => apiRequest(`/admin/hsk-mock-exams/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' });
export const createAdminHskSection = (examId, body) => apiRequest(`/admin/hsk-mock-exams/${encodeURIComponent(examId)}/sections`, { auth: true, method: 'POST', body });
export const updateAdminHskSection = (id, body) => apiRequest(`/admin/hsk-mock-sections/${encodeURIComponent(id)}`, { auth: true, method: 'PUT', body });
export const deleteAdminHskSection = (id) => apiRequest(`/admin/hsk-mock-sections/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' });
export const createAdminHskQuestion = (sectionId, body) => apiRequest(`/admin/hsk-mock-sections/${encodeURIComponent(sectionId)}/questions`, { auth: true, method: 'POST', body });
export const updateAdminHskQuestion = (id, body) => apiRequest(`/admin/hsk-mock-questions/${encodeURIComponent(id)}`, { auth: true, method: 'PUT', body });
export const deleteAdminHskQuestion = (id) => apiRequest(`/admin/hsk-mock-questions/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' });

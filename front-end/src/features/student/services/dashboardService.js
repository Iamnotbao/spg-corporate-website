import { apiRequest } from '../../../services/httpClient.js';

export function getStudentDashboard() {
  return apiRequest('/student/dashboard', { auth: 'student' });
}

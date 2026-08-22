import { apiRequest } from '../../../services/httpClient.js';

export function enrollInCourse(courseId) {
  return apiRequest('/student/enrollments', {
    auth: 'student',
    method: 'POST',
    body: { courseId },
  });
}

export function listMyCourses() {
  return apiRequest('/student/courses', { auth: 'student' });
}

export function getStudentProgress() {
  return apiRequest('/student/progress', { auth: 'student' });
}

export function listStudentNotifications({ page = 1, pageSize = 5 } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiRequest(`/student/notifications?${query}`, { auth: 'student' });
}

export function markStudentNotificationRead(id) {
  return apiRequest(`/student/notifications/${encodeURIComponent(id)}/read`, {
    auth: 'student',
    method: 'PUT',
  });
}

export function dismissStudentNotification(id) {
  return apiRequest(`/student/notifications/${encodeURIComponent(id)}`, {
    auth: 'student',
    method: 'DELETE',
  });
}

export function archiveEnrollment(courseId) {
  return apiRequest(`/student/enrollments/${encodeURIComponent(courseId)}`, {
    auth: 'student',
    method: 'DELETE',
  });
}

export function getStudentCourseState(identifier) {
  return apiRequest(`/student/courses/${encodeURIComponent(identifier)}`, {
    auth: 'student',
  });
}

export function completeLesson(identifier) {
  return apiRequest(`/student/lessons/${encodeURIComponent(identifier)}/complete`, {
    auth: 'student',
    method: 'PUT',
  });
}

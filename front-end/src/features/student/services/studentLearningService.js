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

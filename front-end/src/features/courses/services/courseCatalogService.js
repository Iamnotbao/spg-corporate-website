import { apiRequest } from '../../../services/httpClient.js';

export function listPublicCourses() {
  return apiRequest('/courses');
}

export function getPublicCourse(slug) {
  return apiRequest(`/courses/${encodeURIComponent(slug)}`);
}

export function getPublicLesson(slug) {
  return apiRequest(`/lessons/${encodeURIComponent(slug)}`);
}

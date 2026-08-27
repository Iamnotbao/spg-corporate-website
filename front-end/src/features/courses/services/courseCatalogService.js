import { apiRequest } from '../../../services/httpClient.js';

export function listPublicCourses(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 9),
  });
  if (options.search) params.set('search', options.search);
  if (options.level) params.set('level', options.level);
  return apiRequest(`/courses?${params.toString()}`, { signal: options.signal });
}

export function getPublicCourse(slug) {
  return apiRequest(`/courses/${encodeURIComponent(slug)}`);
}

export function getPublicLesson(slug) {
  return apiRequest(`/lessons/${encodeURIComponent(slug)}`);
}

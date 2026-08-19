import { apiRequest } from './httpClient.js';

function unwrapData(payload, fallback) {
  return payload?.data ?? fallback;
}

function listPath(type, options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.category && type === 'posts') params.set('category', options.category);
  if (options.type && type === 'jobs') params.set('type', options.type);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  const query = params.toString();
  return `/${type}${query ? `?${query}` : ''}`;
}

export async function getPosts(options = {}) {
  const payload = await apiRequest(listPath('posts', options), { method: 'GET', signal: options.signal });
  return unwrapData(payload, []);
}

export async function getJobs(options = {}) {
  const payload = await apiRequest(listPath('jobs', options), { method: 'GET', signal: options.signal });
  return unwrapData(payload, []);
}

export async function getPost(id, options = {}) {
  const payload = await apiRequest(`/posts/${encodeURIComponent(id)}`, { method: 'GET', signal: options.signal });
  return unwrapData(payload, null);
}

export async function getJob(id, options = {}) {
  const payload = await apiRequest(`/jobs/${encodeURIComponent(id)}`, { method: 'GET', signal: options.signal });
  return unwrapData(payload, null);
}

export async function submitApplication(formData) {
  return apiRequest('/applications', { method: 'POST', body: formData });
}

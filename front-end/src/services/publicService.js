import { apiRequest } from './httpClient.js';

function unwrapData(payload, fallback) {
  return payload?.data ?? fallback;
}

export async function getPosts(options = {}) {
  const payload = await apiRequest('/posts', {
    method: 'GET',
    signal: options.signal,
  });

  return unwrapData(payload, []);
}

export async function getJobs(options = {}) {
  const payload = await apiRequest('/jobs', {
    method: 'GET',
    signal: options.signal,
  });

  return unwrapData(payload, []);
}

export async function getPost(id, options = {}) {
  const payload = await apiRequest(`/posts/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal: options.signal,
  });

  return unwrapData(payload, null);
}

export async function getJob(id, options = {}) {
  const payload = await apiRequest(`/jobs/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal: options.signal,
  });

  return unwrapData(payload, null);
}

export async function submitApplication(formData) {
  return apiRequest('/applications', {
    method: 'POST',
    body: formData,
  });
}

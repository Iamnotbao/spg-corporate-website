import { API_URL, apiRequest } from './httpClient.js';

export async function getPublicSiteProfile(options = {}) {
  return apiRequest('/site-profile', { method: 'GET', signal: options.signal });
}

export async function getAdminSiteProfile(options = {}) {
  return apiRequest('/admin/site-profile', { method: 'GET', auth: true, signal: options.signal });
}

export async function updateAdminSiteProfile(payload) {
  return apiRequest('/admin/site-profile', { method: 'PUT', auth: true, body: payload });
}

export function publicRealtimeUrl() {
  return `${API_URL}/events`;
}

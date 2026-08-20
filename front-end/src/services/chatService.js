import { API_URL, apiRequest } from './httpClient.js';

export { API_URL };

export async function getPublicChatSettings(options = {}) {
  return apiRequest('/chat/settings', { method: 'GET', signal: options.signal });
}

export async function createPublicChatSession(payload = {}) {
  return apiRequest('/chat/sessions', { method: 'POST', body: payload });
}

export async function getPublicChatMessages(sessionId, clientToken, options = {}) {
  const params = new URLSearchParams({ sessionId, clientToken });
  return apiRequest(`/chat/messages?${params.toString()}`, {
    method: 'GET',
    signal: options.signal,
  });
}

export async function sendPublicChatMessage(payload) {
  return apiRequest('/chat/messages', { method: 'POST', body: payload });
}

export function publicChatEventsUrl(sessionId, clientToken) {
  const params = new URLSearchParams({ sessionId, clientToken });
  return `${API_URL}/chat/events?${params.toString()}`;
}

export async function getAdminChatSettings(options = {}) {
  return apiRequest('/admin/chat/settings', {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function updateAdminChatSettings(payload) {
  return apiRequest('/admin/chat/settings', { method: 'PUT', auth: true, body: payload });
}

export async function testAdminAiChat(payload) {
  return apiRequest('/admin/chat/ai-test', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function listAdminChatSessions(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 20),
  });
  if (options.search) params.set('search', options.search);
  if (options.status) params.set('status', options.status);
  return apiRequest(`/admin/chat/sessions?${params.toString()}`, {
    method: 'GET', auth: true, signal: options.signal,
  });
}

export async function getAdminChatMessages(sessionId, options = {}) {
  return apiRequest(`/admin/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'GET', auth: true, signal: options.signal,
  });
}

export async function sendAdminChatMessage(sessionId, text) {
  return apiRequest(`/admin/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST', auth: true, body: { text },
  });
}

export async function updateAdminChatSession(sessionId, status) {
  return apiRequest(`/admin/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT', auth: true, body: { status },
  });
}

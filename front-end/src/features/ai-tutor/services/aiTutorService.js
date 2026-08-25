import { apiRequest } from '../../../services/httpClient.js';

export function getAiTutorStatus() {
  return apiRequest('/student/ai/status', { auth: 'student' });
}

export function listAiConversations() {
  return apiRequest('/student/ai/conversations', { auth: 'student' });
}

export function listAiMessages(conversationId) {
  return apiRequest(
    `/student/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
    { auth: 'student' },
  );
}

export function sendAiMessage({ conversationId, context, message }) {
  return apiRequest('/student/ai/chat', {
    auth: 'student',
    method: 'POST',
    body: {
      message,
      context,
      ...(conversationId ? { conversationId } : {}),
    },
  });
}

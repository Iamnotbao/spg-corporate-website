import { apiRequest } from '../../services/httpClient.js';

export function searchPublic(query, options = {}) {
  const params = new URLSearchParams({
    q: String(query || '').trim(),
    limit: String(options.limit || 5),
  });
  return apiRequest(`/search?${params.toString()}`, { signal: options.signal });
}

export function recognizeHandwriting(strokes, options = {}) {
  return apiRequest('/characters/recognize', {
    method: 'POST',
    body: { strokes },
    signal: options.signal,
  });
}

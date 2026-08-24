import { apiRequest } from '../../../services/httpClient.js';

export function listPublicCharacters(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 12),
  });
  if (options.search) params.set('search', options.search);
  if (options.hskLevel) params.set('hskLevel', options.hskLevel);
  if (options.lessonId) params.set('lessonId', options.lessonId);
  return apiRequest(`/characters?${params.toString()}`, { signal: options.signal });
}

export function getPublicCharacter(identifier, options = {}) {
  return apiRequest(`/characters/${encodeURIComponent(identifier)}`, {
    signal: options.signal,
  });
}

export function getCharacterStrokeData(identifier, options = {}) {
  return apiRequest(`/characters/${encodeURIComponent(identifier)}/strokes`, {
    signal: options.signal,
  });
}

export function compareCharacter(identifier, strokes) {
  return apiRequest(`/characters/${encodeURIComponent(identifier)}/compare`, {
    method: 'POST',
    body: { strokes },
  });
}

export function submitCharacterAttempt(characterId, strokes) {
  return apiRequest(`/student/characters/${encodeURIComponent(characterId)}/attempts`, {
    auth: 'student',
    method: 'POST',
    body: { strokes },
  });
}

export function getCharacterAttemptSummary(characterId, options = {}) {
  return apiRequest(
    `/student/characters/${encodeURIComponent(characterId)}/attempts/summary`,
    { auth: 'student', signal: options.signal },
  );
}

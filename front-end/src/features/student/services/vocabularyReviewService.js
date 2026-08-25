import { apiRequest } from '../../../services/httpClient.js';

export function getVocabularyReviewQueue(limit = 20) {
  return apiRequest(`/student/vocabulary-review?limit=${encodeURIComponent(limit)}`, {
    auth: 'student',
  });
}

export function submitVocabularyReview(vocabularyId, rating) {
  return apiRequest(`/student/vocabulary-review/${encodeURIComponent(vocabularyId)}`, {
    auth: 'student',
    method: 'POST',
    body: { rating },
  });
}

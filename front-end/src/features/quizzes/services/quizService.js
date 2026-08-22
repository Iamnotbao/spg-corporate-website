import { apiRequest } from '../../../services/httpClient.js';

export function getLessonQuiz(lessonIdentifier) {
  return apiRequest(`/lessons/${encodeURIComponent(lessonIdentifier)}/quiz`);
}

export function submitQuizAttempt(quizId, answers) {
  return apiRequest(`/student/quizzes/${encodeURIComponent(quizId)}/attempts`, {
    auth: 'student',
    method: 'POST',
    body: { answers },
  });
}

export function listQuizAttempts(quizId) {
  return apiRequest(`/student/quizzes/${encodeURIComponent(quizId)}/attempts`, {
    auth: 'student',
  });
}

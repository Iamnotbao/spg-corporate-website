import { quizService } from "./quiz.service.js";

export async function listAdmin(_req, res) {
  return res.json({ data: await quizService.listAdmin() });
}

export async function getAdmin(req, res) {
  return res.json({ data: await quizService.getAdmin(req.params.id) });
}

export async function createQuiz(req, res) {
  return res.status(201).json({ data: await quizService.createQuiz(req.body) });
}

export async function updateQuiz(req, res) {
  return res.json({
    data: await quizService.updateQuiz(req.params.id, req.body),
  });
}

export async function deleteQuiz(req, res) {
  await quizService.deleteQuiz(req.params.id);
  return res.json({ ok: true });
}

export async function createQuestion(req, res) {
  return res.status(201).json({
    data: await quizService.createQuestion(req.params.quizId, req.body),
  });
}

export async function updateQuestion(req, res) {
  return res.json({
    data: await quizService.updateQuestion(req.params.id, req.body),
  });
}

export async function deleteQuestion(req, res) {
  await quizService.deleteQuestion(req.params.id);
  return res.json({ ok: true });
}

export async function getPublicByLesson(req, res) {
  return res.json({
    data: await quizService.getPublicByLesson(req.params.identifier),
  });
}

export async function submit(req, res) {
  return res.status(201).json({
    data: await quizService.submit(req.user, req.params.quizId, req.body),
  });
}

export async function listOwnAttempts(req, res) {
  return res.json({
    data: await quizService.listOwnAttempts(req.user, req.params.quizId),
  });
}

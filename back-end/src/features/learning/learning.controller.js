import { learningService } from "./learning.service.js";

export async function listPublishedCourses(_req, res) {
  return res.json({ data: await learningService.listPublishedCourses() });
}

export async function getPublishedCourse(req, res) {
  return res.json({
    data: await learningService.getPublishedCourse(req.params.identifier),
  });
}

export async function getPublishedLesson(req, res) {
  return res.json({
    data: await learningService.getPublishedLesson(req.params.identifier),
  });
}

export async function listCourses(_req, res) {
  return res.json({ data: await learningService.listCourses() });
}

export async function getCourse(req, res) {
  return res.json({ data: await learningService.getCourse(req.params.id) });
}

export async function createCourse(req, res) {
  return res
    .status(201)
    .json({ data: await learningService.createCourse(req.body) });
}

export async function updateCourse(req, res) {
  return res.json({
    data: await learningService.updateCourse(req.params.id, req.body),
  });
}

export async function deleteCourse(req, res) {
  await learningService.deleteCourse(req.params.id);
  return res.json({ ok: true });
}

export async function listUnits(req, res) {
  return res.json({ data: await learningService.listUnits(req.query) });
}

export async function getUnit(req, res) {
  return res.json({ data: await learningService.getUnit(req.params.id) });
}

export async function createUnit(req, res) {
  return res
    .status(201)
    .json({ data: await learningService.createUnit(req.body) });
}

export async function updateUnit(req, res) {
  return res.json({
    data: await learningService.updateUnit(req.params.id, req.body),
  });
}

export async function deleteUnit(req, res) {
  await learningService.deleteUnit(req.params.id);
  return res.json({ ok: true });
}

export async function listLessons(req, res) {
  return res.json({ data: await learningService.listLessons(req.query) });
}

export async function getLesson(req, res) {
  return res.json({ data: await learningService.getLesson(req.params.id) });
}

export async function createLesson(req, res) {
  return res
    .status(201)
    .json({ data: await learningService.createLesson(req.body) });
}

export async function updateLesson(req, res) {
  return res.json({
    data: await learningService.updateLesson(req.params.id, req.body),
  });
}

export async function deleteLesson(req, res) {
  await learningService.deleteLesson(req.params.id);
  return res.json({ ok: true });
}

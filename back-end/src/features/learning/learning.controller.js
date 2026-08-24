import { learningRepository } from "./learning.repository.js";
import { learningService } from "./learning.service.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeLessonOption(document) {
  return {
    id: String(document._id),
    unitId: String(document.unitId),
    title: document.title,
    slug: document.slug,
    type: document.type,
    status: document.status,
  };
}

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

export async function listLessonOptions(req, res) {
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(20, Math.max(1, Number(req.query.pageSize) || 8));
  const search = String(req.query.search || "").trim();
  const query = {};

  if (req.query.unitId) {
    const unitId = learningRepository.toObjectId(req.query.unitId);
    if (!unitId) return res.status(400).json({ error: "unitId must be a valid id" });
    query.unitId = unitId;
  }
  if (search) {
    const safe = escapeRegex(search);
    query.$or = ["title", "slug", "type", "status"].map((field) => ({
      [field]: { $regex: safe, $options: "i" },
    }));
  }

  const total = await learningRepository.countLessons(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await learningRepository.listLessonsPage(query, {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  return res.json({
    data: items.map(serializeLessonOption),
    pagination: { page, pageSize, total, totalPages },
  });
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

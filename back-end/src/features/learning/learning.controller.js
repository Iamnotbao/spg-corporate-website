import { learningRepository } from "./learning.repository.js";
import { learningService } from "./learning.service.js";
import { LESSON_TYPES } from "./learning.constants.js";
import { trashService } from "../trash/trash.service.js";
import {
  paginationResult,
  parsePagination,
  parseSearch,
  searchFilter,
} from "../../utils/pagination.js";

export async function listPublishedCourses(req, res) {
  return res.json(await learningService.listPublishedCourses(req.query));
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

export async function listCourses(req, res) {
  return res.json(await learningService.listCourses(req.query));
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
  return res.json({
    ok: true,
    data: await trashService.move("course", req.params.id, req.user),
  });
}

export async function listUnits(req, res) {
  return res.json(await learningService.listUnits(req.query));
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
  return res.json({
    ok: true,
    data: await trashService.move("unit", req.params.id, req.user),
  });
}

export async function listLessons(req, res) {
  return res.json(await learningService.listLessons(req.query));
}

async function listOptions(req, res, { kind, parentField, fields }) {
  const paging = parsePagination(req.query, { defaultPageSize: 20, maxPageSize: 100 });
  const search = parseSearch(req.query.search);
  const query = {};

  if (parentField && req.query[parentField]) {
    const parentId = learningRepository.toObjectId(req.query[parentField]);
    if (!parentId) return res.status(400).json({ error: `${parentField} must be a valid id` });
    query[parentField] = parentId;
  }
  if (kind === "lessons" && req.query.type) {
    const type = String(req.query.type).trim();
    if (!LESSON_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${LESSON_TYPES.join(", ")}` });
    }
    query.type = type;
  }
  if (search) Object.assign(query, searchFilter(search, fields));

  const methods = {
    courses: [learningRepository.listCoursesPage, learningRepository.countCourses],
    units: [learningRepository.listUnitsPage, learningRepository.countUnits],
    lessons: [learningRepository.listLessonsPage, learningRepository.countLessons],
  };
  const [list, count] = methods[kind];
  const [items, total] = await Promise.all([
    list(query, { skip: paging.skip, limit: paging.pageSize }),
    count(query),
  ]);
  return res.json({
    data: items.map((document) => ({
      id: String(document._id),
      title: document.title,
      ...(document.courseId ? { courseId: String(document.courseId) } : {}),
      ...(document.unitId ? { unitId: String(document.unitId) } : {}),
      ...(document.slug ? { slug: document.slug } : {}),
      ...(document.type ? { type: document.type } : {}),
      ...(document.status ? { status: document.status } : {}),
    })),
    pagination: paginationResult(paging, total),
  });
}

export async function listCourseOptions(req, res) {
  return listOptions(req, res, { kind: "courses", fields: ["title", "slug", "level"] });
}

export async function listUnitOptions(req, res) {
  return listOptions(req, res, {
    kind: "units",
    parentField: "courseId",
    fields: ["title", "description"],
  });
}

export async function listLessonOptions(req, res) {
  return listOptions(req, res, {
    kind: "lessons",
    parentField: "unitId",
    fields: ["title", "slug", "type", "status"],
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
  return res.json({
    ok: true,
    data: await trashService.move("lesson", req.params.id, req.user),
  });
}

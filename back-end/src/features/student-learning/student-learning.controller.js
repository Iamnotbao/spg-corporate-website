import { studentLearningService } from "./student-learning.service.js";

export async function enroll(req, res) {
  const result = await studentLearningService.enroll(req.user, req.body);
  return res.status(result.created ? 201 : 200).json({ data: result });
}

export async function archiveEnrollment(req, res) {
  return res.json({
    data: await studentLearningService.archiveEnrollment(
      req.user,
      req.params.courseId,
    ),
  });
}

export async function listMyCourses(req, res) {
  return res.json({
    data: await studentLearningService.listMyCourses(req.user),
  });
}

export async function getCourseState(req, res) {
  return res.json({
    data: await studentLearningService.getCourseState(
      req.user,
      req.params.identifier,
    ),
  });
}

export async function completeLesson(req, res) {
  return res.json({
    data: await studentLearningService.completeLesson(
      req.user,
      req.params.identifier,
    ),
  });
}

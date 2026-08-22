import { progressService } from "./progress.service.js";

export async function getStudentProgress(req, res) {
  return res.json({ data: await progressService.getStudentProgress(req.user) });
}

export async function getAdminSummary(_req, res) {
  return res.json({ data: await progressService.getAdminSummary() });
}

export async function listAdminProgress(req, res) {
  const result = await progressService.listAdminProgress(req.query);
  return res.json(result);
}

import { vocabularyService } from "./vocabulary.service.js";

export async function listPublic(req, res) {
  return res.json({ data: await vocabularyService.listPublic(req.query) });
}
export async function listAdmin(_req, res) {
  return res.json({ data: await vocabularyService.listAdmin() });
}
export async function getAdmin(req, res) {
  return res.json({ data: await vocabularyService.getAdmin(req.params.id) });
}
export async function create(req, res) {
  return res
    .status(201)
    .json({ data: await vocabularyService.create(req.body) });
}
export async function importBatch(req, res) {
  return res.status(201).json({
    data: await vocabularyService.importBatch(req.body),
  });
}
export async function update(req, res) {
  return res.json({
    data: await vocabularyService.update(req.params.id, req.body),
  });
}
export async function remove(req, res) {
  await vocabularyService.delete(req.params.id);
  return res.json({ ok: true });
}
export async function save(req, res) {
  return res.json({
    data: await vocabularyService.save(req.user, req.params.id),
  });
}
export async function unsave(req, res) {
  return res.json({
    data: await vocabularyService.unsave(req.user, req.params.id),
  });
}
export async function listSaved(req, res) {
  return res.json({ data: await vocabularyService.listSaved(req.user) });
}

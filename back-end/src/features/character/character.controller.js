import { characterService } from "./character.service.js";

export async function listPublic(req, res) {
  return res.json(await characterService.listPublic(req.query));
}

export async function getPublic(req, res) {
  return res.json({
    data: await characterService.getPublic(req.params.identifier),
  });
}

export async function getStrokeData(req, res) {
  return res.json({
    data: await characterService.getStrokeData(req.params.identifier),
  });
}

export async function compare(req, res) {
  return res.json({
    data: await characterService.compare(req.params.identifier, req.body),
  });
}

export async function listAdmin(req, res) {
  return res.json(await characterService.listAdmin(req.query));
}

export async function getAdmin(req, res) {
  return res.json({ data: await characterService.getAdmin(req.params.id) });
}

export async function create(req, res) {
  return res
    .status(201)
    .json({ data: await characterService.create(req.body) });
}

export async function update(req, res) {
  return res.json({
    data: await characterService.update(req.params.id, req.body),
  });
}

export async function remove(req, res) {
  await characterService.delete(req.params.id);
  return res.json({ ok: true });
}

export async function bulkStatus(req, res) {
  return res.json({ data: await characterService.bulkStatus(req.body) });
}

export async function bulkDelete(req, res) {
  return res.json({ data: await characterService.bulkDelete(req.body) });
}

export async function submitAttempt(req, res) {
  return res.status(201).json({
    data: await characterService.submitAttempt(
      req.user,
      req.params.characterId,
      req.body,
    ),
  });
}

export async function getAttemptSummary(req, res) {
  return res.json({
    data: await characterService.getAttemptSummary(
      req.user,
      req.params.characterId,
    ),
  });
}

export async function getOwnAttempt(req, res) {
  return res.json({
    data: await characterService.getOwnAttempt(req.user, req.params.attemptId),
  });
}

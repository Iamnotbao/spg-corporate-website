import { trashService } from "./trash.service.js";

export async function listTrash(req, res) {
  return res.json(await trashService.list(req.query));
}

export async function restoreTrash(req, res) {
  return res.json({
    ok: true,
    data: await trashService.restore(req.params.type, req.params.id),
  });
}

export async function purgeTrash(req, res) {
  return res.json({
    ok: true,
    data: await trashService.purge(req.params.type, req.params.id),
  });
}

export async function emptyTrash(_req, res) {
  return res.json({ ok: true, data: await trashService.empty() });
}

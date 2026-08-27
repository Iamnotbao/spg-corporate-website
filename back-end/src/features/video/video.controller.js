import { videoService } from "./video.service.js";
export const listAdmin = async (req, res) => res.json(await videoService.listAdmin(req.query));
export const listPublished = async (req, res) => res.json(await videoService.listPublished(req.query));
export const getAdmin = async (req, res) => res.json({ data: await videoService.getAdmin(req.params.id) });
export const create = async (req, res) => res.status(201).json({ data: await videoService.create(req.body) });
export const update = async (req, res) => res.json({ data: await videoService.update(req.params.id, req.body) });
export async function remove(req, res) { await videoService.delete(req.params.id); return res.json({ ok: true }); }

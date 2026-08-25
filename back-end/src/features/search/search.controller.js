import { searchPublicContent } from "./search.service.js";

export async function searchPublic(req, res) {
  return res.json({ data: await searchPublicContent(req.query) });
}

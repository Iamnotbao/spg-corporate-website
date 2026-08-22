import {
  serializeStudent,
  studentAuthService,
} from "./student-auth.service.js";

export async function register(req, res) {
  const result = await studentAuthService.register(req.body);
  return res.status(201).json({ ok: true, ...result });
}

export async function login(req, res) {
  const result = await studentAuthService.login(req.body);
  return res.json({ ok: true, ...result });
}

export function session(req, res) {
  return res.json({ ok: true, user: serializeStudent(req.user) });
}

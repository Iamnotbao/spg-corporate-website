import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(req, res, next) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing admin token" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

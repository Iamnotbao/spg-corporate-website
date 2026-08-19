import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(req, res, next) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing access token" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload?.role || !["admin", "employee"].includes(payload.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permission" });
    }
    return next();
  };
}

export const requireAdmin = requireRole("admin");

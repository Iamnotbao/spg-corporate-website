import jwt from "jsonwebtoken";
import { getCollection } from "../config/db.js";
import { env } from "../config/env.js";
import { toObjectId } from "../utils/objectId.js";
import { hasPermission, normalizePermissions } from "../utils/permissions.js";

export async function auth(req, res, next) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing access token" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }

  const id = toObjectId(payload?.sub);
  if (!id) return res.status(401).json({ error: "Invalid access token" });

  const collection = await getCollection("users");
  const user = await collection.findOne({ _id: id });
  if (!user || user.active === false || !["admin", "employee"].includes(user.role)) {
    return res.status(401).json({ error: "Account is disabled or unavailable" });
  }

  req.user = {
    ...user,
    permissions: normalizePermissions(user.permissions, user.role),
  };
  return next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.user, permission)) {
      return res.status(403).json({ error: `Permission required: ${permission}` });
    }
    return next();
  };
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

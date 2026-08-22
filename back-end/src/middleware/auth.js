import jwt from "jsonwebtoken";
import { getCollection } from "../config/db.js";
import { env } from "../config/env.js";
import { toObjectId } from "../utils/objectId.js";
import { hasPermission, normalizePermissions } from "../utils/permissions.js";
import { isAuthenticatedRole } from "../utils/roles.js";

async function findUserById(id) {
  const collection = await getCollection("users");
  return collection.findOne({ _id: id });
}

export function createAuthMiddleware(options = {}) {
  const loadUser = options.findUserById || findUserById;

  return async function authenticate(req, res, next) {
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

    const user = await loadUser(id);
    const role = String(user?.role || "")
      .trim()
      .toLowerCase();
    if (!user || user.active === false || !isAuthenticatedRole(role)) {
      return res
        .status(401)
        .json({ error: "Account is disabled or unavailable" });
    }

    req.user = {
      ...user,
      role,
      permissions: normalizePermissions(user.permissions, role),
    };
    return next();
  };
}

export const auth = createAuthMiddleware();

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.user, permission)) {
      return res
        .status(403)
        .json({ error: `Permission required: ${permission}` });
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

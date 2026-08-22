import jwt from "jsonwebtoken";
import { getCollection } from "../config/db.js";
import { env } from "../config/env.js";
import { toObjectId } from "../utils/objectId.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { normalizePermissions, PERMISSIONS } from "../utils/permissions.js";
import {
  AUTHENTICATED_ROLES,
  isAuthenticatedRole,
  LEGACY_CMS_ROLE,
  MANDORA_ROLES,
} from "../utils/roles.js";

const FILTERABLE_ROLES = AUTHENTICATED_ROLES;
const ASSIGNABLE_ROLES = new Set(MANDORA_ROLES);

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  const role = String(user.role || "")
    .trim()
    .toLowerCase();
  if (!isAuthenticatedRole(role)) return null;
  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName || user.username,
    role,
    permissions: normalizePermissions(user.permissions, role),
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function ensureIndexes(collection) {
  await collection.createIndex({ username: 1 }, { unique: true });
}

async function bootstrapAdmin(username, password) {
  if (username !== env.adminUsername || password !== env.adminPassword)
    return null;

  const collection = await getCollection("users");
  await ensureIndexes(collection);
  const existing = await collection.findOne({ username });
  if (existing) return existing;

  const document = {
    username,
    displayName: "Administrator",
    passwordHash: hashPassword(password),
    role: "admin",
    permissions: ["*"],
    active: true,
    createdAt: new Date(),
  };
  const result = await collection.insertOne(document);
  return { ...document, _id: result.insertedId };
}

export async function login(req, res) {
  const username = normalizeUsername(req.body?.username || env.adminUsername);
  const password = String(req.body?.password || "");
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const collection = await getCollection("users");
  await ensureIndexes(collection);
  let user = await collection.findOne({ username });
  if (!user) user = await bootstrapAdmin(username, password);

  if (
    !user ||
    !isAuthenticatedRole(user.role) ||
    user.active === false ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
    },
    env.jwtSecret,
    { expiresIn: "8h" },
  );

  return res.json({ ok: true, token, user: publicUser(user) });
}

export function session(req, res) {
  return res.json({ ok: true, user: publicUser(req.user) });
}

export function listPermissions(_req, res) {
  return res.json({ data: PERMISSIONS });
}

export async function listUsers(req, res) {
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const search = String(req.query.search || "").trim();
  const role = String(req.query.role || "").trim();
  const filter = {};

  if (search) {
    filter.$or = ["username", "displayName"].map((field) => ({
      [field]: {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      },
    }));
  }
  if (FILTERABLE_ROLES.has(role)) filter.role = role;

  const collection = await getCollection("users");
  const total = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const users = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return res.json({
    data: users.map(publicUser),
    pagination: { page, pageSize, total, totalPages },
  });
}

export async function createUser(req, res) {
  const username = normalizeUsername(req.body?.username);
  const displayName = String(req.body?.displayName || username).trim();
  const role = String(req.body?.role || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return res
      .status(400)
      .json({ error: "Username must be 3-40 valid characters" });
  }
  if (!ASSIGNABLE_ROLES.has(role))
    return res.status(400).json({ error: "Invalid role" });

  let passwordHash;
  try {
    passwordHash = hashPassword(password);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const collection = await getCollection("users");
  await ensureIndexes(collection);
  try {
    const document = {
      username,
      displayName: displayName || username,
      passwordHash,
      role,
      permissions: normalizePermissions(req.body?.permissions, role),
      active: req.body?.active !== false,
      createdAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return res
      .status(201)
      .json({ data: publicUser({ ...document, _id: result.insertedId }) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "Username already exists" });
    }
    throw error;
  }
}

export async function updateUser(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid user id" });

  const collection = await getCollection("users");
  const existing = await collection.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const update = { updatedAt: new Date() };
  let nextRole = existing.role || "employee";

  if (req.body?.displayName != null) {
    update.displayName = String(
      req.body.displayName || existing.username,
    ).trim();
  }
  if (req.body?.role != null) {
    nextRole = String(req.body.role).trim().toLowerCase();
    const keepsLegacyRole =
      existing.role === LEGACY_CMS_ROLE && nextRole === LEGACY_CMS_ROLE;
    if (!ASSIGNABLE_ROLES.has(nextRole) && !keepsLegacyRole) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (String(existing._id) === String(req.user._id) && nextRole !== "admin") {
      return res
        .status(400)
        .json({ error: "You cannot remove your own admin role" });
    }
    update.role = nextRole;
  }
  if (req.body?.permissions != null || req.body?.role != null) {
    update.permissions = normalizePermissions(
      req.body?.permissions != null
        ? req.body.permissions
        : existing.permissions,
      nextRole,
    );
  }
  if (req.body?.active != null) {
    const active = Boolean(req.body.active);
    if (String(existing._id) === String(req.user._id) && !active) {
      return res
        .status(400)
        .json({ error: "You cannot disable your own account" });
    }
    update.active = active;
  }
  if (req.body?.password) {
    try {
      update.passwordHash = hashPassword(req.body.password);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  await collection.updateOne({ _id: id }, { $set: update });
  return res.json({ data: publicUser({ ...existing, ...update }) });
}

export async function deleteUser(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid user id" });
  if (String(id) === String(req.user._id)) {
    return res
      .status(400)
      .json({ error: "You cannot delete your own account" });
  }

  const collection = await getCollection("users");
  const result = await collection.deleteOne({ _id: id });
  if (!result.deletedCount)
    return res.status(404).json({ error: "User not found" });
  return res.json({ ok: true });
}

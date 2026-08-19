import { getCollection } from "../config/db.js";
import { toObjectId } from "../utils/objectId.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLanguage(body = {}) {
  const code = String(body.code || "").trim().toLowerCase();
  return {
    code,
    titleNameE: String(body.titleNameE ?? body.title_name_e ?? "").trim(),
    titleNameL: String(body.titleNameL ?? body.title_name_l ?? "").trim(),
    titleNameT: String(body.titleNameT ?? body.title_name_t ?? "").trim(),
    enabled: body.enabled !== false,
    isDefault: body.isDefault === true,
    sortOrder: Math.max(0, Math.trunc(Number(body.sortOrder) || 0)),
  };
}

async function ensureIndexes(collection) {
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ enabled: 1, sortOrder: 1 });
}

async function clearOtherDefaults(collection, exceptId = null) {
  const filter = { isDefault: true };
  if (exceptId) filter._id = { $ne: exceptId };
  await collection.updateMany(filter, { $set: { isDefault: false, updatedAt: new Date() } });
}

export async function listPublicLanguages(_req, res) {
  const collection = await getCollection("languages");
  await ensureIndexes(collection);
  const items = await collection
    .find({ enabled: { $ne: false } })
    .sort({ isDefault: -1, sortOrder: 1, code: 1 })
    .toArray();
  return res.json({ data: items });
}

export async function listLanguages(req, res) {
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(50, Math.max(1, Math.trunc(Number(req.query.pageSize)) || 10));
  const search = String(req.query.search || "").trim();
  const filter = search
    ? {
        $or: ["code", "titleNameE", "titleNameL", "titleNameT"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" },
        })),
      }
    : {};

  const collection = await getCollection("languages");
  await ensureIndexes(collection);
  const total = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(page, totalPages);
  const items = await collection
    .find(filter)
    .sort({ isDefault: -1, sortOrder: 1, code: 1 })
    .skip((resolvedPage - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return res.json({
    data: items,
    pagination: { page: resolvedPage, pageSize, total, totalPages },
  });
}

export async function createLanguage(req, res) {
  const payload = normalizeLanguage(req.body);
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(payload.code)) {
    return res.status(400).json({ error: "Mã ngôn ngữ không hợp lệ. Ví dụ: vi, en, zh-tw." });
  }
  if (!payload.titleNameE && !payload.titleNameL && !payload.titleNameT) {
    return res.status(400).json({ error: "Cần ít nhất một tên hiển thị cho ngôn ngữ." });
  }

  const collection = await getCollection("languages");
  await ensureIndexes(collection);
  const now = new Date();
  try {
    const document = { ...payload, createdAt: now, updatedAt: now };
    const result = await collection.insertOne(document);
    if (payload.isDefault) await clearOtherDefaults(collection, result.insertedId);
    return res.status(201).json({ data: { ...document, _id: result.insertedId } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Mã ngôn ngữ đã tồn tại." });
    throw error;
  }
}

export async function updateLanguage(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid language id" });

  const collection = await getCollection("languages");
  await ensureIndexes(collection);
  const existing = await collection.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Language not found" });

  const payload = normalizeLanguage({ ...existing, ...req.body });
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(payload.code)) {
    return res.status(400).json({ error: "Mã ngôn ngữ không hợp lệ." });
  }

  try {
    await collection.updateOne({ _id: id }, { $set: { ...payload, updatedAt: new Date() } });
    if (payload.isDefault) await clearOtherDefaults(collection, id);
    return res.json({ data: { ...existing, ...payload, updatedAt: new Date() } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Mã ngôn ngữ đã tồn tại." });
    throw error;
  }
}

export async function deleteLanguage(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid language id" });
  const collection = await getCollection("languages");
  const existing = await collection.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Language not found" });
  if (existing.isDefault) {
    return res.status(400).json({ error: "Không thể xóa ngôn ngữ mặc định. Hãy chọn mặc định khác trước." });
  }
  await collection.deleteOne({ _id: id });
  return res.json({ ok: true });
}

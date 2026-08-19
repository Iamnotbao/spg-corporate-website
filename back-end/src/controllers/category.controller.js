import { getCollection } from "../config/db.js";
import { toObjectId } from "../utils/objectId.js";

const DEFAULT_CATEGORIES = [
  ["activity", "Hoạt động"],
  ["talent", "Phát triển nhân tài"],
  ["union", "Công đoàn"],
  ["company", "Tin doanh nghiệp"],
  ["achievement", "Thành tựu"],
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function slugify(value) {
  return String(value || "")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureDefaults() {
  const collection = await getCollection("categories");
  await collection.createIndex({ slug: 1 }, { unique: true });
  if ((await collection.estimatedDocumentCount()) > 0) return collection;

  const now = new Date();
  await collection.insertMany(
    DEFAULT_CATEGORIES.map(([slug, name], index) => ({
      slug,
      name,
      description: "",
      type: "posts",
      active: true,
      order: index + 1,
      createdAt: now,
      updatedAt: now,
    })),
  );
  return collection;
}

export async function listPublicCategories(req, res) {
  const collection = await ensureDefaults();
  const type = String(req.query.type || "posts");
  const items = await collection
    .find({ type, active: { $ne: false } })
    .sort({ order: 1, name: 1 })
    .limit(100)
    .toArray();
  return res.json({ data: items });
}

export async function listCategories(req, res) {
  const collection = await ensureDefaults();
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const search = String(req.query.search || "").trim();
  const type = String(req.query.type || "posts").trim();
  const filter = { type };

  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { slug: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
    ];
  }

  const total = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await collection
    .find(filter)
    .sort({ order: 1, createdAt: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  return res.json({ data: items, pagination: { page, pageSize, total, totalPages } });
}

export async function createCategory(req, res) {
  const name = String(req.body?.name || "").trim();
  const slug = slugify(req.body?.slug || name);
  if (!name || !slug) return res.status(400).json({ error: "Tên category là bắt buộc." });

  const collection = await ensureDefaults();
  const document = {
    name,
    slug,
    description: String(req.body?.description || "").trim(),
    type: "posts",
    active: req.body?.active !== false,
    order: Number(req.body?.order) || 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const result = await collection.insertOne(document);
    return res.status(201).json({ data: { ...document, _id: result.insertedId } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Mã category đã tồn tại." });
    throw error;
  }
}

export async function updateCategory(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid category id" });
  const collection = await ensureDefaults();
  const existing = await collection.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Category not found" });

  const name = String(req.body?.name ?? existing.name).trim();
  const slug = slugify(req.body?.slug ?? existing.slug ?? name);
  const update = {
    name,
    slug,
    description: String(req.body?.description ?? existing.description ?? "").trim(),
    active: req.body?.active ?? existing.active ?? true,
    order: Number(req.body?.order ?? existing.order) || 100,
    updatedAt: new Date(),
  };

  try {
    await collection.updateOne({ _id: id }, { $set: update });
    if (slug !== existing.slug) {
      const posts = await getCollection("posts");
      await posts.updateMany({ category: existing.slug }, { $set: { category: slug } });
    }
    return res.json({ data: { ...existing, ...update } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Mã category đã tồn tại." });
    throw error;
  }
}

export async function deleteCategory(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid category id" });
  const collection = await ensureDefaults();
  const existing = await collection.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Category not found" });

  const posts = await getCollection("posts");
  const used = await posts.countDocuments({ category: existing.slug }, { limit: 1 });
  if (used) {
    return res.status(409).json({ error: "Category đang được bài viết sử dụng. Hãy chuyển category trước khi xóa." });
  }

  await collection.deleteOne({ _id: id });
  return res.json({ ok: true });
}

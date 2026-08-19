import { getCollection } from "../config/db.js";
import { toObjectId } from "../utils/objectId.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function listPublicContent(type, req, res) {
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || req.query.limit) || 50));
  const search = String(req.query.search || "").trim();
  const filter = { published: { $ne: false } };

  if (search) {
    const safe = escapeRegex(search);
    filter.$or = ["title", "summary", "description", "content", "location"].map((field) => ({
      [field]: { $regex: safe, $options: "i" },
    }));
  }
  if (type === "posts" && req.query.category) filter.category = String(req.query.category);
  if (type === "jobs" && req.query.type) filter.type = String(req.query.type);

  const collection = await getCollection(type);
  const total = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const data = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return res.json({
    data,
    source: "mongodb",
    pagination: { page, pageSize, total, totalPages },
  });
}

export async function listJobs(req, res) {
  return listPublicContent("jobs", req, res);
}

export async function listPosts(req, res) {
  return listPublicContent("posts", req, res);
}

export async function getPublicItem(collectionName, req, res) {
  const id = toObjectId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const collection = await getCollection(collectionName);
  const item = await collection.findOne({
    _id: id,
    published: { $ne: false },
  });

  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json({ data: item });
}

export async function createApplication(req, res) {
  const {
    name,
    email,
    phone = "",
    position,
    jobId = "",
    jobTitle = "",
    message = "",
    coverLetter = "",
    cvUrl = "",
    cvName = "",
    cvType = "",
    cvSize = 0,
    cvPublicId = "",
    cvFormat = "",
    cvResourceType = "",
    cvDeliveryType = "",
  } = req.body;
  const resolvedPosition = position || jobTitle;

  if (!name?.trim() || !email?.trim() || !resolvedPosition?.trim()) {
    return res.status(400).json({ error: "name, email and position are required" });
  }

  const collection = await getCollection("applications");
  const result = await collection.insertOne({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    position: resolvedPosition.trim(),
    jobId,
    message: message || coverLetter,
    cvUrl,
    cvName,
    cvType,
    cvSize: Number(cvSize) || 0,
    cvPublicId,
    cvFormat,
    cvResourceType,
    cvDeliveryType,
    createdAt: new Date(),
  });

  return res.status(201).json({ ok: true, id: result.insertedId });
}

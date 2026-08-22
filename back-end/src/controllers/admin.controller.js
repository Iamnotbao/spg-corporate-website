import jwt from "jsonwebtoken";
import { getCollection } from "../config/db.js";
import { env } from "../config/env.js";
import {
  createPrivateDownloadUrl,
  destroyAsset,
  isCloudinaryConfigured,
  uploadFile,
} from "../utils/cloudinary.js";
import {
  createCvDownloadMetadata,
  hasStoredCv,
  normalizeLegacyCvUrl,
  parseLegacyCloudinaryAsset,
  streamCvDownload,
} from "../utils/cvDownload.js";
import { toObjectId } from "../utils/objectId.js";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const privateCvFields = [
  "cv",
  "cvDeliveryType",
  "cvFilename",
  "cvFormat",
  "cvMimeType",
  "cvName",
  "cvOriginalName",
  "cvPublicId",
  "cvResourceType",
  "cvSize",
  "cvType",
  "cvUrl",
  "mimetype",
  "originalFilename",
  "resume",
  "resumeUrl",
];

function blockPublicIds(blocks = []) {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block) => {
    if (block?.type === "image") return block.publicId ? [block.publicId] : [];
    if (block?.type === "gallery" && Array.isArray(block.images)) {
      return block.images.map((image) => image?.publicId).filter(Boolean);
    }
    return [];
  });
}

function contentPublicIds(item = {}) {
  return [
    item.imagePublicId,
    ...(Array.isArray(item.imagePublicIds) ? item.imagePublicIds : []),
    ...blockPublicIds(item.contentBlocks),
  ].filter(Boolean);
}

async function cleanupImage(publicId) {
  if (!publicId) return;
  try {
    await destroyAsset(publicId);
  } catch (error) {
    console.error(
      "Unable to remove an unused Cloudinary image:",
      error.message,
    );
  }
}

async function cleanupImages(publicIds = []) {
  await Promise.all([...new Set(publicIds.filter(Boolean))].map(cleanupImage));
}

// Kept only for legacy direct imports. The active /admin/verify route uses account login.
export function verify(req, res) {
  const password = String(
    req.body?.password ?? req.body?.adminPassword ?? "",
  ).trim();
  if (!password || password !== env.adminPassword) {
    return res.status(401).json({ error: "Invalid admin password" });
  }
  const token = jwt.sign({ role: "admin" }, env.jwtSecret, { expiresIn: "8h" });
  return res.json({ ok: true, token });
}

function queryFor(type, query) {
  const filter = {};
  const search = String(query.search || "").trim();
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { summary: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { location: { $regex: safeSearch, $options: "i" } },
    ];
  }
  if (query.published === "true") filter.published = { $ne: false };
  if (query.published === "false") filter.published = false;
  if (type === "posts" && query.category)
    filter.category = String(query.category);
  if (type === "jobs") {
    if (query.type) filter.type = query.type;
    if (query.location) {
      filter.location = { $regex: escapeRegex(query.location), $options: "i" };
    }
  }
  return filter;
}

export async function list(type, req, res) {
  const requestedPage = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.trunc(Number(req.query.pageSize)) || 10),
  );
  const filter = queryFor(type, req.query);
  const collection = await getCollection(type);
  const total = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  res.json({ data: items, pagination: { page, pageSize, total, totalPages } });
}

export async function create(type, req, res) {
  const collection = await getCollection(type);
  const result = await collection.insertOne({
    ...req.body,
    createdAt: new Date(),
  });
  res.status(201).json({ ok: true, id: result.insertedId });
}

export async function update(type, req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const collection = await getCollection(type);
  const existing = await collection.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const result = await collection.updateOne(
    { _id: id },
    { $set: { ...req.body, updatedAt: new Date() } },
  );

  const previousIds = new Set(contentPublicIds(existing));
  const nextItem = { ...existing, ...req.body };
  const nextIds = new Set(contentPublicIds(nextItem));
  const removedIds = [...previousIds].filter(
    (publicId) => !nextIds.has(publicId),
  );
  await cleanupImages(removedIds);

  return res.json({ ok: true, modified: result.modifiedCount });
}

export async function remove(type, req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const collection = await getCollection(type);
  const existing = await collection.findOne({ _id: id });
  const result = await collection.deleteOne({ _id: id });
  if (result.deletedCount) await cleanupImages(contentPublicIds(existing));
  return res.json({ ok: true, deleted: result.deletedCount });
}

export async function bulkRemove(type, req, res) {
  const ids = (req.body.ids || []).map(toObjectId).filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: "No ids provided" });
  const collection = await getCollection(type);
  const items = await collection
    .find(
      { _id: { $in: ids } },
      { projection: { imagePublicId: 1, imagePublicIds: 1, contentBlocks: 1 } },
    )
    .toArray();
  const result = await collection.deleteMany({ _id: { $in: ids } });
  await cleanupImages(items.flatMap(contentPublicIds));
  return res.json({ ok: true, deleted: result.deletedCount });
}

export async function getOne(type, req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const collection = await getCollection(type);
  const item = await collection.findOne({ _id: id });
  if (!item) return res.status(404).json({ error: "Not found" });
  return res.json({ data: item });
}

export async function listApplications(req, res) {
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const search = String(req.query.search || "").trim();
  const filter = search
    ? {
        $or: ["name", "email", "phone", "position"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" },
        })),
      }
    : {};
  const collection = await getCollection("applications");
  const total = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const applications = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  const safeApplications = applications.map((application) => {
    const safeApplication = { ...application };
    privateCvFields.forEach((field) => delete safeApplication[field]);
    return { ...safeApplication, hasCv: hasStoredCv(application) };
  });
  res.json({
    data: safeApplications,
    pagination: { page, pageSize, total, totalPages },
  });
}

export async function uploadImage(req, res) {
  if (!req.file)
    return res.status(400).json({ error: "Image file is required" });
  const requestedFolder = String(req.body.folder || "mandora/content");
  const allowedFolder =
    /^(?:mandora\/(?:blog|content)|spg\/(?:posts|jobs|content))$/;
  const folder = allowedFolder.test(requestedFolder)
    ? requestedFolder
    : "mandora/content";
  const uploaded = await uploadFile(req.file, { folder });
  return res.status(201).json({
    data: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
    },
  });
}

export async function downloadApplicationCv(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const collection = await getCollection("applications");
  const item = await collection.findOne({ _id: id });
  if (!item) return res.status(404).json({ error: "Application not found" });

  const legacySource = item.cvUrl || item.cv || item.resumeUrl || item.resume;
  const legacyCvUrl = normalizeLegacyCvUrl(legacySource);
  const legacyAsset = parseLegacyCloudinaryAsset(
    legacySource,
    env.cloudinary.cloudName,
  );
  let cvUrl = "";

  if (item.cvPublicId) {
    cvUrl = createPrivateDownloadUrl({
      publicId: item.cvPublicId,
      format: item.cvFormat,
      resourceType: item.cvResourceType || "raw",
      type: item.cvDeliveryType || "authenticated",
    });
  } else if (legacyAsset && isCloudinaryConfigured()) {
    cvUrl = createPrivateDownloadUrl({
      ...legacyAsset,
      format:
        legacyAsset.format ||
        createCvDownloadMetadata(item, { sourceUrl: legacyCvUrl }).extension,
    });
  } else {
    cvUrl = legacyCvUrl;
  }

  if (!cvUrl) return res.status(404).json({ error: "CV not found" });
  await streamCvDownload({ item, sourceUrl: cvUrl, res });
  return undefined;
}

export async function getLogo(_, res) {
  const collection = await getCollection("settings");
  const logo = await collection.findOne({ _id: "logo" });
  res.json({ data: logo });
}

export async function updateLogo(req, res) {
  const collection = await getCollection("settings");
  await collection.updateOne(
    { _id: "logo" },
    { $set: { url: req.body.url, updatedAt: new Date() } },
    { upsert: true },
  );
  res.json({ ok: true });
}

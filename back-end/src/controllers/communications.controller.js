import { getCollection } from "../config/db.js";
import { broadcastRealtime } from "../utils/realtime.js";
import { toObjectId } from "../utils/objectId.js";

function normalizeBanner(body = {}) {
  return {
    title: String(body.title || "").trim(),
    message: String(body.message || "").trim(),
    link: String(body.link || "").trim(),
    enabled: body.enabled === true,
    style: ["event", "info", "highlight"].includes(body.style) ? body.style : "event",
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    updatedAt: new Date(),
  };
}

function normalizeNotification(body = {}) {
  return {
    title: String(body.title || "").trim(),
    message: String(body.message || "").trim(),
    link: String(body.link || "").trim(),
    type: ["info", "event", "warning"].includes(body.type) ? body.type : "info",
    published: body.published !== false,
  };
}

function activeBannerQuery(now = new Date()) {
  return {
    _id: "public-banner",
    enabled: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }, { startsAt: { $exists: false } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }, { endsAt: { $exists: false } }] },
    ],
  };
}

export async function getPublicCommunications(_req, res) {
  const settings = await getCollection("settings");
  const notifications = await getCollection("notifications");
  const now = new Date();
  const [banner, items] = await Promise.all([
    settings.findOne(activeBannerQuery(now)),
    notifications.find({ published: { $ne: false } }).sort({ createdAt: -1 }).limit(8).toArray(),
  ]);

  return res.json({ data: { banner: banner || null, notifications: items } });
}

export async function getBanner(_req, res) {
  const collection = await getCollection("settings");
  const banner = await collection.findOne({ _id: "public-banner" });
  return res.json({ data: banner || null });
}

export async function updateBanner(req, res) {
  const collection = await getCollection("settings");
  const banner = normalizeBanner(req.body);
  await collection.updateOne(
    { _id: "public-banner" },
    { $set: banner },
    { upsert: true },
  );
  const saved = { _id: "public-banner", ...banner };
  broadcastRealtime("communications", { kind: "banner", action: "updated", item: saved });
  return res.json({ ok: true, data: saved });
}

export async function listNotifications(_req, res) {
  const collection = await getCollection("notifications");
  const items = await collection.find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return res.json({ data: items });
}

export async function createNotification(req, res) {
  const payload = normalizeNotification(req.body);
  if (!payload.title || !payload.message) {
    return res.status(400).json({ error: "Tiêu đề và nội dung thông báo là bắt buộc." });
  }

  const collection = await getCollection("notifications");
  const item = { ...payload, createdAt: new Date(), updatedAt: new Date() };
  const result = await collection.insertOne(item);
  const saved = { ...item, _id: result.insertedId };
  broadcastRealtime("communications", { kind: "notification", action: "created", item: saved });
  return res.status(201).json({ ok: true, data: saved });
}

export async function updateNotification(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const collection = await getCollection("notifications");
  const payload = { ...normalizeNotification(req.body), updatedAt: new Date() };
  const result = await collection.updateOne({ _id: id }, { $set: payload });
  if (!result.matchedCount) return res.status(404).json({ error: "Notification not found" });
  const saved = await collection.findOne({ _id: id });
  broadcastRealtime("communications", { kind: "notification", action: "updated", item: saved });
  return res.json({ ok: true, data: saved });
}

export async function deleteNotification(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const collection = await getCollection("notifications");
  const result = await collection.deleteOne({ _id: id });
  if (!result.deletedCount) return res.status(404).json({ error: "Notification not found" });
  broadcastRealtime("communications", { kind: "notification", action: "deleted", id: String(id) });
  return res.json({ ok: true });
}

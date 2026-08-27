import { getCollection } from "../config/db.js";
import { broadcastRealtime } from "../utils/realtime.js";
import { toObjectId } from "../utils/objectId.js";
import {
  paginationResult,
  parseAdminPagination,
  parseDateRange,
} from "../utils/pagination.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STUDENT_NOTIFICATION_STATE = "student_notification_state";
const STUDENT_NOTIFICATION_PREFERENCES = "student_notification_preferences";
let notificationStateIndexPromise;
let notificationPreferencesIndexPromise;

async function notificationStateCollection() {
  const collection = await getCollection(STUDENT_NOTIFICATION_STATE);
  if (!notificationStateIndexPromise) {
    notificationStateIndexPromise = collection
      .createIndex({ userId: 1, notificationId: 1 }, { unique: true })
      .catch((error) => {
        notificationStateIndexPromise = undefined;
        throw error;
      });
  }
  await notificationStateIndexPromise;
  return collection;
}

async function notificationPreferencesCollection() {
  const collection = await getCollection(STUDENT_NOTIFICATION_PREFERENCES);
  if (!notificationPreferencesIndexPromise) {
    notificationPreferencesIndexPromise = collection
      .createIndex({ userId: 1 }, { unique: true })
      .catch((error) => {
        notificationPreferencesIndexPromise = undefined;
        throw error;
      });
  }
  await notificationPreferencesIndexPromise;
  return collection;
}

function normalizeBanner(body = {}) {
  return {
    title: String(body.title || "").trim(),
    message: String(body.message || "").trim(),
    link: String(body.link || "").trim(),
    backgroundImageUrl: String(body.backgroundImageUrl || "").trim().slice(0, 1000),
    backgroundImagePublicId: String(body.backgroundImagePublicId || "").trim().slice(0, 300),
    enabled: body.enabled === true,
    style: ["event", "info", "highlight", "celebration"].includes(body.style)
      ? body.style
      : "event",
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
    type: ["info", "event", "warning"].includes(body.type)
      ? body.type
      : "info",
    published: body.published !== false,
  };
}

function activeBannerQuery(now = new Date()) {
  return {
    _id: "public-banner",
    enabled: true,
    $and: [
      {
        $or: [
          { startsAt: null },
          { startsAt: { $lte: now } },
          { startsAt: { $exists: false } },
        ],
      },
      {
        $or: [
          { endsAt: null },
          { endsAt: { $gte: now } },
          { endsAt: { $exists: false } },
        ],
      },
    ],
  };
}

function studentId(req) {
  return toObjectId(req.user?._id);
}

function stateByNotification(states) {
  return new Map(states.map((item) => [String(item.notificationId), item]));
}

export async function getPublicCommunications(_req, res) {
  const settings = await getCollection("settings");
  const notifications = await getCollection("notifications");
  const now = new Date();
  const [banner, items] = await Promise.all([
    settings.findOne(activeBannerQuery(now)),
    notifications
      .find({ published: { $ne: false } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ]);

  return res.json({ data: { banner: banner || null, notifications: items } });
}

export async function listStudentNotifications(req, res) {
  const userId = studentId(req);
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(20, Math.max(1, Number(req.query.pageSize) || 5));
  const notifications = await getCollection("notifications");
  const stateCollection = await notificationStateCollection();
  const preferencesCollection = await notificationPreferencesCollection();
  const [states, preferences] = await Promise.all([
    stateCollection.find({ userId }).toArray(),
    preferencesCollection.findOne({ userId }),
  ]);
  const statesById = stateByNotification(states);
  const hiddenIds = states
    .filter((item) => item.hiddenAt)
    .map((item) => item.notificationId);
  const readIds = states
    .filter((item) => item.readAt)
    .map((item) => item.notificationId);

  const visibleFilter = {
    published: { $ne: false },
    ...(preferences?.hiddenAllBefore
      ? { createdAt: { $gt: preferences.hiddenAllBefore } }
      : {}),
    ...(hiddenIds.length ? { _id: { $nin: hiddenIds } } : {}),
  };
  const unreadExcluded = [...new Map([...hiddenIds, ...readIds].map((id) => [String(id), id])).values()];
  const unreadFilter = {
    published: { $ne: false },
    ...(preferences?.hiddenAllBefore || preferences?.readAllBefore
      ? {
          createdAt: {
            $gt: new Date(
              Math.max(
                preferences?.hiddenAllBefore?.getTime?.() || 0,
                preferences?.readAllBefore?.getTime?.() || 0,
              ),
            ),
          },
        }
      : {}),
    ...(unreadExcluded.length ? { _id: { $nin: unreadExcluded } } : {}),
  };

  const [total, unreadTotal] = await Promise.all([
    notifications.countDocuments(visibleFilter),
    notifications.countDocuments(unreadFilter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await notifications
    .find(visibleFilter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return res.json({
    data: items.map((item) => {
      const state = statesById.get(String(item._id));
      return {
        ...item,
        read: Boolean(
          state?.readAt ||
            (preferences?.readAllBefore &&
              item.createdAt <= preferences.readAllBefore),
        ),
        readAt:
          state?.readAt ||
          (preferences?.readAllBefore && item.createdAt <= preferences.readAllBefore
            ? preferences.readAllBefore
            : null),
      };
    }),
    pagination: { page, pageSize, total, totalPages },
    unreadTotal,
  });
}

export async function persistStudentNotificationThreshold(
  preferences,
  userId,
  values,
  now = new Date(),
) {
  await preferences.updateOne(
    { userId },
    {
      $setOnInsert: { userId, createdAt: now },
      $set: { ...values, updatedAt: now },
    },
    { upsert: true },
  );
  return now;
}

async function updateStudentNotificationThreshold(userId, update) {
  const now = new Date();
  const preferences = await notificationPreferencesCollection();
  return persistStudentNotificationThreshold(
    preferences,
    userId,
    update(now),
    now,
  );
}

export async function markAllStudentNotificationsRead(req, res) {
  const userId = studentId(req);
  const readAllBefore = await updateStudentNotificationThreshold(userId, (now) => ({
    readAllBefore: now,
  }));
  return res.json({ ok: true, data: { readAllBefore } });
}

export async function clearAllStudentNotifications(req, res) {
  const userId = studentId(req);
  const hiddenAllBefore = await updateStudentNotificationThreshold(userId, (now) => ({
    hiddenAllBefore: now,
    readAllBefore: now,
  }));
  return res.json({ ok: true, data: { hiddenAllBefore } });
}

export async function markStudentNotificationRead(req, res) {
  const userId = studentId(req);
  const notificationId = toObjectId(req.params.id);
  if (!notificationId) return res.status(400).json({ error: "Invalid id" });
  const notifications = await getCollection("notifications");
  const notification = await notifications.findOne({
    _id: notificationId,
    published: { $ne: false },
  });
  if (!notification) return res.status(404).json({ error: "Notification not found" });

  const now = new Date();
  const states = await notificationStateCollection();
  await states.updateOne(
    { userId, notificationId },
    {
      $setOnInsert: { userId, notificationId, createdAt: now },
      $set: { readAt: now, updatedAt: now },
      $unset: { hiddenAt: "" },
    },
    { upsert: true },
  );
  return res.json({ ok: true, data: { id: String(notificationId), readAt: now } });
}

export async function dismissStudentNotification(req, res) {
  const userId = studentId(req);
  const notificationId = toObjectId(req.params.id);
  if (!notificationId) return res.status(400).json({ error: "Invalid id" });
  const notifications = await getCollection("notifications");
  const notification = await notifications.findOne({ _id: notificationId });
  if (!notification) return res.status(404).json({ error: "Notification not found" });

  const now = new Date();
  const states = await notificationStateCollection();
  await states.updateOne(
    { userId, notificationId },
    {
      $setOnInsert: { userId, notificationId, createdAt: now },
      $set: { readAt: now, hiddenAt: now, updatedAt: now },
    },
    { upsert: true },
  );
  return res.json({ ok: true });
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
  broadcastRealtime("communications", {
    kind: "banner",
    action: "updated",
    item: saved,
  });
  return res.json({ ok: true, data: saved });
}

export async function listNotifications(req, res) {
  const paging = parseAdminPagination(req.query);
  const search = String(req.query.search || "").trim();
  const filter = { ...parseDateRange(req.query) };

  if (search) {
    const safe = escapeRegex(search);
    filter.$or = ["title", "message"].map((field) => ({
      [field]: { $regex: safe, $options: "i" },
    }));
  }
  if (req.query.published === "true") filter.published = { $ne: false };
  if (req.query.published === "false") filter.published = false;

  const collection = await getCollection("notifications");
  const total = await collection.countDocuments(filter);
  const items = await collection
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(paging.skip)
    .limit(paging.pageSize)
    .toArray();
  return res.json({ data: items, pagination: paginationResult(paging, total) });
}

export async function createNotification(req, res) {
  const payload = normalizeNotification(req.body);
  if (!payload.title || !payload.message) {
    return res
      .status(400)
      .json({ error: "Tiêu đề và nội dung thông báo là bắt buộc." });
  }
  const collection = await getCollection("notifications");
  const item = { ...payload, createdAt: new Date(), updatedAt: new Date() };
  const result = await collection.insertOne(item);
  const saved = { ...item, _id: result.insertedId };
  broadcastRealtime("communications", {
    kind: "notification",
    action: "created",
    item: saved,
  });
  return res.status(201).json({ ok: true, data: saved });
}

export async function updateNotification(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const collection = await getCollection("notifications");
  const payload = { ...normalizeNotification(req.body), updatedAt: new Date() };
  const result = await collection.updateOne({ _id: id }, { $set: payload });
  if (!result.matchedCount) {
    return res.status(404).json({ error: "Notification not found" });
  }
  const saved = await collection.findOne({ _id: id });
  broadcastRealtime("communications", {
    kind: "notification",
    action: "updated",
    item: saved,
  });
  return res.json({ ok: true, data: saved });
}

export async function deleteNotification(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const collection = await getCollection("notifications");
  const result = await collection.deleteOne({ _id: id });
  if (!result.deletedCount) {
    return res.status(404).json({ error: "Notification not found" });
  }
  const states = await notificationStateCollection();
  await states.deleteMany({ notificationId: id });
  broadcastRealtime("communications", {
    kind: "notification",
    action: "deleted",
    id: String(id),
  });
  return res.json({ ok: true });
}

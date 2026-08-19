import { getCollection } from "../config/db.js";
import { broadcastRealtime } from "../utils/realtime.js";

const PROFILE_ID = "public-site-profile";
const MAX_METRICS = 6;
const MAX_PARTNERS = 24;

function safeText(value, max = 160) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function safeUrl(value) {
  const source = safeText(value, 900);
  if (!source) return "";
  try {
    const url = new URL(source);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics.slice(0, MAX_METRICS).map((item, index) => ({
    id: safeText(item?.id, 80) || `metric-${index + 1}`,
    value: Math.max(0, Math.min(999999999, Number(item?.value) || 0)),
    suffix: safeText(item?.suffix, 24),
    label: safeText(item?.label, 100),
    note: safeText(item?.note, 220),
    enabled: item?.enabled !== false,
  }));
}

function normalizePartners(partners) {
  if (!Array.isArray(partners)) return [];
  return partners.slice(0, MAX_PARTNERS).map((item, index) => ({
    id: safeText(item?.id, 80) || `partner-${index + 1}`,
    name: safeText(item?.name, 120),
    logoUrl: safeUrl(item?.logoUrl),
    logoPublicId: safeText(item?.logoPublicId, 300),
    link: safeUrl(item?.link),
    enabled: item?.enabled !== false,
  })).filter((item) => item.name || item.logoUrl);
}

function normalizeLocation(location = {}) {
  return {
    name: safeText(location?.name, 160),
    address: safeText(location?.address, 500),
    mapsUrl: safeUrl(location?.mapsUrl),
  };
}

function publicProfile(document = {}) {
  return {
    metrics: normalizeMetrics(document.metrics),
    partners: normalizePartners(document.partners),
    location: normalizeLocation(document.location),
  };
}

export async function getPublicSiteProfile(_req, res) {
  const settings = await getCollection("settings");
  const document = await settings.findOne({ _id: PROFILE_ID });
  return res.json({ data: publicProfile(document || {}) });
}

export async function getAdminSiteProfile(_req, res) {
  return getPublicSiteProfile(_req, res);
}

export async function updateAdminSiteProfile(req, res) {
  const settings = await getCollection("settings");
  const payload = {
    metrics: normalizeMetrics(req.body?.metrics),
    partners: normalizePartners(req.body?.partners),
    location: normalizeLocation(req.body?.location),
    updatedAt: new Date(),
  };
  await settings.updateOne(
    { _id: PROFILE_ID },
    { $set: payload },
    { upsert: true },
  );
  broadcastRealtime("site-profile", { kind: "updated" });
  return res.json({ data: publicProfile(payload) });
}

export class VideoValidationError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

const STATUSES = ["draft", "published"];
const SOURCES = ["cloudinary", "youtube", "vimeo"];

function clean(value, field, max, required = false) {
  const result = String(value ?? "").trim();
  if (required && !result) throw new VideoValidationError(`${field} is required`);
  if (result.length > max) throw new VideoValidationError(`${field} is too long`);
  return result;
}

export function trustedEmbed(sourceType, value) {
  if (sourceType === "cloudinary") return "";
  let url;
  try { url = new URL(value); } catch { throw new VideoValidationError("A valid video URL is required"); }
  if (url.protocol !== "https:") throw new VideoValidationError("External videos must use HTTPS");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (sourceType === "youtube") {
    let id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    if (["youtube.com", "m.youtube.com"].includes(host) && url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2];
    if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host) || !/^[\w-]{6,20}$/.test(id || "")) throw new VideoValidationError("Only trusted YouTube URLs are supported");
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (sourceType === "vimeo") {
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    if (!['vimeo.com', 'player.vimeo.com'].includes(host) || !/^\d+$/.test(id || "")) throw new VideoValidationError("Only trusted Vimeo URLs are supported");
    return `https://player.vimeo.com/video/${id}`;
  }
  throw new VideoValidationError("Invalid sourceType");
}

export function validateVideo(input = {}, { partial = false } = {}) {
  const allowed = ["title", "description", "videoUrl", "videoPublicId", "posterUrl", "duration", "hskLevel", "order", "status", "sourceType", "embedUrl", "featured"];
  const unknown = Object.keys(input || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new VideoValidationError(`Unknown fields: ${unknown.join(", ")}`);
  const result = {};
  for (const [field, max, required] of [["title", 160, !partial], ["description", 5000, !partial], ["videoUrl", 2000, false], ["videoPublicId", 300, false], ["posterUrl", 2000, false], ["hskLevel", 20, !partial]]) {
    if (!partial || input[field] !== undefined) result[field] = clean(input[field], field, max, required);
  }
  for (const [field, min, max] of [["duration", 0, 86400], ["order", 0, 10000]]) {
    if (!partial || input[field] !== undefined) {
      const value = Number(input[field] ?? 0);
      if (!Number.isFinite(value) || value < min || value > max) throw new VideoValidationError(`${field} is invalid`);
      result[field] = value;
    }
  }
  if (!partial || input.status !== undefined) {
    if (!STATUSES.includes(input.status)) throw new VideoValidationError(`status must be one of: ${STATUSES.join(", ")}`);
    result.status = input.status;
  }
  if (!partial || input.sourceType !== undefined) {
    if (!SOURCES.includes(input.sourceType)) throw new VideoValidationError(`sourceType must be one of: ${SOURCES.join(", ")}`);
    result.sourceType = input.sourceType;
  }
  if (input.featured !== undefined) {
    if (typeof input.featured !== "boolean") throw new VideoValidationError("featured must be boolean");
    result.featured = input.featured;
  }
  if (!partial) {
    if (result.sourceType === "cloudinary") {
      if (!result.videoUrl || !result.videoPublicId) throw new VideoValidationError("Cloudinary videoUrl and videoPublicId are required");
      result.embedUrl = "";
    } else {
      result.embedUrl = trustedEmbed(result.sourceType, input.embedUrl || result.videoUrl);
      result.videoUrl = clean(input.videoUrl || input.embedUrl, "videoUrl", 2000, true);
      result.videoPublicId = "";
    }
  }
  if (partial && !Object.keys(result).length) throw new VideoValidationError("At least one supported field is required");
  return result;
}

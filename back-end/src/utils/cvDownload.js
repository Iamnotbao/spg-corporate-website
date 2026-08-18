import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const CV_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const MAX_REDIRECTS = 4;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const LEGACY_RESOURCE_TYPES = new Set(["image", "raw"]);
const LEGACY_DELIVERY_TYPES = new Set(["authenticated", "private", "upload"]);
const TRUSTED_CLOUDINARY_HOSTS = new Set([
  "api.cloudinary.com",
  "res.cloudinary.com",
]);

const firstValue = (...values) =>
  values.find((value) => String(value || "").trim()) || "";

const extensionFromName = (value) => {
  const match = String(value || "").match(/\.([a-z0-9]+)(?:[?#].*)?$/i);
  const extension = match?.[1]?.toLowerCase();
  return Object.hasOwn(CV_TYPES, extension) ? extension : "";
};

const extensionFromMime = (value) => {
  const mime = String(value || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  return Object.entries(CV_TYPES).find(([, type]) => type === mime)?.[0] || "";
};

const originalFilenameFromHeader = (value) => {
  const disposition = String(value || "");
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return "";
    }
  }

  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || "";
};

const asciiFilename = (value) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return normalized || "CV-ung-vien";
};

const encodedFilename = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export function isCloudinaryUrl(value) {
  try {
    const url = new URL(String(value || ""));

    return (
      url.protocol === "https:" &&
      TRUSTED_CLOUDINARY_HOSTS.has(url.hostname) &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443")
    );
  } catch {
    return false;
  }
}

export function normalizeLegacyCvUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol === "http:") url.protocol = "https:";
    return isCloudinaryUrl(url) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function parseLegacyCloudinaryAsset(value, expectedCloudName) {
  try {
    const rawValue = String(value || "");
    if (/%(?:2e|2f|5c)/i.test(rawValue)) return null;

    const url = new URL(normalizeLegacyCvUrl(rawValue));

    if (
      url.hostname !== "res.cloudinary.com" ||
      url.search ||
      url.hash ||
      !expectedCloudName
    ) {
      return null;
    }

    const parts = url.pathname.split("/").slice(1);
    const [cloudName, resourceType, type, version, ...encodedPublicIdParts] =
      parts;

    if (
      cloudName !== expectedCloudName ||
      !LEGACY_RESOURCE_TYPES.has(resourceType) ||
      !LEGACY_DELIVERY_TYPES.has(type) ||
      !/^v\d+$/.test(version || "") ||
      !encodedPublicIdParts.length ||
      encodedPublicIdParts.some((part) => !part)
    ) {
      return null;
    }

    const publicIdParts = encodedPublicIdParts.map((part) =>
      decodeURIComponent(part),
    );
    const hasInvalidPart = publicIdParts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.length > 255 ||
        part.trim() !== part ||
        !/^[\p{L}\p{N}._~-]+$/u.test(part),
    );

    if (hasInvalidPart) return null;

    const lastPart = publicIdParts.at(-1);
    const format = extensionFromName(lastPart);

    if (resourceType === "image") {
      if (!format) return null;
      publicIdParts[publicIdParts.length - 1] = lastPart.slice(
        0,
        -(format.length + 1),
      );
    }

    if (!publicIdParts.at(-1)) return null;

    return {
      format,
      publicId: publicIdParts.join("/"),
      resourceType,
      type,
    };
  } catch {
    return null;
  }
}

export function hasStoredCv(item = {}) {
  return Boolean(
    firstValue(
      item.cvPublicId,
      item.cvUrl,
      item.cv,
      item.resumeUrl,
      item.resume,
    ),
  );
}

export function createCvDownloadMetadata(
  item = {},
  { upstreamContentType = "", upstreamDisposition = "", sourceUrl = "" } = {},
) {
  const originalName = firstValue(
    item.cvOriginalName,
    item.originalFilename,
    item.cvFilename,
    item.cvName,
    originalFilenameFromHeader(upstreamDisposition),
  );
  const declaredFormat = String(item.cvFormat || "").toLowerCase();
  const extension =
    extensionFromMime(
      firstValue(item.cvMimeType, item.mimetype, item.cvType),
    ) ||
    extensionFromMime(upstreamContentType) ||
    (Object.hasOwn(CV_TYPES, declaredFormat) ? declaredFormat : "") ||
    extensionFromName(originalName) ||
    extensionFromName(sourceUrl) ||
    "pdf";
  const leafName = String(originalName || "CV-ung-vien")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "-")
    .replace(/\.[^.]*$/, "")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);
  const baseName = leafName || "CV-ung-vien";
  const filename = `${baseName}.${extension}`;
  const fallbackFilename = `${asciiFilename(baseName).slice(0, 100)}.${extension}`;

  return {
    contentDisposition:
      `attachment; filename="${fallbackFilename}"; ` +
      `filename*=UTF-8''${encodedFilename(filename)}`,
    contentType: CV_TYPES[extension],
    extension,
    filename,
  };
}

export async function fetchCloudinaryCv(
  sourceUrl,
  { fetchImpl = globalThis.fetch, signal } = {},
) {
  let currentUrl = normalizeLegacyCvUrl(sourceUrl);

  if (!currentUrl) {
    const error = new Error("CV source is not allowed");
    error.status = 404;
    throw error;
  }

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    let response;

    try {
      response = await fetchImpl(currentUrl, {
        headers: {
          Accept:
            "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/octet-stream",
        },
        redirect: "manual",
        signal,
      });
    } catch (cause) {
      const error = new Error("Unable to retrieve CV");
      error.status = 502;
      error.cause = cause;
      throw error;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      let redirectUrl = "";

      try {
        redirectUrl = location ? new URL(location, currentUrl).toString() : "";
      } catch {
        redirectUrl = "";
      }

      if (!isCloudinaryUrl(redirectUrl) || redirectCount === MAX_REDIRECTS) {
        await response.body?.cancel().catch(() => undefined);
        const error = new Error("CV download redirect is not allowed");
        error.status = 502;
        throw error;
      }

      await response.body?.cancel().catch(() => undefined);
      currentUrl = redirectUrl;
      continue;
    }

    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      const error = new Error(
        response.status === 404 ? "CV not found" : "Unable to retrieve CV",
      );
      error.status = response.status === 404 ? 404 : 502;
      throw error;
    }

    return response;
  }

  const error = new Error("Unable to retrieve CV");
  error.status = 502;
  throw error;
}

export async function streamCvDownload({
  item,
  sourceUrl,
  res,
  fetchImpl = globalThis.fetch,
  timeoutMs = DOWNLOAD_TIMEOUT_MS,
}) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  const abortIfDisconnected = () => {
    if (!res.writableEnded) abortController.abort();
  };

  res.once("close", abortIfDisconnected);

  try {
    const upstream = await fetchCloudinaryCv(sourceUrl, {
      fetchImpl,
      signal: abortController.signal,
    });
    const metadata = createCvDownloadMetadata(item, {
      sourceUrl,
      upstreamContentType: upstream.headers.get("content-type"),
      upstreamDisposition: upstream.headers.get("content-disposition"),
    });

    res.statusCode = 200;
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", metadata.contentDisposition);
    res.setHeader("Content-Type", metadata.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");

    await pipeline(Readable.fromWeb(upstream.body), res);
  } finally {
    clearTimeout(timeout);
    res.off("close", abortIfDisconnected);
  }
}

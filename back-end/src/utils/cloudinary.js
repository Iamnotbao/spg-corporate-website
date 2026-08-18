import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

const configured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
);

if (configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const getResourceType = (file) => {
  const mime = String(file?.mimetype || "").toLowerCase();
  const originalName = String(file?.originalname || "").toLowerCase();
  const isDocument =
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("officedocument") ||
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i.test(originalName);

  return isDocument ? "raw" : "image";
};

export const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    if (!configured) {
      reject(new Error("Cloudinary upload is not configured"));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "spg",
        resource_type: options.resourceType || "auto",
        type: options.type,
        access_mode: options.accessMode,
        public_id: options.publicId,
        overwrite: options.overwrite,
        context: options.context,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    stream.end(buffer);
  });

export const uploadFile = async (file, options = {}) =>
  uploadBuffer(file.buffer, {
    ...options,
    resourceType: options.resourceType || getResourceType(file),
  });

export const uploadCv = async (file, options = {}) =>
  uploadBuffer(file.buffer, {
    ...options,
    folder: options.folder || "spg/cv",
    resourceType: "raw",
    type: "authenticated",
    context: {
      ...(options.context || {}),
      original_filename: file.originalname,
      original_mimetype: file.mimetype,
    },
  });

export const createPrivateDownloadUrl = ({
  publicId,
  format,
  resourceType = "raw",
  type = "authenticated",
  expiresInSeconds = 5 * 60,
}) => {
  if (!configured) {
    throw new Error("Cloudinary download is not configured");
  }

  return cloudinary.utils.private_download_url(publicId, format || "", {
    resource_type: resourceType,
    type,
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
};

export const destroyAsset = async (publicId, resourceType = "image") => {
  if (!configured) return;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export const isCloudinaryConfigured = () => configured;

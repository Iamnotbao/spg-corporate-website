import multer from "multer";

const MAX_CV_FILE_SIZE = 5 * 1024 * 1024;
const allowedCvTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const validateCvType = (_, file, callback) => {
  if (!allowedCvTypes.has(file.mimetype)) {
    const error = new Error("Unsupported CV file type");
    error.status = 415;
    error.code = "UNSUPPORTED_CV_FILE_TYPE";
    callback(error);
    return;
  }

  callback(null, true);
};

export const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CV_FILE_SIZE,
    files: 1,
    fields: 8,
    parts: 9,
    fieldNameSize: 100,
    fieldSize: 16 * 1024,
  },
  fileFilter: validateCvType,
});

const startsWith = (buffer, signature) =>
  signature.every((byte, index) => buffer[index] === byte);

export function validateCvSignature(req, _res, next) {
  if (!req.file) return next();

  const { buffer, mimetype } = req.file;
  const isPdf =
    mimetype === "application/pdf" &&
    buffer.subarray(0, 1_024).indexOf(Buffer.from("%PDF-")) >= 0;
  const isLegacyWord =
    mimetype === "application/msword" &&
    (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) ||
      buffer.subarray(0, 5).toString("ascii") === "{\\rtf");
  const isDocx =
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);

  if (isPdf || isLegacyWord || isDocx) return next();

  const error = new Error("CV file content does not match its declared type");
  error.status = 415;
  error.code = "INVALID_CV_SIGNATURE";
  return next(error);
}

const validateImageType = (_, file, callback) => {
  if (!allowedImageTypes.has(file.mimetype)) {
    const error = new Error("Unsupported image file type");
    error.status = 415;
    error.code = "UNSUPPORTED_IMAGE_FILE_TYPE";
    callback(error);
    return;
  }

  callback(null, true);
};

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 1,
    parts: 3,
    fieldNameSize: 100,
    fieldSize: 200,
  },
  fileFilter: validateImageType,
});

export function validateImageSignature(req, _res, next) {
  if (!req.file) return next();

  const { buffer, mimetype } = req.file;
  const isJpeg =
    mimetype === "image/jpeg" && startsWith(buffer, [0xff, 0xd8, 0xff]);
  const isPng =
    mimetype === "image/png" &&
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isGif =
    mimetype === "image/gif" &&
    ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  const isWebp =
    mimetype === "image/webp" &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (isJpeg || isPng || isGif || isWebp) return next();

  const error = new Error("Image content does not match its declared type");
  error.status = 415;
  error.code = "INVALID_IMAGE_SIGNATURE";
  return next(error);
}

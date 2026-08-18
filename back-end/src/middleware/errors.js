import multer from "multer";

const statusFor = (error) => {
  if (error instanceof multer.MulterError) {
    return error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  }

  const status = Number(error.status || error.statusCode);
  return status >= 400 && status <= 599 ? status : 500;
};

const messageFor = (error, status) => {
  if (error instanceof multer.MulterError) {
    return error.code === "LIMIT_FILE_SIZE"
      ? "File must be 5 MB or smaller"
      : "File upload failed";
  }

  if (status >= 500) {
    return "Internal server error";
  }

  return error.message || "Request failed";
};

export function notFound(_req, res) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = statusFor(error);
  return res.status(status).json({ error: messageFor(error, status) });
}

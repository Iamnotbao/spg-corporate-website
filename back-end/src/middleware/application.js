const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asText = (value) => (typeof value === "string" ? value.trim() : "");

export function validateApplication(req, res, next) {
  const name = asText(req.body.name);
  const email = asText(req.body.email).toLowerCase();
  const phone = asText(req.body.phone);
  const position = asText(req.body.position || req.body.jobTitle);
  const jobId = asText(req.body.jobId);
  const message = asText(req.body.message || req.body.coverLetter);

  if (!name || name.length > 120) {
    return res.status(400).json({ error: "Họ tên không hợp lệ." });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Email không hợp lệ." });
  }

  if (!position || position.length > 160) {
    return res.status(400).json({ error: "Vị trí ứng tuyển không hợp lệ." });
  }

  if (phone.length > 32 || jobId.length > 64 || message.length > 5_000) {
    return res
      .status(400)
      .json({ error: "Thông tin ứng tuyển vượt quá giới hạn." });
  }

  req.body = {
    name,
    email,
    phone,
    position,
    jobId,
    message,
  };

  return next();
}

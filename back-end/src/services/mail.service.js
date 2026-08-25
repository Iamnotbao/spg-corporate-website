import { env } from "../config/env.js";

function publicUrl(pathname, token) {
  const url = new URL(pathname, `${env.appPublicUrl}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

function messageFor(kind, url) {
  if (kind === "password-reset") {
    return {
      subject: "Đặt lại mật khẩu Mandora",
      text: `Mở liên kết sau để đặt lại mật khẩu Mandora. Liên kết hết hạn sau 30 phút:\n\n${url}`,
    };
  }
  return {
    subject: "Xác minh email Mandora",
    text: `Mở liên kết sau để xác minh email Mandora. Liên kết hết hạn sau 24 giờ:\n\n${url}`,
  };
}

export function createMailService({
  config = env.mail,
  fetchImpl = globalThis.fetch,
  logger = console,
  nodeEnv = process.env.NODE_ENV || "development",
} = {}) {
  async function deliver({ kind, to, token }) {
    const pathname =
      kind === "password-reset" ? "/reset-password" : "/verify-email";
    const url = publicUrl(pathname, token);
    const message = messageFor(kind, url);

    if (!config.provider) {
      if (nodeEnv === "production") {
        throw new Error("MAIL_PROVIDER is not configured");
      }
      logger.info(`[mail:development] ${kind} URL for ${to}: ${url}`);
      return { delivered: false, development: true };
    }

    if (config.provider !== "resend") {
      throw new Error(`Unsupported MAIL_PROVIDER: ${config.provider}`);
    }

    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Mandora/1.0",
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Mail provider rejected the request (${response.status})`,
      );
    }
    return { delivered: true, development: false };
  }

  return {
    sendPasswordReset({ to, token }) {
      return deliver({ kind: "password-reset", to, token });
    },
    sendEmailVerification({ to, token }) {
      return deliver({ kind: "email-verification", to, token });
    },
  };
}

export const mailService = createMailService();

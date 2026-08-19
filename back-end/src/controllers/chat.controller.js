import crypto from "node:crypto";
import { getCollection } from "../config/db.js";
import { env } from "../config/env.js";
import { broadcastRealtime } from "../utils/realtime.js";
import { addChatClient, broadcastChat } from "../utils/chatRealtime.js";
import {
  generateOpenAiChatReply,
  isOpenAiChatConfigured,
} from "../utils/openaiChat.js";

const SETTINGS_ID = "chat-settings";
const MAX_MESSAGE_LENGTH = 1200;

function publicSettings(settings = {}) {
  return {
    enabled: settings.enabled !== false,
    autoReplyEnabled: settings.autoReplyEnabled !== false,
    aiEnabled: settings.aiEnabled === true,
    welcomeMessage: String(settings.welcomeMessage || "Xin chào! Bạn cần SPG hỗ trợ nội dung gì?").trim(),
    fallbackMessage: String(settings.fallbackMessage || "Mình đã ghi nhận tin nhắn. Admin SPG sẽ phản hồi sớm nhất có thể.").trim(),
    facebookUrl: String(settings.facebookUrl || "").trim(),
    zaloUrl: String(settings.zaloUrl || "").trim(),
  };
}

function normalizeSettings(body = {}) {
  return {
    enabled: body.enabled !== false,
    autoReplyEnabled: body.autoReplyEnabled !== false,
    aiEnabled: body.aiEnabled === true,
    welcomeMessage: String(body.welcomeMessage || "").trim().slice(0, 500),
    fallbackMessage: String(body.fallbackMessage || "").trim().slice(0, 500),
    facebookUrl: String(body.facebookUrl || "").trim().slice(0, 500),
    zaloUrl: String(body.zaloUrl || "").trim().slice(0, 500),
    updatedAt: new Date(),
  };
}

function safeMessageText(value) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, MAX_MESSAGE_LENGTH);
}

function safeContact(value, max = 160) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

async function getSettings() {
  const settings = await getCollection("settings");
  return publicSettings((await settings.findOne({ _id: SETTINGS_ID })) || {});
}

async function findAuthorizedSession(sessionId, clientToken) {
  if (!sessionId || !clientToken) return null;
  const sessions = await getCollection("chat_sessions");
  return sessions.findOne({ sessionId, clientToken });
}

async function insertMessage(sessionId, sender, text, metadata = {}) {
  const messages = await getCollection("chat_messages");
  const document = {
    sessionId,
    sender,
    text: safeMessageText(text),
    ...metadata,
    createdAt: new Date(),
  };
  const result = await messages.insertOne(document);
  return { ...document, _id: result.insertedId };
}

function automatedReply(text, settings) {
  const normalized = String(text || "").toLocaleLowerCase("vi-VN");
  if (/tuy[eể]n|vi[eệ]c|career|job|ứng tuyển|ung tuyen/.test(normalized)) {
    return "Bạn có thể xem các vị trí đang tuyển tại mục Tuyển dụng. Nếu cần hỏi thêm về một vị trí cụ thể, hãy để lại tên vị trí để admin hỗ trợ.";
  }
  if (/cv|h[oồ] s[oơ]|resume/.test(normalized)) {
    return "Bạn có thể gửi CV trực tiếp trong trang chi tiết vị trí tuyển dụng. Hồ sơ sẽ được lưu để bộ phận phụ trách xem xét.";
  }
  if (/dịch vụ|dich vu|logistics|vận tải|van tai|kho/.test(normalized)) {
    return "Bạn có thể xem thông tin dịch vụ trên website hoặc để lại nhu cầu cụ thể; admin SPG sẽ tiếp tục trao đổi với bạn.";
  }
  if (/li[eê]n h[eệ]|contact|địa chỉ|dia chi|điện thoại|dien thoai/.test(normalized)) {
    return "Bạn có thể mở mục Liên hệ trên website. Nếu cần trao đổi trực tiếp, cứ để lại nội dung ở đây để admin phản hồi.";
  }
  return settings.fallbackMessage;
}

async function generateAutomatedReply(sessionId, text, settings) {
  if (settings.aiEnabled && isOpenAiChatConfigured()) {
    try {
      const messages = await getCollection("chat_messages");
      const history = await messages
        .find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray();
      history.reverse();
      const aiText = await generateOpenAiChatReply({ history, message: text });
      if (aiText) return { text: aiText, provider: "openai" };
    } catch (error) {
      console.error("OpenAI chat fallback:", error.message);
    }
  }
  return { text: automatedReply(text, settings), provider: "faq" };
}

export async function getPublicChatSettings(_req, res) {
  return res.json({ data: await getSettings() });
}

export async function createChatSession(req, res) {
  const settings = await getSettings();
  if (!settings.enabled) return res.status(403).json({ error: "Chat is currently disabled" });

  const sessions = await getCollection("chat_sessions");
  const sessionId = crypto.randomUUID();
  const clientToken = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const document = {
    sessionId,
    clientToken,
    name: safeContact(req.body?.name, 100),
    email: safeContact(req.body?.email),
    status: "open",
    unreadAdmin: 0,
    createdAt: now,
    updatedAt: now,
  };
  await sessions.insertOne(document);

  if (settings.welcomeMessage) {
    await insertMessage(sessionId, "bot", settings.welcomeMessage, {
      automated: true,
      provider: "system",
    });
  }

  broadcastRealtime("chat-updated", { kind: "session-created" });
  return res.status(201).json({
    data: {
      sessionId,
      clientToken,
      name: document.name,
      email: document.email,
      status: document.status,
    },
  });
}

export async function getPublicMessages(req, res) {
  const sessionId = safeContact(req.query.sessionId, 80);
  const clientToken = safeContact(req.query.clientToken, 128);
  const session = await findAuthorizedSession(sessionId, clientToken);
  if (!session) return res.status(404).json({ error: "Chat session not found" });

  const messages = await getCollection("chat_messages");
  const items = await messages.find({ sessionId }).sort({ createdAt: 1 }).limit(200).toArray();
  return res.json({ data: items, session: { status: session.status } });
}

export async function createPublicMessage(req, res) {
  const sessionId = safeContact(req.body?.sessionId, 80);
  const clientToken = safeContact(req.body?.clientToken, 128);
  const text = safeMessageText(req.body?.text);
  if (!text) return res.status(400).json({ error: "Message is required" });

  const session = await findAuthorizedSession(sessionId, clientToken);
  if (!session) return res.status(404).json({ error: "Chat session not found" });
  if (session.status === "closed") return res.status(409).json({ error: "Chat session is closed" });

  const message = await insertMessage(sessionId, "visitor", text);
  const sessions = await getCollection("chat_sessions");
  await sessions.updateOne(
    { sessionId },
    {
      $set: { lastMessage: text.slice(0, 180), updatedAt: new Date() },
      $inc: { unreadAdmin: 1 },
    },
  );
  broadcastChat(sessionId, { action: "created", message });
  broadcastRealtime("chat-updated", { kind: "visitor-message" });

  const settings = await getSettings();
  let botMessage = null;
  if (settings.autoReplyEnabled) {
    const reply = await generateAutomatedReply(sessionId, text, settings);
    botMessage = await insertMessage(sessionId, "bot", reply.text, {
      automated: true,
      provider: reply.provider,
    });
    broadcastChat(sessionId, { action: "created", message: botMessage });
  }

  return res.status(201).json({ data: message, botMessage });
}

export async function openPublicChatStream(req, res) {
  const sessionId = safeContact(req.query.sessionId, 80);
  const clientToken = safeContact(req.query.clientToken, 128);
  const session = await findAuthorizedSession(sessionId, clientToken);
  if (!session) return res.status(404).json({ error: "Chat session not found" });
  addChatClient(sessionId, req, res);
  return undefined;
}

export async function getAdminChatSettings(_req, res) {
  const settings = await getSettings();
  return res.json({
    data: {
      ...settings,
      aiConfigured: isOpenAiChatConfigured(),
      aiModel: env.openai.model,
    },
  });
}

export async function updateAdminChatSettings(req, res) {
  const settingsCollection = await getCollection("settings");
  const payload = normalizeSettings(req.body);
  await settingsCollection.updateOne(
    { _id: SETTINGS_ID },
    { $set: payload },
    { upsert: true },
  );
  broadcastRealtime("chat-updated", { kind: "settings" });
  return res.json({
    data: {
      ...publicSettings(payload),
      aiConfigured: isOpenAiChatConfigured(),
      aiModel: env.openai.model,
    },
  });
}

export async function listAdminChatSessions(req, res) {
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(50, Math.max(1, Math.trunc(Number(req.query.pageSize)) || 20));
  const search = safeContact(req.query.search, 160);
  const status = String(req.query.status || "").trim();
  const filter = {};
  if (["open", "closed"].includes(status)) filter.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "email", "lastMessage"].map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    }));
  }

  const sessions = await getCollection("chat_sessions");
  const total = await sessions.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(page, totalPages);
  const items = await sessions
    .find(filter, { projection: { clientToken: 0 } })
    .sort({ updatedAt: -1 })
    .skip((resolvedPage - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  return res.json({ data: items, pagination: { page: resolvedPage, pageSize, total, totalPages } });
}

export async function getAdminChatMessages(req, res) {
  const sessionId = safeContact(req.params.sessionId, 80);
  const sessions = await getCollection("chat_sessions");
  const session = await sessions.findOne({ sessionId }, { projection: { clientToken: 0 } });
  if (!session) return res.status(404).json({ error: "Chat session not found" });

  const messages = await getCollection("chat_messages");
  const items = await messages.find({ sessionId }).sort({ createdAt: 1 }).limit(300).toArray();
  await sessions.updateOne({ sessionId }, { $set: { unreadAdmin: 0 } });
  return res.json({ data: items, session });
}

export async function createAdminChatMessage(req, res) {
  const sessionId = safeContact(req.params.sessionId, 80);
  const text = safeMessageText(req.body?.text);
  if (!text) return res.status(400).json({ error: "Message is required" });

  const sessions = await getCollection("chat_sessions");
  const session = await sessions.findOne({ sessionId });
  if (!session) return res.status(404).json({ error: "Chat session not found" });
  if (session.status === "closed") return res.status(409).json({ error: "Chat session is closed" });

  const message = await insertMessage(sessionId, "admin", text, {
    userId: String(req.user?.sub || ""),
    userName: String(req.user?.displayName || req.user?.username || "Admin"),
  });
  await sessions.updateOne(
    { sessionId },
    { $set: { lastMessage: text.slice(0, 180), updatedAt: new Date(), unreadAdmin: 0 } },
  );
  broadcastChat(sessionId, { action: "created", message });
  broadcastRealtime("chat-updated", { kind: "admin-message" });
  return res.status(201).json({ data: message });
}

export async function updateAdminChatSession(req, res) {
  const sessionId = safeContact(req.params.sessionId, 80);
  const status = String(req.body?.status || "").trim();
  if (!["open", "closed"].includes(status)) return res.status(400).json({ error: "Invalid chat status" });

  const sessions = await getCollection("chat_sessions");
  const result = await sessions.updateOne(
    { sessionId },
    { $set: { status, updatedAt: new Date() } },
  );
  if (!result.matchedCount) return res.status(404).json({ error: "Chat session not found" });
  broadcastChat(sessionId, { action: "session", status });
  broadcastRealtime("chat-updated", { kind: "status" });
  return res.json({ ok: true });
}

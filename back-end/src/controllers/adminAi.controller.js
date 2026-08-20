import { env } from "../config/env.js";
import {
  generateOpenAiChatReply,
  isOpenAiChatConfigured,
} from "../utils/openaiChat.js";

const MAX_HISTORY = 12;
const MAX_MESSAGE = 1800;

function safeText(value, max = MAX_MESSAGE) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY).map((item) => {
    const role = item?.role === "assistant" ? "bot" : "visitor";
    return { sender: role, text: safeText(item?.text) };
  }).filter((item) => item.text);
}

export async function testAdminAiChat(req, res) {
  if (!isOpenAiChatConfigured()) {
    return res.status(503).json({
      error: "OpenAI chưa được cấu hình trên backend",
      code: "OPENAI_NOT_CONFIGURED",
      model: env.openai.model,
    });
  }

  const message = safeText(req.body?.message);
  if (!message) return res.status(400).json({ error: "Vui lòng nhập nội dung để thử AI" });

  try {
    const text = await generateOpenAiChatReply({
      history: normalizeHistory(req.body?.history),
      message,
    });
    if (!text) {
      return res.status(502).json({
        error: "AI không trả về nội dung",
        code: "OPENAI_EMPTY_RESPONSE",
        model: env.openai.model,
      });
    }
    return res.json({ data: { text, model: env.openai.model } });
  } catch (error) {
    console.error("Admin OpenAI test failed:", error.message);
    return res.status(502).json({
      error: "Không thể kết nối OpenAI",
      code: "OPENAI_REQUEST_FAILED",
      detail: safeText(error?.message, 360),
      model: env.openai.model,
    });
  }
}

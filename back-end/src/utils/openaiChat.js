import { env } from "../config/env.js";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

function responseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  return (payload?.output || []).flatMap((item) => item?.content || []).map((item) => item?.text).filter(Boolean).join("\n").trim();
}

export function isOpenAiChatConfigured() {
  return Boolean(env.openai.apiKey && env.openai.model);
}

export async function generateOpenAiChatReply({ history = [], message }) {
  if (!isOpenAiChatConfigured()) return "";
  const latestMessage = String(message || "").slice(0, 1800);
  const recentHistory = history.filter((item) => ["visitor", "admin", "bot"].includes(item?.sender) && item?.text).slice(-8).map((item) => ({ type: "message", role: item.sender === "visitor" ? "user" : "assistant", content: String(item.text).slice(0, 1800) }));
  const last = recentHistory[recentHistory.length - 1];
  const input = last?.role === "user" && last?.content === latestMessage ? recentHistory : [...recentHistory, { type: "message", role: "user", content: latestMessage }];

  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openai.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.openai.model,
      store: false,
      instructions:
        "Bạn là trợ lý hỗ trợ Mandora, nền tảng học tiếng Trung dành cho người Việt. Trả lời ngắn gọn, rõ ràng và ưu tiên tiếng Việt khi người dùng nói tiếng Việt. Bạn có thể hỗ trợ điều hướng khóa học, HSK, từ vựng, bài học, Quiz, tiến độ học tập, tài khoản học viên và cách sử dụng các tính năng đang có trên Mandora. Không bịa khóa học, dữ liệu học viên, điểm số, chính sách, chứng chỉ, giá, giáo viên hoặc tính năng chưa có trong hội thoại hay website. Nếu thiếu dữ liệu cụ thể, nói rõ rằng quản trị viên Mandora có thể phản hồi thêm. Không yêu cầu hoặc tiết lộ mật khẩu, token, khóa API hay dữ liệu riêng tư.",
      input,
      max_output_tokens: 220,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}): ${payload.slice(0, 180)}`);
  }
  const payload = await response.json();
  return responseText(payload).slice(0, 1200);
}

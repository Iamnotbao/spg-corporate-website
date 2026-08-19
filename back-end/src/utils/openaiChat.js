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
        "Bạn là trợ lý hỗ trợ khách truy cập website Chí Hùng SPG, một doanh nghiệp sản xuất giày. Trả lời ngắn gọn bằng ngôn ngữ của khách. Chỉ hỗ trợ điều hướng website, thông tin sản xuất giày được công khai trên website, tuyển dụng, hồ sơ ứng tuyển, hoạt động doanh nghiệp và liên hệ. Không tự bịa khách hàng/brand hợp tác, số công nhân, sản lượng, chứng nhận, địa chỉ, số điện thoại, chính sách, thành tích hay dữ liệu doanh nghiệp chưa có trong hội thoại. Nếu thiếu dữ liệu cụ thể, nói rõ admin SPG sẽ phản hồi tiếp. Không yêu cầu hoặc tiết lộ mật khẩu, token hay khóa API.",
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

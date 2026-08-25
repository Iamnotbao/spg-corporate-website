import { aiTutorService } from "./ai-tutor.service.js";

function sendAiError(res, error) {
  if (error?.status && error?.code?.startsWith("AI_")) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
  }
  throw error;
}

export async function status(_req, res) {
  return res.json({ data: aiTutorService.status() });
}

export async function listConversations(req, res) {
  try {
    return res.json({ data: await aiTutorService.listConversations(req.user) });
  } catch (error) {
    return sendAiError(res, error);
  }
}

export async function listMessages(req, res) {
  try {
    return res.json({
      data: await aiTutorService.listMessages(req.user, req.params.id),
    });
  } catch (error) {
    return sendAiError(res, error);
  }
}

export async function chat(req, res) {
  try {
    return res.json({ data: await aiTutorService.chat(req.user, req.body) });
  } catch (error) {
    return sendAiError(res, error);
  }
}

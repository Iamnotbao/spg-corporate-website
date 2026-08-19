const clientsBySession = new Map();

function send(response, eventName, data) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function addChatClient(sessionId, request, response) {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  if (typeof response.flushHeaders === "function") response.flushHeaders();

  if (!clientsBySession.has(sessionId)) clientsBySession.set(sessionId, new Set());
  const clients = clientsBySession.get(sessionId);
  clients.add(response);
  send(response, "connected", { ok: true });

  const heartbeat = setInterval(() => {
    try {
      response.write(": keep-alive\n\n");
    } catch {
      clients.delete(response);
    }
  }, 25000);

  request.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(response);
    if (!clients.size) clientsBySession.delete(sessionId);
  });
}

export function broadcastChat(sessionId, data) {
  const clients = clientsBySession.get(sessionId);
  if (!clients) return;
  for (const response of clients) {
    try {
      send(response, "message", data);
    } catch {
      clients.delete(response);
    }
  }
  if (!clients.size) clientsBySession.delete(sessionId);
}

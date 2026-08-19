const clients = new Set();

function sendEvent(response, eventName, data) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function addRealtimeClient(request, response) {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  if (typeof response.flushHeaders === "function") response.flushHeaders();

  sendEvent(response, "connected", { ok: true });
  clients.add(response);

  const heartbeat = setInterval(() => {
    response.write(": keep-alive\n\n");
  }, 25000);

  request.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(response);
  });
}

export function broadcastRealtime(eventName, data) {
  for (const response of clients) {
    try {
      sendEvent(response, eventName, data);
    } catch {
      clients.delete(response);
    }
  }
}

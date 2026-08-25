import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import adminRoutes from "./routes/admin.routes.js";
import adminChatRoutes from "./routes/admin-chat.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import studentRoutes from "./routes/student.routes.js";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const normalizeOrigin = (value) => {
  if (!value) return "";
  return value.trim().replace(/^=+/, "").replace(/\/$/, "");
};

const configuredOrigins = String(env.frontendUrl)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/events",
  message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin))
        return callback(null, true);

      const error = new Error(`CORS origin not allowed: ${origin}`);
      error.status = 403;
      return callback(error);
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  }),
);

app.use(helmet());
app.use("/api/admin/vocabulary/import", express.json({ limit: "6mb" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiLimiter);
app.use("/api/auth", oauthRoutes);
app.use("/api/admin/chat", adminChatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api", publicRoutes);
app.get("/health", (_, res) => res.json({ ok: true }));
app.use(notFound);
app.use(errorHandler);

export default app;

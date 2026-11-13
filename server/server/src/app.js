import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import traderRoutes from "./routes/traderRoutes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// 1. Security headers (helmet with light settings)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. Gzip compression
app.use(compression());

// 3. Request duration tracker for Render / production logs
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[SLOW ROUTE] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 4. Rate limiting (light settings: 600 req/15min, bypass health checks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes("health"),
});
app.use(limiter);

// 5. CORS configuration
const corsOrigins = [
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map(o => o.trim().replace(/\/+$/, "")) : []),
  process.env.CLIENT_ORIGIN?.trim().replace(/\/+$/, ""),
  process.env.CLIENT_URL?.trim().replace(/\/+$/, ""),
].filter(Boolean);

if (corsOrigins.length === 0) {
  corsOrigins.push("http://localhost:5173");
}

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: "2mb" })); // bulk imports send many rows
app.use(morgan("dev"));

// Instant health check routes (zero DB queries)
app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get("/api/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use("/api/auth", authRoutes);                    // login / setup are public
app.use("/api/trades", requireAuth, tradeRoutes);    // everything else needs a login
app.use("/api/traders", requireAuth, traderRoutes);

app.use(errorHandler);

export default app;
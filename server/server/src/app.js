import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import authRoutes from "./routes/authRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import traderRoutes from "./routes/traderRoutes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(compression());

// CORS origins from env — set CORS_ORIGINS as comma-separated list in .env
const corsOrigins = [
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map(o => o.trim().replace(/\/+$/, "")) : []),
  process.env.CLIENT_ORIGIN?.trim().replace(/\/+$/, ""),
  process.env.CLIENT_URL?.trim().replace(/\/+$/, ""),
].filter(Boolean);

// Always allow localhost in dev if no origins configured
if (corsOrigins.length === 0) {
  corsOrigins.push("http://localhost:5173");
}

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: "2mb" })); // bulk imports send many rows
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);                    // login / setup are public
app.use("/api/trades", requireAuth, tradeRoutes);    // everything else needs a login
app.use("/api/traders", requireAuth, traderRoutes);

app.use(errorHandler);

export default app;
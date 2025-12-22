// server.js (ESM)
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import ccgRoutes from "./server/routes/ccgRoutes.js";
import authRoutes from "./server/routes/authRoutes.js";
import profileRoutes from "./server/routes/profileRoutes.js";
import scriptsRoutes from "./server/routes/scripts.js";
import googleAuthRoutes from "./server/routes/googleAuthRoutes.js";

import { domainGuard } from "./server/middleware/domainGuard.js";

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(compression());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "50kb" }));
app.use(morgan("combined"));

app.use(domainGuard());

// Security rate limit (not business quota)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many requests. Please slow down.",
    code: "RATE_LIMIT",
  },
});
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "CCG",
    version: process.env.npm_package_version || "3.2.0",
    time: new Date().toISOString(),
  });
});

app.use("/api/ccg", ccgRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/scripts", scriptsRoutes);
app.use("/api/google", googleAuthRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "API route not found" });
});

app.use((err, req, res, next) => {
  const payload = {
    level: "error",
    message: err?.message || "Unhandled error",
    stack: err?.stack,
    path: req?.originalUrl,
    time: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));

  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    ok: false,
    error: isProd ? "Internal Server Error" : payload.message,
    code: "SERVER_ERROR",
  });
});

async function startServer() {
  let server;
  try {
    const mongo = process.env.MONGO_URI;
    if (mongo) {
      await mongoose.connect(mongo);
      console.log("✅ MongoDB connected");
    } else {
      console.log("⚠️ MONGO_URI not set, running without DB connection");
    }

    const port = Number(process.env.PORT || 50000);
    server = app.listen(port, () => {
      console.log(`🚀 CCG API running on port ${port} (${process.env.NODE_ENV || "dev"})`);
    });
  } catch (e) {
    console.error("❌ Failed to start server:", e);
    process.exit(1);
  }

  const shutdown = async (signal) => {
    try {
      console.log(`🛑 Received ${signal}. Shutting down gracefully...`);

      if (server) {
        await new Promise((resolve) => server.close(resolve));
        console.log("🧹 HTTP server closed");
      }

      // ✅ new mongoose close (no callback)
      if (mongoose.connection?.readyState === 1) {
        await mongoose.connection.close();
        console.log("🧹 MongoDB connection closed");
      }

      process.exit(0);
    } catch (e) {
      console.error("❌ Shutdown error:", e);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer();

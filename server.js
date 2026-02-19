/**
 * server.js (CCG_STABLE_V3.2.0)
 * نسخه پایدار با لاگینگ کامل و مدیریت خطا
 */
import "dotenv/config";
import express from "express";
import ccgRoutes from "./server/routes/ccgRoutes.js";
console.log("[server] ccgRoutes typeof =", typeof ccgRoutes);
import domainGuard from "./server/middleware/domainGuard.js";
import chatRoutes from "./server/routes/chatRoutes.js";
import fs from "fs";
import path from "path";

// لاگ فایل
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "server-debug.log");

function log(...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(" ")}`;
  console.log(message);
  fs.appendFileSync(logFile, message + "\n", { flag: "a" });
}

function redactSensitive(obj) {
  // Redact common sensitive fields (nested-safe)
  const SENSITIVE_KEYS = ["key", "token", "password", "secret", "authorization", "apikey", "api_key", "access_token"];
  const seen = new WeakSet();

  function walk(x) {
    if (!x || typeof x !== "object") return x;
    if (seen.has(x)) return "[Circular]";
    seen.add(x);

    if (Array.isArray(x)) return x.map(walk);

    const out = {};
    for (const [k, v] of Object.entries(x)) {
      const lk = String(k).toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((s) => lk.includes(s));
      if (isSensitive) out[k] = "[REDACTED]";
      else out[k] = walk(v);
    }
    return out;
  }

  return walk(obj);
}

log("=".repeat(60));
log("🚀 STARTING CCG SERVER v3.2.0");
log("=".repeat(60));

const app = express();

app.disable("x-powered-by");

// ✅ Body parsers should run BEFORE logging middleware if we want req.body
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Middlewareهای اصلی
app.use(domainGuard);

// Middleware لاگینگ برای تمام درخواست‌ها
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  log(`[${requestId}] → ${req.method} ${req.originalUrl} from ${req.ip}`);

  // Log body safely (redact sensitive)
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    try {
      const safeBody = redactSensitive(req.body);
      const bodyStr = JSON.stringify(safeBody);

      // keep logs bounded
      if (bodyStr.length < 1200) log(`[${requestId}] Body: ${bodyStr}`);
      else log(`[${requestId}] Body (truncated): ${bodyStr.substring(0, 700)}...`);
    } catch {
      log(`[${requestId}] Body: [unserializable]`);
    }
  }

  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    let size = 0;
    try {
      size = typeof body === "string" ? body.length : JSON.stringify(body).length;
    } catch {
      size = 0;
    }
    log(`[${requestId}] ← ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms, ${size} bytes)`);
    return originalSend.call(this, body);
  };

  next();
});

// ========== ROUTES ==========

// Health endpoint
app.get("/api/health", (req, res) => {
  log("[HEALTH] Health check requested");
  res.json({
    ok: true,
    service: "ccg",
    version: "3.2.0",
    ts: Date.now(),
    pid: process.pid,
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ✅ Main API routes (FIXED)
app.use("/api/ccg", ccgRoutes);
app.use("/api/chat", chatRoutes);

// Simple test endpoint
app.post("/api/test", (req, res) => {
  log("[TEST] Test endpoint called");
  res.json({
    ok: true,
    message: "✅ CCG API is working properly",
    received: redactSensitive(req.body || {}),
    timestamp: new Date().toISOString(),
    server: "CCG v3.2.0",
  });
});

// API info endpoint
app.get("/api/info", (req, res) => {
  const info = {
    service: "Cando Command Generator (CCG)",
    version: "3.2.0",
    status: "operational",
    endpoints: {
      health: "GET /api/health",
      ccg: "POST /api/ccg",
      chat: "POST /api/chat",
      test: "POST /api/test",
      info: "GET /api/info",
    },
    features: {
      ai_generation: true,
      code_comparison: true,
      chat: true,
      multilingual: true,
    },
    timestamp: new Date().toISOString(),
  };
  res.json(info);
});

// 404 handler for API routes (keep this LAST)
app.use("/api", (req, res) => {
  log(`[404] API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    ok: false,
    error: {
      code: "API_ROUTE_NOT_FOUND",
      userMessage: "مسیر API پیدا نشد",
      hint: "آدرس درخواست را بررسی کن.",
    },
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "CCG API",
    version: "3.2.0",
    description: "Cando Command Generator Backend API",
    documentation: "https://ccg.cando.ac/docs",
    endpoints: {
      api: "/api",
      health: "/api/health",
      status: "running",
    },
  });
});

// ========== SERVER STARTUP ==========

const port = Number(process.env.PORT || 50000);
const host = process.env.HOST || "0.0.0.0";

// نمایش اطلاعات startup
log("=".repeat(60));
log("📊 STARTUP INFORMATION");
log("=".repeat(60));
log(`PID: ${process.pid}`);
log(`Port: ${port}`);
log(`Host: ${host}`);
log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
log(`Working Directory: ${process.cwd()}`);
log(`Start Time: ${new Date().toISOString()}`);
log(`Node Version: ${process.version}`);
log(`Platform: ${process.platform}/${process.arch}`);

// نمایش متغیرهای محیطی (بدون اطلاعات حساس)
log("-".repeat(40));
log("ENVIRONMENT VARIABLES:");
const envToShow = [
  "NODE_ENV",
  "PORT",
  "LICENSE",
  "VERSION",
  "AI_PROVIDER",
  "AI_PRIMARY_MODEL",
  "LANG",
  "BASE_URL",
  "FRONTEND_URL",
  "ENABLE_CHAT",
  "ENABLE_COMPARATOR",
];

envToShow.forEach((key) => {
  if (process.env[key]) log(`  ${key}: ${process.env[key]}`);
});

// بررسی سرویس‌ها
log("-".repeat(40));
log("SERVICE STATUS:");
if (process.env.MONGO_URI) log("  ✅ MongoDB URI is configured");
else log("  ⚠️ MongoDB URI is NOT configured");

if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 30) log("  ✅ OpenAI API Key is configured");
else log("  ⚠️ OpenAI API Key is NOT properly configured");

log("=".repeat(60));

// راه‌اندازی سرور
const server = app.listen(port, host, () => {
  log(`🎉 SERVER STARTED SUCCESSFULLY`);
  log(`🌐 Listening on: http://${host}:${port}`);
  log(`📁 Logs are being saved to: ${logFile}`);
  log("=".repeat(60));
  console.log(`\n✅ CCG Server v3.2.0 is running on http://${host}:${port}`);
  console.log(`📊 Check /api/health for status\n`);
});

// ========== GRACEFUL SHUTDOWN ==========

const gracefulShutdown = (signal) => {
  log(`\n${"-".repeat(40)}`);
  log(`⚠️ Received ${signal}, initiating graceful shutdown...`);

  server.close(() => {
    log("✅ HTTP server closed");
    log(`📅 Server uptime: ${process.uptime().toFixed(2)} seconds`);
    log("👋 Shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    log("⏰ Force shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ========== ERROR HANDLING ==========

process.on("unhandledRejection", (error) => {
  log("[CRITICAL] Unhandled Promise Rejection:");
  log(`  Error: ${error.message}`);
  log(`  Stack: ${error.stack}`);
});

process.on("uncaughtException", (error) => {
  log("[CRITICAL] Uncaught Exception:");
  log(`  Error: ${error.message}`);
  log(`  Stack: ${error.stack}`);

  setTimeout(() => {
    log("🔄 Restarting server due to uncaught exception...");
    process.exit(1);
  }, 1000);
});

process.on("SIGUSR1", () => {
  log("[DEBUG] SIGUSR1 received - Dumping status:");
  log(`  Memory: ${JSON.stringify(process.memoryUsage())}`);
  log(`  Uptime: ${process.uptime()}s`);
  log(`  Active connections: ${server._connections}`);
});

process.on("SIGHUP", () => {
  log("[INFO] SIGHUP received - Reloading configuration...");
});

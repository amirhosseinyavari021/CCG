/**
 * server.js (CCG_STABLE_V3.2.0+) - FINAL
 * نسخه نهایی با لاگینگ واضح‌تر، requestId استاندارد، و مدیریت خطای کامل
 */
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";

import ccgRoutes from "./server/routes/ccgRoutes.js";
import domainGuard from "./server/middleware/domainGuard.js";
import chatRoutes from "./server/routes/chatRoutes.js";

/* =========================
   CONFIG
========================= */
const VERSION = process.env.VERSION || "3.2.0";
const SERVICE = "ccg";
const port = Number(process.env.PORT || 50000);
const host = process.env.HOST || "0.0.0.0";

const MAX_LOG_BODY = Number(process.env.LOG_BODY_MAX || 1200);
const MAX_LOG_TEXT = Number(process.env.LOG_TEXT_MAX || 900);

/* =========================
   LOG FILE SETUP
========================= */
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, "server-debug.log");

function safeWrite(line) {
  try {
    fs.appendFileSync(logFile, line + "\n", { flag: "a" });
  } catch {}
}

function ts() {
  return new Date().toISOString();
}

function toOneLine(x) {
  return String(x ?? "").replace(/\s+/g, " ").trim();
}

function makeRequestId() {
  // sortable-ish + random
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function redactSensitive(obj) {
  const SENSITIVE_KEYS = [
    "key",
    "token",
    "password",
    "secret",
    "authorization",
    "apikey",
    "api_key",
    "access_token",
    "openai_api_key",
    "openrouter_api_key",
  ];

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
      out[k] = isSensitive ? "[REDACTED]" : walk(v);
    }
    return out;
  }

  return walk(obj);
}

function logLine(level, msg, meta = {}) {
  // 1) human readable
  const human = `[${ts()}] ${level.toUpperCase()} ${msg}`;
  console.log(human);

  // 2) structured JSON line (easy grep + parse)
  const evt = {
    ts: ts(),
    level,
    service: SERVICE,
    version: VERSION,
    msg,
    ...meta,
  };

  safeWrite(`${human} | ${JSON.stringify(evt)}`);
}

function getIp(req) {
  // behind proxy/cdn: x-forwarded-for could exist
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.ip;
}

/* =========================
   APP INIT
========================= */
logLine("info", "============================================================");
logLine("info", `🚀 STARTING CCG SERVER v${VERSION}`);
logLine("info", "============================================================");

const app = express();
app.disable("x-powered-by");

// اگر پشت پروکسی/کلاودفلر هستی، این باعث میشه req.ip درست‌تر بشه
// (اگر نمی‌خوای، کامنت کن)
app.set("trust proxy", true);

/* =========================
   BODY PARSERS (قبل از لاگ)
========================= */
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || "2mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || "2mb" }));
app.use(express.text({ type: "*/*", limit: process.env.MAX_REQUEST_SIZE || "2mb" }));

// اگر req.body رشته بود و شبیه JSON بود، تبدیلش کن
app.use((req, _res, next) => {
  if (typeof req.body === "string") {
    const t = req.body.trim();
    if (t.startsWith("{") && t.endsWith("}")) {
      try {
        req.body = JSON.parse(t);
      } catch {
        // keep as string
      }
    }
  }
  next();
});

/* =========================
   REQUEST LOGGER + REQUEST ID
========================= */
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers["x-request-id"] ? String(req.headers["x-request-id"]) : makeRequestId();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const ip = getIp(req);
  const ua = toOneLine(req.headers["user-agent"] || "");
  const ct = toOneLine(req.headers["content-type"] || "");
  const cl = toOneLine(req.headers["content-length"] || "");

  logLine("info", "REQ", {
    rid: requestId,
    method: req.method,
    path: req.originalUrl,
    ip,
    ct: ct || null,
    cl: cl || null,
    ua: ua || null,
  });

  // body preview (safe + bounded)
  try {
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
      const safeBody = redactSensitive(req.body);
      let bodyStr = JSON.stringify(safeBody);
      if (bodyStr.length > MAX_LOG_BODY) bodyStr = bodyStr.slice(0, MAX_LOG_BODY) + "...[truncated]";
      logLine("debug", "REQ_BODY", { rid: requestId, body: bodyStr });
    } else if (typeof req.body === "string" && req.body.trim()) {
      let preview = req.body.trim();
      if (preview.length > MAX_LOG_TEXT) preview = preview.slice(0, MAX_LOG_TEXT) + "...[truncated]";
      logLine("debug", "REQ_BODY_TEXT", { rid: requestId, body: preview });
    }
  } catch (e) {
    logLine("warn", "REQ_BODY_LOG_FAIL", { rid: requestId, err: String(e?.message || e) });
  }

  // capture response finish
  res.on("finish", () => {
    const ms = Date.now() - start;
    logLine("info", "RES", {
      rid: requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms,
    });
  });

  next();
});

/* =========================
   MAIN MIDDLEWARES
========================= */
app.use(domainGuard);

/* =========================
   ROUTES
========================= */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: SERVICE,
    version: VERSION,
    ts: Date.now(),
    pid: process.pid,
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.use("/api/ccg", ccgRoutes);
app.use("/api/chat", chatRoutes);

app.post("/api/test", (req, res) => {
  res.json({
    ok: true,
    message: "✅ CCG API is working properly",
    received: redactSensitive(req.body || {}),
    timestamp: new Date().toISOString(),
    server: `CCG v${VERSION}`,
  });
});

app.get("/api/info", (_req, res) => {
  res.json({
    service: "Cando Command Generator (CCG)",
    version: VERSION,
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
  });
});

/* =========================
   404 FOR API
========================= */
app.use("/api", (req, res) => {
  logLine("warn", "API_ROUTE_NOT_FOUND", {
    rid: req.requestId,
    method: req.method,
    path: req.originalUrl,
  });

  res.status(404).json({
    ok: false,
    error: {
      code: "API_ROUTE_NOT_FOUND",
      userMessage: "مسیر API پیدا نشد",
      hint: "آدرس درخواست را بررسی کن.",
      requestId: req.requestId,
    },
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   ROOT
========================= */
app.get("/", (_req, res) => {
  res.json({
    service: "CCG API",
    version: VERSION,
    description: "Cando Command Generator Backend API",
    endpoints: {
      api: "/api",
      health: "/api/health",
      status: "running",
    },
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, _next) => {
  const msg = String(err?.message || "Internal server error");
  const code = err?.code || "INTERNAL_ERROR";

  logLine("error", "UNHANDLED_ROUTE_ERROR", {
    rid: req?.requestId,
    code,
    msg,
    stack: process.env.NODE_ENV === "production" ? undefined : String(err?.stack || ""),
  });

  res.status(err?.status || 500).json({
    ok: false,
    error: {
      code,
      userMessage: "خطای داخلی سرور رخ داد.",
      message: msg,
      requestId: req?.requestId,
    },
  });
});

/* =========================
   STARTUP INFO
========================= */
logLine("info", "============================================================");
logLine("info", "📊 STARTUP INFORMATION");
logLine("info", "============================================================");
logLine("info", `PID=${process.pid}`);
logLine("info", `Host=${host}`);
logLine("info", `Port=${port}`);
logLine("info", `NODE_ENV=${process.env.NODE_ENV || "development"}`);
logLine("info", `WorkingDir=${process.cwd()}`);
logLine("info", `Node=${process.version}`);
logLine("info", `Platform=${process.platform}/${process.arch}`);

logLine("info", "----------------------------------------");
logLine("info", "ENVIRONMENT VARIABLES (safe view):");
const envToShow = [
  "NODE_ENV",
  "PORT",
  "LICENSE",
  "VERSION",
  "LANG",
  "BASE_URL",
  "FRONTEND_URL",
  "ENABLE_CHAT",
  "ENABLE_COMPARATOR",

  // AI routing
  "AI_PROVIDER",
  "AI_PRIMARY_MODEL",
  "AI_FALLBACK_PROVIDER",
  "AI_FALLBACK_MODEL",

  // timeouts/limits
  "CHAT_ROUTE_TIMEOUT_MS",
  "AI_HTTP_TIMEOUT_MS",
  "AI_HTTP_MAX_RETRIES",
  "AI_MAX_CONCURRENCY",
];

for (const key of envToShow) {
  if (process.env[key]) logLine("info", `ENV ${key}=${process.env[key]}`);
}

logLine("info", "----------------------------------------");
logLine("info", "SERVICE STATUS:");
logLine("info", process.env.MONGO_URI ? "✅ MongoDB URI is configured" : "⚠️ MongoDB URI is NOT configured");
logLine("info", process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 30 ? "✅ OpenAI API Key is configured" : "⚠️ OpenAI API Key is NOT properly configured");
logLine("info", process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20 ? "✅ OpenRouter API Key is configured" : "⚠️ OpenRouter API Key is NOT properly configured");
logLine("info", "============================================================");

/* =========================
   START SERVER
========================= */
const server = app.listen(port, host, () => {
  logLine("info", "🎉 SERVER STARTED SUCCESSFULLY", {
    host,
    port,
    url: `http://${host}:${port}`,
    logFile,
  });
  console.log(`\n✅ CCG Server v${VERSION} is running on http://${host}:${port}`);
  console.log(`📊 Check /api/health for status\n`);
});

/* =========================
   GRACEFUL SHUTDOWN
========================= */
function gracefulShutdown(signal) {
  logLine("warn", `⚠️ Received ${signal}, initiating graceful shutdown...`);

  server.close(() => {
    logLine("info", "✅ HTTP server closed");
    logLine("info", `📅 Server uptime: ${process.uptime().toFixed(2)} seconds`);
    logLine("info", "👋 Shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    logLine("error", "⛔ Force exit (timeout)...");
    process.exit(1);
  }, 8000).unref?.();
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

/* =========================
   PROCESS-LEVEL SAFETY NET
========================= */
process.on("unhandledRejection", (reason) => {
  logLine("error", "UNHANDLED_REJECTION", { reason: safeWrite ? toOneLine(String(reason)) : String(reason) });
});

process.on("uncaughtException", (err) => {
  logLine("error", "UNCAUGHT_EXCEPTION", {
    msg: String(err?.message || err),
    stack: process.env.NODE_ENV === "production" ? undefined : String(err?.stack || ""),
  });
  // بهتره بعد از uncaughtException خروج کنی
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

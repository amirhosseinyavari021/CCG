// server/middleware/domainGuard.js - SAFE + CORS LITE
/**
 * میدلوار امن برای بررسی دامنه + CORS Lite
 * - هرگز خطا نمی‌دهد، همیشه next() را فراخوانی می‌کند
 * - در dev اجازه localhost
 * - در prod اگر Origin غیرمجاز بود 403
 * - OPTIONS (preflight) را هندل می‌کند
 */

import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "domain-guard.log");

function log(...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(" ")}`;
  fs.appendFileSync(logFile, message + "\n", { flag: "a" });
}

function getAllowedDomains() {
  const env = process.env.ALLOWED_DOMAINS;
  const base = env ? env.split(",").map((d) => d.trim()).filter(Boolean) : [];
  // defaults (always allow local in dev)
  return base.length ? base : ["localhost", "127.0.0.1", "ccg.cando.ac"];
}

function originIsAllowed(origin, allowedDomains) {
  if (!origin) return true; // curl / same-origin
  return allowedDomains.some((d) => origin.includes(d));
}

export default function domainGuard(req, res, next) {
  const startTime = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  try {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const method = req.method;
    const url = req.originalUrl || req.url;
    const userAgent = req.headers["user-agent"] || "unknown";

    log(`[${requestId}] ${method} ${url} from ${ip} - ${userAgent.substring(0, 50)}`);

    // health endpoints
    if (url === "/api/health" || url === "/health") {
      log(`[${requestId}] Health check - skipping domain validation`);
      return next();
    }

    const origin = req.headers.origin || "";
    const allowedDomains = getAllowedDomains();

    const isProd = process.env.NODE_ENV === "production";

    // ✅ CORS Lite headers (only when Origin exists)
    // in dev: reflect origin (localhost/vite), in prod: only if allowed
    if (origin) {
      const allowed = isProd ? originIsAllowed(origin, allowedDomains) : true;

      if (allowed) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        // اگر بعداً credential لازم شد، اینو true کن و در فرانت هم credentials اضافه کن
        res.setHeader("Access-Control-Allow-Credentials", "false");
        res.setHeader("Access-Control-Max-Age", "600");
      }
    }

    // ✅ Handle preflight fast
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    // ✅ domain allow/block (only in prod)
    if (origin && isProd) {
      const isAllowed = originIsAllowed(origin, allowedDomains);
      if (!isAllowed) {
        const duration = Date.now() - startTime;
        log(`[${requestId}] BLOCKED: Origin ${origin} not in allowed domains (${duration}ms)`);
        return res.status(403).json({
          ok: false,
          error: "Access denied",
          message: "Domain not allowed",
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (!req.body) req.body = {};
    req.requestId = requestId;

    const duration = Date.now() - startTime;
    log(`[${requestId}] Allowed - processing (${duration}ms)`);

    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`[${requestId}] ERROR in domainGuard (${duration}ms): ${error.message}`);

    if (!req.body) req.body = {};
    req.requestId = requestId;

    next();
  }
}

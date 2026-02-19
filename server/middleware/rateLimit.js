// /home/cando/CCG/server/middleware/rateLimit.js
// Simple in-memory rate limiter (no dependency)

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function rateLimit({ windowMs = 60_000, max = 30, keyFn } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  const getKey = keyFn || ((req) => {
    const ip =
      s(req.headers["x-forwarded-for"]).split(",")[0].trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      "unknown";
    return ip;
  });

  return function (req, res, next) {
    const key = getKey(req);
    const now = Date.now();

    const cur = hits.get(key);
    if (!cur || now >= cur.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      res.setHeader("X-RateLimit-Reset", String(now + windowMs));
      return next();
    }

    cur.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - cur.count)));
    res.setHeader("X-RateLimit-Reset", String(cur.resetAt));

    if (cur.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((cur.resetAt - now) / 1000)));
      return res.status(429).json({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          userMessage: "درخواست‌های شما زیاد است. کمی بعد دوباره تلاش کنید.",
          hint: "چند ثانیه صبر کن و دوباره امتحان کن.",
        },
        details: { windowMs, max },
        output: "",
        markdown: "",
        requestId: res.getHeader("X-Request-Id") || "",
        ms: 0,
      });
    }

    return next();
  };
}

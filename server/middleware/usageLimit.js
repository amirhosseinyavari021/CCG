// server/middleware/usageLimit.js
import User from "../models/User.js";

const guestBuckets = new Map(); // ip -> { count, lastReset }

function isSameDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (
    (Array.isArray(xf) ? xf[0] : xf?.split(",")[0]) ||
    req.ip ||
    "unknown"
  );
}

function categoryFromRequest(body) {
  const os = String(body?.os || "").toLowerCase();
  const device = String(body?.deviceType || "").toLowerCase();
  const mode = String(body?.mode || "").toLowerCase();

  if (mode === "compare") return "compare";
  if (device.includes("cisco") || device.includes("mikrotik") || device.includes("forti"))
    return "network";
  if (os.includes("win")) return "windows";
  if (os.includes("mac")) return "mac";
  return "linux";
}

function limitsForPlan(plan) {
  if (plan === "pro") {
    return {
      linux: 1000,
      windows: 1000,
      mac: 1000,
      network: 500,
      compare: 500,
      total: 3000,
    };
  }

  // FREE
  return {
    linux: 30,
    windows: 20,
    mac: 20,
    network: 10,
    compare: 10,
    total: 100,
  };
}

export function usageLimit() {
  return async function (req, res, next) {
    const now = new Date();
    const lang = req.user?.lang || "en";

    /* ======================
       LOGGED-IN USER
    ====================== */
    if (req.user?.id) {
      const user = await User.findById(req.user.id);
      if (!user) return next();

      if (!user.usage) {
        user.usage = { daily: {}, lastReset: now };
      }

      if (!user.usage.lastReset || !isSameDay(now, user.usage.lastReset)) {
        user.usage.daily = {};
        user.usage.lastReset = now;
      }

      const cat = categoryFromRequest(req.body);
      const lim = limitsForPlan(user.plan || "free");

      user.usage.daily[cat] = user.usage.daily[cat] || 0;
      user.usage.daily.total = user.usage.daily.total || 0;

      if (user.usage.daily.total >= lim.total || user.usage.daily[cat] >= lim[cat]) {
        return res.json({
          error:
            lang === "fa"
              ? "محدودیت استفاده شما برای امروز تمام شده."
              : "Daily usage limit reached.",
          limitReached: true,
        });
      }

      user.usage.daily[cat]++;
      user.usage.daily.total++;
      await user.save();

      return next();
    }

    /* ======================
       GUEST USER
    ====================== */
    const ip = getClientIp(req);
    let bucket = guestBuckets.get(ip);

    if (!bucket || !isSameDay(now, bucket.lastReset)) {
      bucket = { count: 0, lastReset: now };
    }

    const GUEST_LIMIT = 5;

    if (bucket.count >= GUEST_LIMIT) {
      guestBuckets.set(ip, bucket);
      return res.json({
        error:
          lang === "fa"
            ? "۵ درخواست رایگان شما تمام شد. لطفاً ثبت‌نام کنید."
            : "Guest limit reached. Please sign up.",
        limitReached: true,
      });
    }

    bucket.count++;
    bucket.lastReset = now;
    guestBuckets.set(ip, bucket);

    next();
  };
}

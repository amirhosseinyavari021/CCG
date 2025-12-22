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
  const ipHeader = req.headers["x-forwarded-for"];
  return (
    (Array.isArray(ipHeader) ? ipHeader[0] : (ipHeader || "").split(",")[0].trim()) ||
    req.ip ||
    "unknown"
  );
}

function limitsForPlan(plan) {
  // Business limits (NOT security). Keep high enough; security handled elsewhere.
  if (plan === "pro") {
    return { total: 5000 };
  }
  return { total: 500 }; // free (daily)
}

export function usageLimit() {
  return async function (req, res, next) {
    try {
      const now = new Date();

      // Logged in
      if (req.user?.id) {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ ok: false, error: "کاربر یافت نشد." });

        if (!user.usage) user.usage = { daily: { total: 0 }, lastReset: now };

        if (!user.usage.lastReset || !isSameDay(now, user.usage.lastReset)) {
          user.usage.daily = { total: 0 };
          user.usage.lastReset = now;
        }

        const lim = limitsForPlan(user.plan || "free");
        if ((user.usage.daily.total || 0) >= lim.total) {
          return res.status(429).json({
            ok: false,
            error: "محدودیت استفاده روزانه شما به پایان رسیده است.",
            code: "DAILY_LIMIT",
          });
        }

        user.usage.daily.total = (user.usage.daily.total || 0) + 1;
        await user.save();
        return next();
      }

      // Guest
      const ip = getClientIp(req);
      let bucket = guestBuckets.get(ip);

      if (!bucket || !isSameDay(now, bucket.lastReset)) {
        bucket = { count: 0, lastReset: now };
      }

      const guestDailyLimit = 200; // ✅ was 5 — too low, causes bad UX

      if (bucket.count >= guestDailyLimit) {
        guestBuckets.set(ip, bucket);
        return res.status(429).json({
          ok: false,
          error: "محدودیت استفاده مهمان به پایان رسیده است. لطفاً ثبت‌نام کنید.",
          code: "GUEST_DAILY_LIMIT",
        });
      }

      bucket.count += 1;
      bucket.lastReset = now;
      guestBuckets.set(ip, bucket);

      return next();
    } catch (err) {
      console.error("UsageLimit middleware error:", err);
      return res.status(500).json({ ok: false, error: "Internal middleware error" });
    }
  };
}


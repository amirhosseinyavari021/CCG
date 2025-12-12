// server/middleware/usageLimit.js
import User from "../models/User.js";

const guestBuckets = new Map(); // key: IP → { count, lastReset }

function isSameDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function usageLimit() {
  return async function (req, res, next) {
    try {
      const now = new Date();

      // ==========================
      // ۱) کاربر لاگین‌شده
      // ==========================
      if (req.user?.id) {
        const user = await User.findById(req.user.id);
        if (!user) {
          return res.status(401).json({ error: "کاربر یافت نشد." });
        }

        if (!user.usage) {
          user.usage = {
            dailyUsed: 0,
            lastReset: now,
          };
        }

        if (!user.usage.lastReset || !isSameDay(now, user.usage.lastReset)) {
          user.usage.dailyUsed = 0;
          user.usage.lastReset = now;
        }

        const planLimit =
          user.plan === "free"
            ? 20   // لیمیت کاربر پلن رایگان
            : 200; // پلن‌های بالاتر (بعداً تنظیم می‌کنی)

        if (user.usage.dailyUsed >= planLimit) {
          return res
            .status(429)
            .json({ error: "محدودیت استفاده روزانه شما به پایان رسیده است." });
        }

        user.usage.dailyUsed += 1;
        await user.save();

        return next();
      }

      // ==========================
      // ۲) مهمان (بدون توکن)
      // ==========================
      const ipHeader = req.headers["x-forwarded-for"];
      const ip =
        (Array.isArray(ipHeader)
          ? ipHeader[0]
          : (ipHeader || "").split(",")[0].trim()) ||
        req.ip ||
        "unknown";

      let bucket = guestBuckets.get(ip);
      if (!bucket || !isSameDay(now, bucket.lastReset)) {
        bucket = { count: 0, lastReset: now };
      }

      const guestLimit = 5; // ✅ لیمیت مهمان: ۵ درخواست در روز

      if (bucket.count >= guestLimit) {
        guestBuckets.set(ip, bucket);
        return res.status(429).json({
          error:
            "محدودیت استفاده مهمان به پایان رسیده است. لطفاً ثبت‌نام کنید تا ادامه دهید.",
        });
      }

      bucket.count += 1;
      bucket.lastReset = now;
      guestBuckets.set(ip, bucket);

      return next();
    } catch (err) {
      console.error("UsageLimit middleware error:", err);
      return res.status(500).json({ error: "Internal middleware error" });
    }
  };
}

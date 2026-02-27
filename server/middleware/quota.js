// server/middleware/quota.js
import UsageDaily from "../models/UsageDaily.js";
import { utcDayKey, nextUtcMidnightMs } from "../utils/dayKey.js";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function getOwner(req) {
  if (req.session?.userId) return { ownerType: "user", ownerId: String(req.session.userId) };
  const gid = s(req.guestId).trim();
  return { ownerType: "guest", ownerId: gid || "unknown" };
}

export function quota({ bucket, limitUser, limitGuest }) {
  return async (req, res, next) => {
    try {
      const { ownerType, ownerId } = getOwner(req);
      const dayKey = utcDayKey(new Date());
      const resetAtUtc = nextUtcMidnightMs(new Date());

      const limit = ownerType === "guest" ? Number(limitGuest) : Number(limitUser);

      // اگر limit = Infinity یا <=0 یعنی چک نکن
      if (!Number.isFinite(limit) || limit <= 0) {
        res.setHeader("X-Quota-Limit", "unlimited");
        res.setHeader("X-Quota-Remaining", "unlimited");
        res.setHeader("X-Quota-Reset", String(resetAtUtc));
        return next();
      }

      const doc = await UsageDaily.findOneAndUpdate(
        { ownerType, ownerId, dayKey },
        { $setOnInsert: { ownerType, ownerId, dayKey, counters: {} } },
        { upsert: true, new: true }
      );

      const counters = doc.counters || {};
      const used = Number(counters[bucket] || 0);

      if (used >= limit) {
        res.setHeader("X-Quota-Limit", String(limit));
        res.setHeader("X-Quota-Remaining", "0");
        res.setHeader("X-Quota-Reset", String(resetAtUtc));

        // guest -> نیاز به لاگین
        if (ownerType === "guest") {
          return res.status(401).json({
            ok: false,
            error: {
              code: "GUEST_LIMIT_REACHED",
              userMessage: "برای ادامه استفاده باید وارد حساب کاربری شوی.",
              requestId: req.requestId,
            },
            quota: { bucket, limit, remaining: 0, resetAtUtc },
          });
        }

        return res.status(429).json({
          ok: false,
          error: {
            code: "DAILY_LIMIT_REACHED",
            userMessage: "سقف استفاده امروزت تمام شده. فردا دوباره امتحان کن.",
            requestId: req.requestId,
          },
          quota: { bucket, limit, remaining: 0, resetAtUtc },
        });
      }

      // increment
      counters[bucket] = used + 1;
      doc.counters = counters;
      await doc.save();

      const remaining = Math.max(0, limit - (used + 1));

      res.setHeader("X-Quota-Limit", String(limit));
      res.setHeader("X-Quota-Remaining", String(remaining));
      res.setHeader("X-Quota-Reset", String(resetAtUtc));

      req.quota = { bucket, limit, remaining, resetAtUtc, used: used + 1 };
      next();
    } catch (e) {
      // در صورت خطای DB: برای اینکه UX نخوابه، next()
      // ولی اگر می‌خوای سخت‌گیر باشه می‌تونیم 503 بدیم.
      next();
    }
  };
}

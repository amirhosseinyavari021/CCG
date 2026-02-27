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

function pickUserLimit(req, limitUser) {
  // limitUser can be:
  // - number
  // - { free: number, pro: number }
  const plan = s(req.session?.plan || "free").toLowerCase() === "pro" ? "pro" : "free";
  if (typeof limitUser === "object" && limitUser) {
    const v = plan === "pro" ? limitUser.pro : limitUser.free;
    return Number(v);
  }
  return Number(limitUser);
}

export function quota({ bucket, limitUser, limitGuest }) {
  return async (req, res, next) => {
    try {
      const { ownerType, ownerId } = getOwner(req);
      const dayKey = utcDayKey(new Date());
      const resetAtUtc = nextUtcMidnightMs(new Date());

      const limit = ownerType === "guest" ? Number(limitGuest) : pickUserLimit(req, limitUser);

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

        return res.status(429).json({
          ok: false,
          error: {
            code: "QUOTA_EXCEEDED",
            userMessage: "سهمیه روزانه این سرویس تموم شده. فردا دوباره امتحان کن.",
            bucket,
            limit,
            used,
            requestId: req.requestId,
          },
        });
      }

      counters[bucket] = used + 1;
      doc.counters = counters;
      await doc.save();

      res.setHeader("X-Quota-Limit", String(limit));
      res.setHeader("X-Quota-Remaining", String(Math.max(0, limit - (used + 1))));
      res.setHeader("X-Quota-Reset", String(resetAtUtc));

      return next();
    } catch (e) {
      // fail-open (سرویس نخوابه)
      return next();
    }
  };
}

// server/middleware/checkLimits.js

import Usage from "../models/Usage.js";
import { PLANS } from "../core/planConfig.js";

export const checkLimits = async (req, res, next) => {
  try {
    const user = req.user;

    const planConfig = PLANS[user.plan] || PLANS.FREE;

    const today = new Date().toISOString().slice(0, 10);

    let usage = await Usage.findOne({ userId: user._id, date: today });

    if (!usage) {
      usage = await Usage.create({
        userId: user._id,
        date: today
      });
    }

    const platform = req.body.platform || "other";

    const key = {
      windows: "windowsDaily",
      mac: "macDaily",
      linux: "linuxDaily",
      other: "otherDaily",
      compare: "compareDaily"
    }[platform];

    // افزایش مصرف
    const current = usage[platform] || 0;
    const max = planConfig[key];

    if (current >= max) {
      return res.status(429).json({
        error: "limit_reached",
        message: `Your daily limit for ${platform} has been reached.`,
      });
    }

    usage[platform] = current + 1;
    await usage.save();

    next();
  } catch (err) {
    console.error("Limit middleware error:", err);
    res.status(500).json({ error: "server_error" });
  }
};

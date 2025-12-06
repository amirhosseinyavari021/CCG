import User from "../models/User.js";

export function usageLimit() {
  return async function (req, res, next) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const now = new Date();
      const last = new Date(user.usage.lastReset);

      const isNewDay =
        now.getUTCDate() !== last.getUTCDate() ||
        now.getUTCMonth() !== last.getUTCMonth() ||
        now.getUTCFullYear() !== last.getUTCFullYear();

      if (isNewDay) {
        user.usage.dailyUsed = 0;
        user.usage.lastReset = now;
        await user.save();
      }

      if (user.plan === "free" && user.usage.dailyUsed >= 20) {
        return res
          .status(429)
          .json({ error: "Daily limit reached. Upgrade to continue." });
      }

      user.usage.dailyUsed += 1;
      await user.save();

      next();
    } catch (err) {
      console.error("UsageLimit middleware error:", err);
      res.status(500).json({ error: "Internal middleware error" });
    }
  };
}

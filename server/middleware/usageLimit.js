export const usageLimit = (options = {}) => {
  const { maxFreeDaily = 30 } = options;

  return async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(500).json({ error: 'مشکل داخلی احراز هویت.' });

    const now = new Date();
    const lastReset = user.usage?.lastReset || new Date(0);
    const diff = now.getTime() - lastReset.getTime();

    // reset every 24h
    if (diff > 24 * 60 * 60 * 1000) {
      user.usage.dailyUsed = 0;
      user.usage.lastReset = now;
    }

    // active trial → no limit
    if (user.trialEnds && user.trialEnds > now) {
      req.incrementUsage = async () => {
        user.usage.dailyUsed += 1;
        await user.save();
      };
      return next();
    }

    if (user.plan === 'free' && user.usage.dailyUsed >= maxFreeDaily) {
      return res.status(429).json({
        error: 'سقف استفاده امروز پلن رایگان شما تمام شده است.',
        code: 'FREE_LIMIT_REACHED'
      });
    }

    req.incrementUsage = async () => {
      user.usage.dailyUsed += 1;
      await user.save();
    };

    next();
  };
};

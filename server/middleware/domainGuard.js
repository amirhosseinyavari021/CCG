// server/middleware/domainGuard.js

export function domainGuard() {
  return function (req, res, next) {
    try {
      // بعضی درخواست‌ها (GET /health) اصلاً body ندارن
      const origin = req.headers?.origin || "";
      const host = req.headers?.host || "";

      // اگر whitelist داری (اختیاری)
      const allowedDomains = [
        "ccg.cando.ac",
        "cando.ac",
        "localhost",
        "127.0.0.1",
      ];

      const isAllowed =
        allowedDomains.some((d) => host.includes(d)) ||
        allowedDomains.some((d) => origin.includes(d));

      if (!isAllowed && process.env.NODE_ENV === "production") {
        return res.status(403).json({
          ok: false,
          error: "Forbidden domain",
          code: "DOMAIN_GUARD",
        });
      }

      return next();
    } catch (err) {
      console.error("DomainGuard error:", err);
      return res.status(500).json({
        ok: false,
        error: "Security middleware failure",
        code: "DOMAIN_GUARD_ERROR",
      });
    }
  };
}

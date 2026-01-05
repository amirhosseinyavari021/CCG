// server/middleware/domainGuard.js
// CCG_DOMAIN_GUARD_V2 (do not remove)
//
// هدف: اگر لیست دامنه‌ها تعریف شده بود، فقط همان‌ها اجازه داشته باشند.
// اگر چیزی تعریف نشده بود => همه مجاز (برای اینکه سرویس نخوابد).
//
// env های قابل قبول:
// - CCG_ALLOWED_HOSTS="ccg.cando.ac,localhost,127.0.0.1"
// - ALLOWED_HOSTS="..."

function parseAllowed(raw) {
  return String(raw || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function domainGuard(req, res, next) {
  try {
    const raw =
      process.env.CCG_ALLOWED_HOSTS ||
      process.env.ALLOWED_HOSTS ||
      "";

    const allowed = parseAllowed(raw);

    // اگر چیزی تنظیم نشده، کلاً گارد را غیرفعال کن (سرویس باید بالا بیاید)
    if (!allowed.length) return next();

    const xfHost = (req.headers["x-forwarded-host"] || "").toString();
    const hostHeader = (xfHost || req.headers.host || "").toString();
    const host = hostHeader.split(",")[0].trim().split(":")[0].toLowerCase();

    if (!host) return next();

    if (allowed.includes(host)) return next();

    res.status(403).json({
      ok: false,
      error: "Host not allowed",
      host,
      allowed,
    });
  } catch (e) {
    // fail-open: اگر گارد خودش خراب شد، سرویس نخوابد
    return next();
  }
}

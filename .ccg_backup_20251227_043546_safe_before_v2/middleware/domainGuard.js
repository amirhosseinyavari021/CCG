export default function domainGuard(req, res, next) {
  try {
    // اگر بدنه یا هدرها نباشن، هیچ کاری نکن
    if (!req || !req.headers) return next();
    // اگر پروژه‌ت restriction دامنه داره، اینجا پیاده‌سازی می‌مونه
    return next();
  } catch (e) {
    return next();
  }
}

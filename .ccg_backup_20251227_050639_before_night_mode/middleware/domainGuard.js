export default function domainGuard(req, res, next) {
  try {
    // هیچ وقت به req.body وابسته نباش (ممکنه هنوز express.json اجرا نشده باشه)
    if (!req || !req.headers) return next();
    // اگر بعداً خواستی دامنه/Origin چک کنی، از req.headers.origin استفاده کن
    return next();
  } catch (e) {
    return next();
  }
}

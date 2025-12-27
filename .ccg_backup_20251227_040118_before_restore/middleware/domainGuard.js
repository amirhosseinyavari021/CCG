export default function domainGuard(req, res, next) {
  // Safe no-op guard: never crash even if called oddly.
  try {
    return next();
  } catch (e) {
    return next();
  }
}

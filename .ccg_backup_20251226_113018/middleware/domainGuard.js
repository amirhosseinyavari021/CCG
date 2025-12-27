export default function domainGuard(req, res, next) {
  try {
    if (!req || !req.headers) return next();
    return next();
  } catch (e) {
    return next();
  }
}

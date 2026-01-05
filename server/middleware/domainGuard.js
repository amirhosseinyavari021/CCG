// server/middleware/domainGuard.js
// Safe Express middleware: never throws, always calls next()
export default function domainGuard(req, res, next) {
  try {
    return next();
  } catch (e) {
    return next();
  }
}

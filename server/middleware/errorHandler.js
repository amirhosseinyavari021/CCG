// server/middleware/errorHandler.js
import { CCGError } from "../core/ccgError.js";
import { fail } from "../core/response.js";

export function errorHandler(err, req, res, next) {
  // detect language
  const lang =
    (req.user?.lang) ||
    (req.body?.lang) ||
    (req.query?.lang) ||
    "en";

  // known typed errors
  if (err instanceof CCGError) {
    return fail(res, {
      code: err.code || "INTERNAL_ERROR",
      status: err.status || 500,
      lang,
      details: err.details || {},
      message: err.message,
    });
  }

  // fallback
  console.error("Unhandled error:", err);
  return fail(res, {
    code: "INTERNAL_ERROR",
    status: 500,
    lang,
    details: {},
  });
}

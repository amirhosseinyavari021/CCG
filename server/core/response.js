// server/core/response.js
import { ERROR_MESSAGES } from "./errors.js";

export function ok(res, { output_md, meta = {}, extra = {} }) {
  // Backward compatible fields:
  // - output (old)
  // - error (old)
  return res.json({
    ok: true,
    data: {
      output_md,
      meta,
      ...extra,
    },
    error: null,
    output: output_md,
  });
}

export function fail(res, { code, status = 500, lang = "en", details = {}, message }) {
  const safeLang = lang === "fa" ? "fa" : "en";
  const msg =
    message ||
    ERROR_MESSAGES?.[code]?.[safeLang] ||
    ERROR_MESSAGES.INTERNAL_ERROR[safeLang];

  // standard headers for rate limit UX
  if (code === "RATE_LIMITED" && typeof details?.retryAfterSec === "number") {
    res.setHeader("Retry-After", String(details.retryAfterSec));
  }

  return res.status(status).json({
    ok: false,
    data: null,
    error: {
      code,
      message: msg,
      details,
    },
    // Backward compatible
    output: "",
  });
}


// server/core/ccgError.js
export class CCGError extends Error {
  /**
   * @param {object} opts
   * @param {string} opts.code - stable code (EN) e.g. RATE_LIMITED
   * @param {number} [opts.status=500]
   * @param {object} [opts.details]
   * @param {string} [opts.message] - fallback (EN), localized later
   */
  constructor({ code, status = 500, details = {}, message = "" }) {
    super(message || code);
    this.name = "CCGError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

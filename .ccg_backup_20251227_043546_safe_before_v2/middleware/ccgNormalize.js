// server/middleware/ccgNormalize.js
// هدف: بک‌اند/فرانت‌اند روی یک payload هم‌نظر باشند، بدون شکستن ساختار قبلی
export default function ccgNormalize(req, res, next) {
  try {
    const b = (req && req.body && typeof req.body === "object") ? req.body : {};
    const out = { ...b };

    // normalize language
    out.lang = out.lang || out.language || out.locale || "fa";

    // normalize mode
    const m = (out.mode || out.action || "").toString().toLowerCase().trim();
    out.mode = (m === "learn" || m === "explain") ? "learn" : (m || "generate");

    // normalize user request
    out.userRequest =
      out.userRequest ||
      out.user_request ||
      out.prompt ||
      out.input ||
      out.text ||
      "";

    // normalize OS/platform
    out.os =
      out.os ||
      out.platform ||
      out.system ||
      out.operatingSystem ||
      "";

    // normalize shell/cli
    out.shell =
      out.shell ||
      out.cli ||
      out.terminal ||
      "";

    // keep existing advanced fields if present (network/vendor/device/etc)
    // do not delete anything

    // sensible defaults (only if missing)
    out.outputStyle = out.outputStyle || out.style || "operational";
    out.knowledgeLevel = out.knowledgeLevel || out.level || "beginner";

    req.body = out;
    return next();
  } catch (e) {
    return next();
  }
}

// server/middleware/ccgNormalize.js (ESM)
// هدف: یکسان‌سازی کلیدهای فرانت/بک برای جلوگیری از 400 های ناشی از mismatch
export function ccgNormalize(req, res, next) {
  try {
    // اطمینان از اینکه body وجود دارد
    let b = req.body;
    if (b == null) b = {};
    if (typeof b === "string") {
      try { b = JSON.parse(b); } catch { b = { raw: b }; }
    }
    if (typeof b !== "object") b = {};

    // helper
    const pick = (...keys) => {
      for (const k of keys) {
        if (b[k] !== undefined && b[k] !== null) return b[k];
      }
      return undefined;
    };

    // فیلدهای اصلی (alias ها)
    const userRequest = pick("userRequest", "user_request", "request", "prompt", "text", "body", "input");
    const lang = pick("lang", "language") ?? "fa";
    const mode = pick("mode", "action", "task") ?? "generate";

    // فیلدهای اختیاری (چیزهایی که تو UI داشتید)
    const awarenessLevel = pick("awarenessLevel", "awareness_level", "awareness", "level");
    const outputStyle = pick("outputStyle", "output_style", "style");
    const network = pick("network", "netword", "netwrok"); // typo tolerant
    const description = pick("description", "details", "desc");

    // یک بدنه‌ی نرمال
    const normalized = {
      mode,
      lang,
      userRequest: typeof userRequest === "string" ? userRequest : (userRequest != null ? String(userRequest) : ""),
      awarenessLevel,
      outputStyle,
      network,
      description,
      // باقی فیلدها را هم نگه می‌داریم (بدون شکستن)
      ...b,
    };

    // ولی مطمئن می‌شیم کلید canonical هم وجود دارد
    normalized.userRequest = normalized.userRequest ?? "";
    normalized.lang = normalized.lang ?? "fa";
    normalized.mode = normalized.mode ?? "generate";

    // در req.body بگذار
    req.body = normalized;
    // برای دیباگ
    req.ccgNormalized = { keys: Object.keys(normalized), preview: (normalized.userRequest || "").slice(0, 120) };

    return next();
  } catch (e) {
    // fail-safe
    return next();
  }
}

export default ccgNormalize;

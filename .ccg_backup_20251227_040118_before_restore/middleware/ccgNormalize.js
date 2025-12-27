export default function ccgNormalize(req, res, next) {
  try {
    const b = (req && req.body && typeof req.body === "object") ? req.body : {};

    const modeRaw =
      b.mode ?? b.action ?? b.taskType ?? b.type ?? "generate";

    const mode =
      (String(modeRaw).toLowerCase() === "learn") ? "learn" : "generate";

    const lang =
      (b.lang ?? b.language ?? "fa");

    const osRaw =
      b.os ?? b.platform ?? b.system ?? "linux";
    const os = String(osRaw).toLowerCase();

    const outputStyle =
      b.outputStyle ?? b.style ?? b.output_style ?? (mode === "learn" ? "detailed" : "clean");

    const userRequest =
      b.userRequest ??
      b.user_request ??
      b.user_request_text ??
      b.prompt ??
      b.input ??
      b.text ??
      b.command ??
      "";

    // keep both camelCase and snake_case so nothing breaks
    req.body = {
      ...b,
      mode,
      lang,
      os,
      outputStyle,
      userRequest,
      user_request: userRequest
    };

    return next();
  } catch (e) {
    // even normalization must never crash
    return next();
  }
}

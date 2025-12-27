// middleware/ccgNormalize.js
// هدف: یکدست کردن payload های فرانت و سازگاری با بک‌اند فعلی بدون تغییر منطق اصلی route
// - فیلدهای مختلف را map می‌کند به کلیدهای legacy
// - default می‌گذارد تا 400 های ناشی از نبود فیلد کم شود
// - Learn mode را هم استاندارد می‌کند

function guessCli(platform, shell, vendor) {
  if (platform === "network") return vendor || "network";
  if (platform === "windows") return shell || "powershell";
  if (platform === "mac") return shell || "zsh";
  return shell || "bash";
}

// heuristic mismatch detection (سبک و بدون ریسک)
function detectMismatch(platform, text) {
  const s = (text || "").toLowerCase();

  const winHints = ["powershell", "get-process", "get-childitem", "ipconfig", "dir ", "chkdsk", "netsh"];
  const nixHints = ["sudo ", "apt ", "yum ", "dnf ", "systemctl", "ls ", "grep ", "awk ", "chmod ", "chown "];
  const macHints = ["brew ", "defaults write", "launchctl"];
  const isWin = winHints.some((x) => s.includes(x));
  const isNix = nixHints.some((x) => s.includes(x));
  const isMac = macHints.some((x) => s.includes(x));

  if (platform === "windows" && (isNix || isMac)) return "windows";
  if ((platform === "linux") && isWin) return "linux";
  if ((platform === "mac") && (isWin || isNix)) return "mac";
  return "";
}

module.exports = function ccgNormalize(req, res, next) {
  const b = req.body || {};

  const mode = (b.mode || b.task || "generate").toString();
  const lang = (b.lang || "en").toString();

  const platform = (b.platform || b.os || "linux").toString();
  const outputType = (b.outputType || b.output_type || "command").toString();
  const output_style = (b.output_style || b.style || "operational").toString();
  const knowledgeLevel = (b.knowledgeLevel || b.knowledge_level || "beginner").toString();

  const shell = (b.shell || b.cliShell || b.cli || "").toString();
  const vendor = (b.vendor || "").toString();
  const deviceType = (b.deviceType || b.device_type || "general").toString();

  // main input
  const user_request =
    (b.user_request || b.userRequest || b.request || b.input || "").toString();

  const error_message =
    (b.error_message || b.errorMessage || b.context || "").toString();

  const cli = (b.cli || guessCli(platform, shell, vendor)).toString();

  const mismatch = mode === "learn" ? detectMismatch(platform, user_request) : "";

  req.body = {
    ...b,

    // normalized
    mode,
    lang,

    platform,
    os: platform, // legacy

    outputType,
    output_style,
    knowledgeLevel,

    shell,
    vendor,
    deviceType: platform === "network" ? (deviceType || "general") : (deviceType || "general"),
    cli,

    user_request,
    error_message,

    // meta info (اگر بک‌اند خواست استفاده کند)
    ccg_meta: {
      mismatch,
      normalized: true,
    },
  };

  next();
};

export default function ccgNormalize(req, res, next) {
  const b = (req && req.body && typeof req.body === "object") ? req.body : {};

  const modeRaw = String(b.mode ?? b.state ?? b.action ?? b.intent ?? "generate").toLowerCase();
  const mode = (modeRaw === "learn" || modeRaw === "explain") ? "learn" : "generate";

  const userRequest = String(
    b.userRequest ?? b.user_request ?? b.prompt ?? b.input ?? b.command ?? b.code ?? ""
  ).trim();

  const lang = String(b.lang ?? b.language ?? "fa").trim().slice(0, 8) || "fa";

  const osRaw = String(b.os ?? b.platform ?? b.system ?? "linux").toLowerCase();
  const os = osRaw.includes("win") ? "windows"
          : (osRaw.includes("mac") || osRaw.includes("osx")) ? "macos"
          : "linux";

  const shellRaw = String(b.shell ?? b.cli ?? b.terminal ?? "bash").toLowerCase();
  let shell = shellRaw;

  // همخوانی OS/Shell (کیفیت + جلوگیری از جواب‌های غلط)
  if (os === "windows" && (shell === "bash" || shell === "zsh")) shell = "powershell";
  if (os !== "windows" && shell === "powershell") shell = "bash";

  const outputType = String(b.outputType ?? b.type ?? b.output_type ?? "command").toLowerCase();
  const outputStyle = String(b.outputStyle ?? b.style ?? b.output_style ?? "operational").toLowerCase();
  const knowledgeLevel = String(b.knowledgeLevel ?? b.level ?? b.skill ?? "beginner").toLowerCase();

  req.ccg = {
    mode,
    userRequest,
    lang,
    os,
    shell,
    outputType,
    outputStyle,
    knowledgeLevel,
    raw: b
  };

  return next();
}

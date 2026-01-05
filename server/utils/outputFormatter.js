// server/utils/outputFormatter.js
// ✅ Tool Contract for Generator (stable, non-chatty UI)
// Output (tool):
// {
//   primary: { command, lang },
//   explanation: string,
//   warnings: string[],
//   alternatives: [{ command, note }, ...] (always 3)
// }
// Also returns markdown (same template) as fallback.
// Back-compat exports:
// - formatToolResponse (main)
// - formatOutput (alias)

function fenceLangFromCli(cli = "bash", outputType = "command") {
  const c = String(cli || "").toLowerCase();
  const ot = String(outputType || "").toLowerCase();
  if (ot === "python") return "python";
  if (c.includes("powershell") || c === "pwsh") return "powershell";
  if (c.includes("cmd")) return "cmd";
  return "bash";
}

function splitFirstCodeBlock(text) {
  const t = String(text ?? "").trim();
  const m = t.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!m) return { codeRaw: "", rest: t };
  const codeRaw = String(m[1] ?? "").trim();
  const rest = t.replace(m[0], "").trim();
  return { codeRaw, rest };
}

function looksLikeCommand(line) {
  const s = String(line || "").trim();
  if (!s) return false;
  if (s.length > 220) return false;
  if (/[.،؛!?]$/.test(s)) return false; // prose ending
  // starts with sudo/tool-ish token
  return /^(sudo\s+)?[a-zA-Z0-9._-]+(\s+|$)/.test(s);
}

function normalizePrimaryCommand(rawText, cliLang) {
  const { codeRaw, rest } = splitFirstCodeBlock(rawText);
  let cmd = "";

  if (codeRaw) {
    const lines = codeRaw.split("\n").map((x) => x.trim()).filter(Boolean);
    const cmdLines = lines.filter(looksLikeCommand);
    cmd = (cmdLines.length ? cmdLines : lines.slice(0, 1)).join("\n").trim();
  }

  if (!cmd) {
    // fallback: first command-like line from whole text
    const lines = String(rawText || "").split("\n").map((x) => x.trim());
    const first = lines.find(looksLikeCommand);
    if (first) cmd = first;
  }

  // last fallback
  if (!cmd) cmd = cliLang === "powershell" ? "Get-Help <command>" : "man <command>";

  return { cmd, restText: rest || "" };
}

function pickDefaultsByHeuristic(cmd, cliLang, os, userRequest) {
  const c = String(cmd || "").toLowerCase();
  const req = String(userRequest || "").toLowerCase();

  // defaults
  let explanation = "";
  let warnings = [];
  let alternatives = [];

  const isWindowsCmd = cliLang === "cmd";
  const isPowershell = cliLang === "powershell";

  // --- Reboot / shutdown
  if (c.includes("reboot") || c.includes("shutdown") || req.includes("ریستارت") || req.includes("reboot")) {
    explanation = "این دستور سیستم را ریستارت می‌کند.";
    warnings = [
      "قبل از اجرا، کارهای ذخیره‌نشده را ذخیره کنید.",
      "اگر روی SSH هستید، اتصال شما قطع می‌شود.",
      "در محیط Production بهتر است زمان‌بندی/اطلاع‌رسانی انجام شود."
    ];
    alternatives = [
      { command: "sudo systemctl reboot", note: "روش استاندارد در سیستم‌های systemd" },
      { command: "sudo shutdown -r now", note: "ریستارت فوری" },
      { command: "sudo shutdown -r +1", note: "ریستارت با ۱ دقیقه تأخیر" },
    ];
    return { explanation, warnings, alternatives };
  }

  // --- Linux service restart
  if (c.startsWith("systemctl") && (c.includes("restart") || req.includes("ریستارت سرویس"))) {
    explanation = "سرویس را ریستارت می‌کند تا تغییرات اعمال شود یا مشکل موقت برطرف شود.";
    warnings = [
      "ریستارت سرویس ممکن است باعث قطعی لحظه‌ای شود.",
      "اگر سرویس stateful است، قبل از ریستارت وضعیت را بررسی کنید."
    ];
    alternatives = [
      { command: cmd.replace(/\brestart\b/i, "status"), note: "قبل از اقدام، وضعیت سرویس" },
      { command: cmd.replace(/\brestart\b/i, "reload"), note: "اگر پشتیبانی شود، بدون قطع کامل" },
      { command: cmd.replace(/\brestart\b/i, "try-restart"), note: "فقط اگر سرویس در حال اجرا باشد" },
    ];
    return { explanation, warnings, alternatives };
  }

  // --- Windows local users
  if ((req.includes("یوزر") || req.includes("کاربر") || req.includes("user")) && (c.startsWith("net user") || c === "net user")) {
    explanation = "لیست کاربران محلی را نمایش می‌دهد.";
    warnings = [
      "در سیستم‌های Domain، خروجی ممکن است با کاربران دامنه متفاوت باشد.",
      "برای برخی اطلاعات ممکن است دسترسی Administrator لازم باشد."
    ];
    alternatives = [
      { command: "net user | find /c /v \"\"", note: "تعداد کاربران (شمارش خطوط خروجی)" },
      { command: "powershell -Command \"Get-LocalUser | Select -Expand Name\"", note: "لیست کاربران با PowerShell" },
      { command: "whoami", note: "نمایش کاربر فعلی (جایگزین مستقیم نیست، اما رایج)" },
    ];
    return { explanation, warnings, alternatives };
  }

  // --- Fallback generic
  explanation = "دستور بالا اقدام اصلی مرتبط با درخواست شما را انجام می‌دهد.";
  warnings = [
    "قبل از اجرا، مطمئن شوید روی سیستم/محیط درست هستید.",
    "در صورت نیاز به دسترسی بالا، از sudo/Administrator استفاده کنید."
  ];
  alternatives = [
    { command: cmd, note: "همان دستور (اصلی)" },
    { command: isWindowsCmd ? "help" : "--help", note: "نمایش راهنمای ابزار" },
    { command: isWindowsCmd ? "where <command>" : "which <command>", note: "بررسی مسیر/وجود دستور" },
  ];
  return { explanation, warnings, alternatives };
}

function renderMarkdown(primary, explanation, warnings, alternatives, langTag) {
  const altMd = alternatives.map((a, i) =>
    `- ${a.note}\n\n\`\`\`${langTag}\n${a.command}\n\`\`\``
  ).join("\n\n");

  const warnMd = warnings.map((w) => `- ${w}`).join("\n");

  return `\`\`\`${langTag}\n${primary}\n\`\`\`\n\n## توضیح\n${explanation}\n\n## هشدارها\n${warnMd}\n\n## جایگزین‌ها\n${altMd}\n`;
}

export function formatToolResponse({ text, cli = "bash", outputType = "markdown", os = "linux", lang = "fa", userRequest = "" }) {
  const langTag = fenceLangFromCli(cli, outputType);
  const raw = String(text ?? "").trim();

  // Primary command extraction
  const { cmd, restText } = normalizePrimaryCommand(raw, langTag);

  // Try to reuse some explanation from model if it exists (short), else heuristic
  const heuristic = pickDefaultsByHeuristic(cmd, langTag, os, userRequest);

  let explanation = heuristic.explanation;
  if (restText && restText.length >= 10 && restText.length <= 420) {
    // use short remainder as explanation if it looks like prose
    explanation = restText.replace(/^#+\s*/g, "").trim() || explanation;
  }

  // ensure always 3 alternatives
  const alternatives = (heuristic.alternatives || []).slice(0, 3);
  while (alternatives.length < 3) alternatives.push({ command: cmd, note: "جایگزین" });

  const tool = {
    primary: { command: cmd, lang: langTag },
    explanation,
    warnings: (heuristic.warnings || []).length ? heuristic.warnings : ["قبل از اجرا بررسی کنید."],
    alternatives
  };

  const markdown = renderMarkdown(
    tool.primary.command,
    tool.explanation,
    tool.warnings,
    tool.alternatives,
    tool.primary.lang
  );

  return { tool, markdown };
}

// Back-compat alias
export const formatOutput = formatToolResponse;

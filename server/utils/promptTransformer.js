// server/utils/promptTransformer.js
// Goal: deterministic "generate" prompt -> JSON ONLY tool contract

function asStr(x, d="") { try { return String(x ?? d); } catch { return d; } }

export function toPromptVariables(payload = {}) {
  const p = payload && typeof payload === "object" ? payload : {};
  const ur = asStr(
    p.user_request ?? p.userRequest ?? p.request ?? p.prompt ?? ""
  ).trim();

  return {
    lang: asStr(p.lang, "fa"),
    os: asStr(p.os, "linux").toLowerCase(),
    cli: asStr(p.cli ?? p.shell ?? p.terminal, "bash").toLowerCase(),
    knowledgeLevel: asStr(p.knowledgeLevel, "").toLowerCase(), // beginner|intermediate|pro
    outputType: asStr(p.outputType, "markdown").toLowerCase(),  // markdown|tool|command|script|python
    vendor: asStr(p.vendor, ""),
    deviceType: asStr(p.deviceType, ""),
    user_request: ur,
    mode: asStr(p.mode, "generate").toLowerCase(),
  };
}

function jsonContractSpecFa() {
  return `
تو فقط باید یک JSON معتبر برگردانی (بدون markdown، بدون متن اضافه، بدون سوال).
ساختار دقیق خروجی:

{
  "primary": { "command": "STRING", "lang": "bash|cmd|powershell|python|...", },
  "explanation": "STRING",
  "warnings": ["STRING", "STRING", "STRING"],
  "alternatives": [
    { "command": "STRING", "note": "STRING" },
    { "command": "STRING", "note": "STRING" },
    { "command": "STRING", "note": "STRING" }
  ]
}

قوانین:
- command فقط دستور/دستورات قابل اجرا باشد (بدون توضیح داخلش).
- همه چیز باید با OS و CLI انتخاب‌شده سازگار باشد. هیچ دستور مربوط به سیستم دیگر نده.
- warnings باید مرتبط با همان دستور/همان OS باشد (SSH/Production را فقط وقتی واقعا مرتبط است بگو).
- alternatives باید دقیقا ۳ گزینهٔ متفاوت و مرتبط باشند.
- اگر درخواست مبهم/ناقض بود یا اطلاعات کافی نبود:
  - primary.command را خالی بگذار
  - explanation: «درخواست مبهم است… جزئیات بده یا از Chat استفاده کن»
  - warnings و alternatives را هم با مقادیر کوتاه ولی امن پر کن (بدون دستور خطرناک).
`;
}

function fewShotExamples() {
  // Very small few-shot just to anchor format + OS/CLI correctness.
  return `
نمونه ۱ (Windows + CMD):
درخواست: "میخوام سیستمم 1 دقیقه دیگه خاموش بشه"
پاسخ JSON:
{"primary":{"command":"shutdown /s /t 60","lang":"cmd"},"explanation":"سیستم را 60 ثانیه دیگر خاموش می‌کند.","warnings":["قبل از اجرا فایل‌های ذخیره‌نشده را ذخیره کنید.","اگر برنامه‌ای تایمر خاموش شدن را بلاک کند ممکن است دیرتر انجام شود.","برای اجرای بعضی عملیات ممکن است نیاز به دسترسی Administrator باشد."],"alternatives":[{"command":"shutdown /a","note":"لغو خاموش شدن زمان‌بندی‌شده"},{"command":"shutdown /s /t 0","note":"خاموش شدن فوری"},{"command":"shutdown /r /t 60","note":"ریستارت پس از 60 ثانیه (به‌جای خاموشی)"}]}

نمونه ۲ (Linux + bash):
درخواست: "سیستمم رو ریستارت کنم"
پاسخ JSON:
{"primary":{"command":"sudo reboot","lang":"bash"},"explanation":"سیستم را ریستارت می‌کند.","warnings":["کارهای ذخیره‌نشده را ذخیره کنید.","اگر روی SSH هستید اتصال قطع می‌شود.","در محیط Production بهتر است هماهنگی/زمان‌بندی انجام شود."],"alternatives":[{"command":"sudo systemctl reboot","note":"روش استاندارد در سیستم‌های systemd"},{"command":"sudo shutdown -r now","note":"ریستارت فوری"},{"command":"sudo shutdown -r +1","note":"ریستارت با ۱ دقیقه تأخیر"}]}
`;
}

export function buildFallbackPrompt(v) {
  const lang = (v.lang || "fa").toLowerCase();
  const isFa = lang.startsWith("fa");

  const header = isFa
    ? `تو یک دستیار DevOps/SysAdmin هستی. خروجی تو باید ابزارمحور و دقیق باشد.`
    : `You are a DevOps/SysAdmin assistant. Output must be tool-like and precise.`;

  const ctx = isFa
    ? `
کانتکست قطعی کاربر:
- OS: ${v.os}
- CLI/Shell: ${v.cli}
- Vendor: ${v.vendor || "-"}
- DeviceType: ${v.deviceType || "-"}
- OutputType: ${v.outputType}
`
    : `
User fixed context:
- OS: ${v.os}
- CLI/Shell: ${v.cli}
- Vendor: ${v.vendor || "-"}
- DeviceType: ${v.deviceType || "-"}
- OutputType: ${v.outputType}
`;

  const rules = isFa ? jsonContractSpecFa() : jsonContractSpecFa(); // (فعلا فقط fa قوی)

  // Knowledge-level tuning (kept strict, but affects explanation verbosity)
  const levelHint = isFa ? `
تنظیم سطح:
- beginner: توضیح ساده و مرحله‌ای (ولی کوتاه).
- intermediate: توضیح فشرده.
- pro: توضیح خیلی کوتاه و مستقیم.
` : "";

  const req = isFa
    ? `درخواست کاربر: ${JSON.stringify(v.user_request)}`
    : `User request: ${JSON.stringify(v.user_request)}`;

  return [
    header,
    ctx,
    levelHint,
    rules,
    fewShotExamples(),
    req,
    `پاسخ را فقط به صورت JSON معتبر برگردان.`
  ].join("\n");
}

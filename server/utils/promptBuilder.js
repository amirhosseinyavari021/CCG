// /home/cando/CCG/server/utils/promptBuilder.js

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}
function bool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

export function buildGeneratorPrompt(vars = {}) {
  const lang = s(vars.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const cli = s(vars.cli || "bash").toLowerCase();
  const platform = s(vars.platform || vars.os || "linux").toLowerCase();

  const userReq = s(vars.user_request || vars.userRequest || vars.prompt || "").trim();

  const pythonMode = bool(vars.pythonScript) || s(vars.outputType).toLowerCase() === "python";
  const moreDetails = pythonMode ? false : bool(vars.moreDetails);
  const moreCommands = pythonMode ? false : bool(vars.moreCommands);

  const altCount = moreCommands ? 5 : 2;

  // متن راهنما بر اساس زبان
  const L = {
    fa: {
      sys: "تو یک ابزار تولید دستور برای CLI و DevOps هستی. خروجی باید فقط JSON معتبر باشد.",
      onlyJson: "فقط JSON بده. هیچ متن اضافی، هیچ Markdown، هیچ توضیح بیرون از JSON.",
      keys:
        "کلیدها دقیقاً همین‌ها باشند: mode, language, cli, command, explanation, warning, alternatives, details, pythonScript, pythonNotes",
      cliMode: `اگر حالت CLI است:
- mode = "cli"
- command: فقط یک دستور اصلی (یک خط)
- explanation: توضیح کوتاه و کاربردی
- warning: اگر ریسک/نیاز sudo/دسترسی وجود دارد، هشدار کوتاه بده (اگر نیست رشته خالی)
- alternatives: ${altCount} دستور جایگزین مرتبط با command (هرکدام یک خط)
- details: اگر moreDetails=true، 4 تا 8 نکته (آرایه)، وگرنه 2 تا 4 نکته`,
      pyMode:
        'اگر حالت پایتون است:\n- mode="python"\n- pythonScript: اسکریپت کامل و قابل اجرا\n- pythonNotes: چند خط توضیح درباره اجرا\n- سایر فیلدها می‌توانند خالی باشند',
      langRule:
        'language دقیقاً باید "fa" یا "en" باشد و تمام explanation/warning/details/pythonNotes در همان زبان نوشته شود.',
    },
    en: {
      sys: "You are a CLI/DevOps command generator. Output must be ONLY valid JSON.",
      onlyJson: "Return ONLY JSON. No markdown. No extra text.",
      keys:
        "Keys must be exactly: mode, language, cli, command, explanation, warning, alternatives, details, pythonScript, pythonNotes",
      cliMode: `If CLI mode:
- mode="cli"
- command: one main command (single line)
- explanation: short practical explanation
- warning: short warning if sudo/risk applies, else empty string
- alternatives: ${altCount} relevant alternative commands (single line each)
- details: if moreDetails=true provide 4-8 bullets, else 2-4 bullets`,
      pyMode:
        'If python mode:\n- mode="python"\n- pythonScript: complete runnable script\n- pythonNotes: short run instructions\n- other fields may be empty',
      langRule:
        'language must be exactly "fa" or "en" and all text fields must match that language.',
    },
  }[lang];

  const contract = {
    mode: pythonMode ? "python" : "cli",
    language: lang,
    cli: pythonMode ? "python" : cli,
    command: "",
    explanation: "",
    warning: "",
    alternatives: [],
    details: [],
    pythonScript: "",
    pythonNotes: "",
  };

  return [
    L.sys,
    L.onlyJson,
    L.keys,
    L.langRule,
    "",
    pythonMode ? L.pyMode : L.cliMode,
    "",
    `platform: ${platform}`,
    `cli: ${cli}`,
    `moreDetails: ${moreDetails ? "true" : "false"}`,
    `moreCommands: ${moreCommands ? "true" : "false"}`,
    "",
    "User request:",
    userReq ? userReq : "(empty)",
    "",
    "Return JSON with this shape:",
    JSON.stringify(contract, null, 2),
  ].join("\n");
}

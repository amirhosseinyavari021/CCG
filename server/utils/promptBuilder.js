// server/utils/promptBuilder.js

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}
function bool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function pickLang(vars) {
  return s(vars.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
}

function pickPlatform(vars) {
  return s(vars.platform || vars.os || "linux").toLowerCase();
}

function pickCli(vars) {
  const platform = pickPlatform(vars);
  const cli = s(vars.cli || "bash").toLowerCase();
  if (cli) return cli;
  return platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash";
}

function enforceLanguageBlock(lang) {
  if (lang === "en") {
    return [
      "LANGUAGE RULE (STRICT):",
      "- Output MUST be in English only.",
      "- Do NOT output any other language (no Chinese/Japanese/Korean/Arabic/etc).",
      "- Even if input contains other languages, analysis must remain English.",
    ].join("\n");
  }

  return [
    "قانون زبان (خیلی سخت‌گیرانه):",
    "- خروجی MUST فقط فارسی باشد.",
    "- هیچ زبان دیگری ننویس (نه کره‌ای/ژاپنی/چینی/انگلیسی و ...).",
    "- اگر ورودی کد/کلمات انگلیسی داشت، توضیح‌ها باز هم فارسی روان باشد.",
  ].join("\n");
}

/**
 * Generator prompt (JSON-only contract used by formatOutput)
 */
export function buildGeneratorPrompt(vars = {}) {
  const lang = pickLang(vars);
  const cli = pickCli(vars);
  const platform = pickPlatform(vars);

  const userReq = s(vars.user_request || vars.userRequest || vars.prompt || "").trim();

  const pythonMode = bool(vars.pythonScript) || s(vars.outputType).toLowerCase() === "python";
  const moreDetails = pythonMode ? false : bool(vars.moreDetails);
  const moreCommands = pythonMode ? false : bool(vars.moreCommands);

  const altCount = moreCommands ? 5 : 2;

  const L = {
    fa: {
      sys: "تو یک ابزار تولید دستور برای CLI/DevOps هستی. خروجی باید فقط JSON معتبر باشد.",
      onlyJson: "فقط JSON بده. هیچ متن اضافی و هیچ Markdown نده.",
      keys:
        "کلیدها دقیقاً همین‌ها باشند: mode, language, cli, command, explanation, warning, alternatives, details, pythonScript, pythonNotes",
      cliMode: `حالت CLI:
- mode="cli"
- command: فقط یک دستور اصلی (یک خط)
- explanation: توضیح کوتاه و کاربردی
- warning: اگر ریسک/نیاز sudo/دسترسی هست هشدار کوتاه بده، وگرنه رشته خالی
- alternatives: دقیقاً ${altCount} دستور جایگزین مرتبط (هرکدام یک خط)
- details: اگر moreDetails=true، 4 تا 8 نکته؛ وگرنه 2 تا 4 نکته`,
      pyMode:
        'حالت پایتون:\n- mode="python"\n- pythonScript: اسکریپت کامل و قابل اجرا\n- pythonNotes: چند خط توضیح اجرای اسکریپت\n- سایر فیلدها می‌توانند خالی باشند',
    },
    en: {
      sys: "You are a CLI/DevOps command generator. Output must be ONLY valid JSON.",
      onlyJson: "Return ONLY JSON. No markdown. No extra text.",
      keys:
        "Keys must be exactly: mode, language, cli, command, explanation, warning, alternatives, details, pythonScript, pythonNotes",
      cliMode: `CLI mode:
- mode="cli"
- command: one main command (single line)
- explanation: short practical explanation
- warning: short warning if sudo/risk applies, else empty string
- alternatives: exactly ${altCount} relevant alternatives (single line each)
- details: if moreDetails=true provide 4-8 bullets, else 2-4 bullets`,
      pyMode:
        'Python mode:\n- mode="python"\n- pythonScript: complete runnable script\n- pythonNotes: short run instructions\n- other fields may be empty',
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
    enforceLanguageBlock(lang),
    L.onlyJson,
    L.keys,
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

/**
 * Comparator prompt (Markdown output expected by UI)
 * هدف: 3 کارت تمیز + فارسی روان + فقط یک code block در آخر
 */
export function buildComparatorPrompt(vars = {}) {
  const lang = pickLang(vars);

  const userReq = s(vars.user_request || "").trim();
  const codeA = s(vars.input_a || vars.inputA || "");
  const codeB = s(vars.input_b || vars.inputB || "");

  const headings =
    lang === "en"
      ? {
          diff: "## Differences",
          qs: "## Quality & Security",
          merge: "## Final Merged Code",
        }
      : {
          diff: "## تفاوت‌ها",
          qs: "## کیفیت و امنیت",
          merge: "## کد Merge نهایی",
        };

  const formatRules =
    lang === "en"
      ? [
          "OUTPUT FORMAT (VERY STRICT):",
          "- Return VALID MARKDOWN only.",
          "- EXACTLY 3 sections with EXACT headings and EXACT order:",
          `  1) ${headings.diff}`,
          `  2) ${headings.qs}`,
          `  3) ${headings.merge}`,
          "- Do NOT add any other headings (no ###).",
          "- Use short intro line + bullet points under each section.",
          "- Use inline `code` for identifiers (function/var names) only.",
          "- IMPORTANT: Do NOT use triple-backticks anywhere except the final merged code block.",
          "- Final section MUST contain EXACTLY ONE fenced code block with language tag (e.g. ```javascript).",
          "- Avoid repetition: never list the same idea twice; compress similar points.",
          "- Be concrete: mention at least 3 real, specific technical differences referencing A & B logic.",
        ].join("\n")
      : [
          "قالب خروجی (خیلی سخت‌گیرانه):",
          "- فقط MARKDOWN معتبر برگردان.",
          "- دقیقاً فقط ۳ بخش و دقیقاً همین تیترها و دقیقاً به همین ترتیب:",
          `  1) ${headings.diff}`,
          `  2) ${headings.qs}`,
          `  3) ${headings.merge}`,
          "- تیتر اضافه ننویس (### ممنوع). فقط همین ۳ کارت.",
          "- زیر هر تیتر: یک جمله‌ی کوتاهِ جمع‌بندی + بولت‌های دقیق.",
          "- اسم تابع/متغیرها فقط با `inline code` باشد.",
          "- مهم: در هیچ جای پاسخ از ``` استفاده نکن، فقط در بخش آخر (کد نهایی).",
          "- بخش آخر دقیقاً فقط یک code fence سه‌تایی داشته باشد و داخلش کد کامل نهایی باشد.",
          "- تکرار ممنوع: یک نکته را چند بار با جمله‌های مختلف تکرار نکن.",
          "- دقیق باش: حداقل ۳ تفاوت واقعی و فنی (منطق/حافظه/پیچیدگی/بازسازی ops) را با اشاره به A و B بگو.",
          "- فارسی روان و کاربرپسند بنویس (نه ادبیات خشک/کلی‌گویی).",
        ].join("\n");

  const contentChecklist =
    lang === "en"
      ? [
          "CONTENT CHECKLIST:",
          "- Differences: (1) algorithm, (2) memory/time complexity, (3) backtracking/trace, (4) output semantics, (5) edge cases.",
          "- Quality & Security: (1) performance limits, (2) correctness risks, (3) input safety, (4) recommendations.",
          "- Final merged: choose best approach OR hybrid; include small readability improvements; keep API shape stable.",
        ].join("\n")
      : [
          "چک‌لیست محتوا:",
          "- تفاوت‌ها: (۱) الگوریتم، (۲) پیچیدگی/حافظه، (۳) منطق بازسازی ops (trace/backtrack)، (۴) شکل خروجی ops، (۵) لبه‌ها (ورودی خالی/فایل بزرگ).",
          "- کیفیت و امنیت: (۱) محدودیت کارایی، (۲) ریسک درست‌بودن، (۳) ایمنی ورودی‌ها، (۴) پیشنهادهای عملی.",
          "- کد Merge نهایی: بهترین رویکرد را انتخاب کن (یا ترکیبی منطقی)، کمی خواناتر/ایمن‌ترش کن، و شکل API را ثابت نگه دار.",
        ].join("\n");

  const fallbackReq =
    lang === "fa"
      ? "کد A و B را مقایسه کن، تفاوت‌ها را کوتاه اما دقیق بگو، کیفیت/امنیت را بررسی کن، و در پایان یک نسخه نهایی merge/improved بده."
      : "Compare A and B, explain differences briefly but precisely, review quality/security, and provide a final merged/improved version.";

  return [
    "You are CCG Code Comparator (NOT chat).",
    enforceLanguageBlock(lang),
    formatRules,
    "",
    contentChecklist,
    "",
    "User request:",
    userReq || fallbackReq,
    "",
    "Code A:",
    "```",
    codeA,
    "```",
    "",
    "Code B:",
    "```",
    codeB,
    "```",
    "",
    "REMINDER:",
    lang === "fa"
      ? "- فقط فارسی.\n- فقط ۳ تیتر.\n- فقط یک ``` در بخش آخر."
      : "- English only.\n- Exactly 3 headings.\n- Only one ``` in the final section.",
  ].join("\n");
}

/**
 * Strict comparator prompt (retry) => حتی سخت‌تر
 */
export function buildComparatorPromptStrict(vars = {}) {
  const lang = pickLang(vars);

  const headings =
    lang === "en"
      ? {
          diff: "## Differences",
          qs: "## Quality & Security",
          merge: "## Final Merged Code",
        }
      : {
          diff: "## تفاوت‌ها",
          qs: "## کیفیت و امنیت",
          merge: "## کد Merge نهایی",
        };

  const hard =
    lang === "en"
      ? [
          "HARD CONSTRAINTS (MUST FOLLOW):",
          "- English ONLY. Any other language => FAIL.",
          "- EXACTLY 3 sections with EXACT headings and order.",
          "- NO other headings (### not allowed).",
          "- ONLY ONE triple-backtick code block, and it MUST be in the final section.",
          "- Use inline `code` only for identifiers; do not wrap normal sentences in code.",
          "- Avoid verbose repetition; prefer compact bullets with bold labels.",
        ].join("\n")
      : [
          "قوانین سخت (حتماً اجرا کن):",
          "- فقط فارسی. هر زبان دیگر => مردود.",
          "- دقیقاً ۳ بخش با تیترهای دقیق و به ترتیب.",
          "- تیتر اضافه ممنوع (### ممنوع).",
          "- فقط یک بلاک ``` و فقط داخل بخش آخر.",
          "- بک‌تیک فقط برای نام‌ها/شناسه‌ها؛ جمله‌ها را کد نکن.",
          "- از تکرار و کلی‌گویی پرهیز کن؛ بولت‌های فشرده با برچسب‌های بولد بنویس.",
        ].join("\n");

  const base = buildComparatorPrompt(vars);
  return [base, "", hard].join("\n");
}

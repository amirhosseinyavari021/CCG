// /home/cando/CCG/server/utils/promptBuilder.js
// Provides prompts used by aiClient / routes.
// Exports:
// - buildGeneratorPrompt
// - buildComparatorPrompt
// - buildComparatorPromptStrict

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function langOf(ctx) {
  return s(ctx?.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
}

function norm(x) {
  return s(x).replace(/\s+/g, " ").trim();
}

function meta(ctx) {
  const a = norm(ctx?.codeLangA || "auto");
  const b = norm(ctx?.codeLangB || "auto");
  const same = ctx?.sameLang === true ? "same" : "diff";
  const mode = norm(ctx?.compareOutputMode || "");
  return `meta: compareOutputMode=${mode || "(auto)"}, codeLangA=${a}, codeLangB=${b}, relation=${same}`;
}

function headings(lang, compareOutputMode) {
  const fa = lang !== "en";
  if (String(compareOutputMode).toLowerCase() === "advice") {
    return {
      diff: fa ? "## تفاوت‌های فنی" : "## Technical Differences",
      a: fa ? "## پیشنهادهای بهبود برای کد A" : "## Improvement Suggestions for Code A",
      b: fa ? "## پیشنهادهای بهبود برای کد B" : "## Improvement Suggestions for Code B",
    };
  }
  return {
    diff: fa ? "## تفاوت‌های فنی" : "## Technical Differences",
    merge: fa ? "## کد Merge نهایی" : "## Final Merged Code",
  };
}

function qualityRules(lang) {
  const fa = lang !== "en";
  return [
    // Keep it short but dense
    fa
      ? "کیفیت: کمتر ولی دقیق‌تر. از کلی‌گویی پرهیز کن."
      : "Quality: fewer but sharper. Avoid generic advice.",
    // Scenario + weighting
    fa
      ? "خروجی باید سناریو-محور باشد و هر سناریو وزن/اثر داشته باشد (P0/P1/P2)."
      : "Must be scenario-driven with weights/impact (P0/P1/P2).",
    // Action oriented
    fa
      ? "اقدام‌محور: برای هر سناریو یک Patch/Next step عملی بده."
      : "Action-oriented: give a concrete patch/next step per scenario.",
    // Risks
    fa
      ? "ریسک و edge-case را واضح و کوتاه بنویس."
      : "State risks and edge-cases clearly and briefly.",
    // Confident claims
    fa
      ? "فقط ادعاهای مطمئن بگو؛ اگر چیزی از کد معلوم نیست، حدس نزن."
      : "Make only confident claims; if not inferable from code, do not guess.",
  ].join("\n");
}

function mergeFormattingRules(lang, fenceLang, formatPreference) {
  const fa = lang !== "en";
  const extra = String(formatPreference || "").toLowerCase() === "pretty";

  const base = [
    fa
      ? "کد Merge باید تمیز، قابل اجرا، خوانا و type-safe باشد."
      : "Merged code must be clean, runnable, readable, and type-safe.",
    fa
      ? "کد را هرگز minify نکن و هرگز یک‌خطی تحویل نده."
      : "Never minify and never output it as a one-liner.",
    fa
      ? "از ساختار استاندارد استفاده کن: imports بالا، توابع جدا، main guard اگر لازم است."
      : "Use standard structure: imports at top, functions separated, main guard if appropriate.",
    fa
      ? "اگر زبان Python است: type hints کامل + PEP8 + خط‌شکنی و indentation درست."
      : "If Python: full type hints + PEP8-ish formatting + proper newlines/indentation.",
    fa
      ? "اگر TypeScript/JS است: readability اولویت دارد؛ type-safety را در TS رعایت کن."
      : "If TS/JS: prioritize readability; enforce type-safety in TS.",
    fa
      ? `در fenced code block از زبان \`${fenceLang}\` استفاده کن.`
      : `Use \`${fenceLang}\` in the fenced code block.`,
  ];

  if (extra) {
    base.push(
      fa
        ? "STRICT: خروجی code block باید چند خط باشد (حداقل 8 خط منطقی) مگر کد واقعاً خیلی کوچک باشد."
        : "STRICT: code block must be multi-line (>= 8 meaningful lines) unless truly tiny."
    );
  }

  return base.join("\n");
}

/**
 * Generator prompt (unchanged style, but stable)
 */
export function buildGeneratorPrompt(ctx = {}) {
  const lang = langOf(ctx);
  const platform = norm(ctx.platform || ctx.os || "linux");
  const cli = norm(ctx.cli || (platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash"));
  const req = s(ctx.user_request || ctx.userRequest || ctx.prompt || ctx.text || ctx.message || "").trim();

  if (lang === "en") {
    return [
      "You are CCG Command Generator.",
      "Return a helpful, correct, structured answer.",
      `Platform: ${platform}`,
      `CLI: ${cli}`,
      "",
      "User request:",
      req || "(empty)",
    ].join("\n");
  }

  return [
    "تو CCG Command Generator هستی.",
    "پاسخ را مفید، درست و ساختاریافته بده.",
    `پلتفرم: ${platform}`,
    `CLI: ${cli}`,
    "",
    "درخواست کاربر:",
    req || "(خالی)",
  ].join("\n");
}

/**
 * Comparator prompt
 * Mode selection:
 * - if compareOutputMode provided => must be "merge" or "advice"
 * - else use sameLang:
 *    sameLang=true => merge
 *    otherwise => advice (safe default)
 */
export function buildComparatorPrompt(ctx = {}) {
  const lang = langOf(ctx);

  const explicitMode = s(ctx.compareOutputMode || "").toLowerCase().trim();
  const compareOutputMode =
    explicitMode === "merge" || explicitMode === "advice"
      ? explicitMode
      : ctx?.sameLang === true
      ? "merge"
      : "advice";

  const codeA = s(ctx.input_a || "");
  const codeB = s(ctx.input_b || "");

  const H = headings(lang, compareOutputMode);
  const outLangRule = lang === "en" ? "Output language: English only." : "Output language: Persian (فارسی) only.";

  // Prefer these in merge code fence
  const fenceLang = norm(ctx?.effectiveLangA || ctx?.detectedLangA || ctx?.codeLangA || "txt").toLowerCase() || "txt";
  const formatPreference = ctx?.formatPreference;

  // Shared content quality rules
  const Q = qualityRules(lang);

  if (compareOutputMode === "advice") {
    return [
      "You are a senior software engineer and code reviewer.",
      "Compare Code A and Code B and produce a compact but high-signal review.",
      "",
      "CRITICAL OUTPUT CONTRACT (MUST FOLLOW EXACTLY):",
      "1) Output MUST be valid Markdown.",
      `2) Output MUST contain EXACTLY three sections in this exact order and with these exact headings:`,
      `   - ${H.diff}`,
      `   - ${H.a}`,
      `   - ${H.b}`,
      `3) You MUST NOT output fenced code blocks anywhere (no triple backticks).`,
      "4) Do NOT write any meta commentary like 'contract', 'system', 'I will...', 'as an AI', etc.",
      `5) ${outLangRule}`,
      "",
      "CONTENT RULES (MUST FOLLOW):",
      Q,
      "",
      "FORMAT INSIDE SECTIONS (NO extra headings):",
      "- Use compact bullets only.",
      "- Differences section: 3-6 bullets total, each bullet must include: Scenario + weight (P0/P1/P2) + impact + evidence + risk/edge-case + next step.",
      "- Suggestions A/B: 3-5 bullets each, each bullet must include: patch/next step + expected benefit + risk/edge-case + how to test.",
      "",
      meta(ctx),
      "",
      "Code A:",
      codeA,
      "",
      "Code B:",
      codeB,
    ].join("\n");
  }

  // merge mode
  return [
    "You are a senior software engineer and code reviewer.",
    "Your job: produce a compact, high-signal comparison and a best merged implementation.",
    "",
    "CRITICAL OUTPUT CONTRACT (MUST FOLLOW EXACTLY):",
    "1) Output MUST be valid Markdown.",
    `2) Output MUST contain EXACTLY two sections in this exact order and with these exact headings:`,
    `   - ${H.diff}`,
    `   - ${H.merge}`,
    `3) In ${H.diff}:`,
    "   - DO NOT use fenced code blocks (no ```).",
    "   - DO NOT use indented code blocks (no leading 4 spaces / tabs).",
    "   - Use inline backticks only for identifiers.",
    `4) In ${H.merge}:`,
    "   - Provide EXACTLY ONE fenced code block.",
    "   - Inside that fenced block: ONLY the final merged code (no explanations inside).",
    "5) Do NOT add any other headings/sections.",
    "6) Do NOT write any meta commentary like 'contract', 'system', 'I will...', 'as an AI', etc.",
    `7) ${outLangRule}`,
    "",
    "CONTENT RULES (MUST FOLLOW):",
    Q,
    "",
    "FORMAT INSIDE DIFFERENCES SECTION (NO extra headings):",
    "- Use 4-7 compact bullets total.",
    "- Each bullet must include: Scenario + weight (P0/P1/P2) + impact + evidence + risk/edge-case + patch/next step.",
    "- Keep claims strictly grounded in code; do not speculate.",
    "",
    "MERGE CODE QUALITY RULES (MUST FOLLOW):",
    mergeFormattingRules(lang, fenceLang, formatPreference),
    "",
    meta(ctx),
    "",
    "Code A:",
    codeA,
    "",
    "Code B:",
    codeB,
  ].join("\n");
}

/**
 * Strict retry prompt (even harder)
 */
export function buildComparatorPromptStrict(ctx = {}) {
  const lang = langOf(ctx);

  const explicitMode = s(ctx.compareOutputMode || "").toLowerCase().trim();
  const compareOutputMode =
    explicitMode === "merge" || explicitMode === "advice"
      ? explicitMode
      : ctx?.sameLang === true
      ? "merge"
      : "advice";

  const H = headings(lang, compareOutputMode);
  const base = buildComparatorPrompt({ ...ctx, compareOutputMode });

  if (compareOutputMode === "advice") {
    return [
      base,
      "",
      "STRICT ENFORCEMENT:",
      "- Start directly with the first heading.",
      "- Absolutely no fenced code blocks or indented code blocks.",
      `- Headings must be EXACT: ${H.diff} then ${H.a} then ${H.b}.`,
      "- Keep it compact but high-signal: bullets only, no filler, no speculation.",
    ].join("\n");
  }

  return [
    base,
    "",
    "STRICT ENFORCEMENT:",
    "- Start directly with the first heading.",
    `- Headings must be EXACT: ${H.diff} then ${H.merge}.`,
    "- Differences: bullets only, compact, scenario+weight+evidence+risk+patch each.",
    "- Merge section: EXACTLY ONE fenced code block containing ONLY multi-line formatted code. Never minify.",
  ].join("\n");
}

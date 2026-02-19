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
  const mode = norm(ctx?.compareOutputMode || ctx?.modeStyle || ctx?.mode || "");
  return `meta: compareOutputMode=${mode}, codeLangA=${a}, codeLangB=${b}, relation=${same}`;
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

/**
 * Generator prompt (unchanged style, but stable)
 */
export function buildGeneratorPrompt(ctx = {}) {
  const lang = langOf(ctx);
  const platform = norm(ctx.platform || ctx.os || "linux");
  const cli = norm(ctx.cli || (platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash"));
  const req = s(ctx.user_request || ctx.userRequest || ctx.prompt || ctx.text || ctx.message || "").trim();

  // Keep generator prompt simple and consistent.
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
 * - If same language => compareOutputMode="merge"
 *   Output MUST be ONLY:
 *     ## Technical Differences / ## تفاوت‌های فنی
 *     (detailed bullets/paragraphs, NO code fences)
 *     ## Final Merged Code / ## کد Merge نهایی
 *     ```<lang>
 *     <merged code only>
 *     ```
 *
 * - If different languages => compareOutputMode="advice"
 *   Output MUST be ONLY:
 *     ## Technical Differences / ## تفاوت‌های فنی (NO code fences)
 *     ## Improvement Suggestions for Code A / پیشنهادهای بهبود برای کد A (NO code fences)
 *     ## Improvement Suggestions for Code B / پیشنهادهای بهبود برای کد B (NO code fences)
 */
export function buildComparatorPrompt(ctx = {}) {
  const lang = langOf(ctx);
  const compareOutputMode = s(ctx.compareOutputMode || ctx.modeStyle || "merge").toLowerCase();
  const codeA = s(ctx.input_a || "");
  const codeB = s(ctx.input_b || "");

  const H = headings(lang, compareOutputMode);

  // We keep the instructions in ENGLISH (stronger), but force output language by contract.
  const outLangRule = lang === "en" ? "Output language: English only." : "Output language: Persian (فارسی) only.";

  if (compareOutputMode === "advice") {
    return [
      "You are a senior software engineer and code reviewer.",
      "Compare Code A and Code B and provide high-quality, practical review.",
      "",
      "CRITICAL OUTPUT CONTRACT (MUST FOLLOW EXACTLY):",
      "1) Output MUST be valid Markdown.",
      `2) Output MUST contain EXACTLY three sections in this exact order and with these exact headings:`,
      `   - ${H.diff}`,
      `   - ${H.a}`,
      `   - ${H.b}`,
      `3) You MUST NOT output fenced code blocks anywhere (no triple backticks).`,
      "4) Do NOT write any meta commentary like 'contract', 'قرارکرد', 'I will...', 'as an AI', etc.",
      "5) Be specific and actionable (at least 6-10 bullets overall). Mention correctness, performance, IO, memory, errors, edge cases, readability, and testing.",
      `6) ${outLangRule}`,
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

  // merge mode (same language)
  return [
    "You are a senior software engineer and code reviewer.",
    "Your job: produce a deep, practical comparison and a best merged implementation.",
    "",
    "CRITICAL OUTPUT CONTRACT (MUST FOLLOW EXACTLY):",
    "1) Output MUST be valid Markdown.",
    `2) Output MUST contain EXACTLY two sections in this exact order and with these exact headings:`,
    `   - ${H.diff}`,
    `   - ${H.merge}`,
    `3) In ${H.diff}:`,
    "   - DO NOT use fenced code blocks (no ```).",
    "   - DO NOT use indented code blocks (no leading 4 spaces / tabs).",
    "   - Use inline backticks only for identifiers, function names, exceptions, modules.",
    "   - Provide detailed analysis: correctness, edge-cases, performance, memory, IO strategy, error handling, readability, maintainability, testing.",
    "   - Minimum depth: at least 8 bullets + 2 short paragraphs (unless the code is trivial).",
    `4) In ${H.merge}:`,
    "   - Provide EXACTLY ONE fenced code block.",
    "   - Inside that fenced block: ONLY the final merged code (no explanations inside).",
    "5) Do NOT add any other headings/sections.",
    "6) Do NOT write any meta commentary like 'contract', 'قرارکرد', 'I will...', 'as an AI', etc.",
    `7) ${outLangRule}`,
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
  const compareOutputMode = s(ctx.compareOutputMode || ctx.modeStyle || "merge").toLowerCase();
  const H = headings(lang, compareOutputMode);
  const base = buildComparatorPrompt(ctx);

  if (compareOutputMode === "advice") {
    return [
      base,
      "",
      "STRICT ENFORCEMENT:",
      "- Absolutely no code fences, no backticks blocks, no indented code.",
      "- Remove any meta lines or role text. Start directly with the first heading.",
      `- The headings must be EXACT: ${H.diff} then ${H.a} then ${H.b}.`,
      "- Provide concrete, actionable bullets (no placeholders like '(پیشنهادی ارائه نشد)').",
    ].join("\n");
  }

  return [
    base,
    "",
    "STRICT ENFORCEMENT:",
    "- Remove any meta lines or role text. Start directly with the first heading.",
    `- The headings must be EXACT: ${H.diff} then ${H.merge}.`,
    "- In differences: no code fences and no indented code. Convert code snippets to inline backticks.",
    "- In final section: EXACTLY ONE fenced code block and nothing else inside it except code.",
    "- Ensure differences are detailed and non-generic (mention specific functions/approaches from the code).",
  ].join("\n");
}

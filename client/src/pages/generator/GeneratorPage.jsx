import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState, usePersistComplexState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import AdvancedSettings from "../../components/generator/AdvancedSettings";
import FeedbackButton from "../../components/ui/FeedbackButton";
import ToolResult from "../../components/ui/ToolResult";

/* ==============================
   CONSTANTS
============================== */

const PLATFORMS = [
  { value: "linux", label: "Linux", icon: "🐧" },
  { value: "windows", label: "Windows", icon: "🪟" },
  { value: "mac", label: "macOS", icon: "🍎" },
  { value: "network", label: "Network", icon: "🌐" },
  { value: "other", label: "Other OS", icon: "🔧" },
];

function defaultCliForPlatform(platform) {
  if (platform === "windows") return "powershell";
  if (platform === "mac") return "zsh";
  if (platform === "network") return "network";
  return "bash";
}

function cliOptionsForPlatform(platform) {
  if (platform === "windows") return ["powershell", "pwsh", "cmd"];
  if (platform === "mac") return ["zsh", "bash"];
  if (platform === "network") return ["network"];
  return ["bash", "zsh", "sh", "fish"];
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

<<<<<<< codex/-ccg-ie94ef
function toBullets(text) {
  const t = String(text || "").trim();
  if (!t) return [];

  return t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^[-*]\s+/, "").trim())
    .map((x) => x.replace(/^>\s?/, "").trim())
    .filter(Boolean)
    .filter((x) => !/^#{1,6}\s+/i.test(x));
}

function looksLikeChitChatLine(line) {
  const s = String(line || "").trim();
  if (!s) return false;

  // فارسی
  if (/اگر\s+سوال|اگر\s+درخواست|در\s+خدمت(م|یم)/i.test(s)) return true;
  if (/موفق\s+باش(ی|ید)/i.test(s)) return true;

  // انگلیسی
  if (/if you have (any )?(questions|more questions)/i.test(s)) return true;
  if (/feel free to ask/i.test(s)) return true;
  if (/happy to help/i.test(s)) return true;

  return false;
}

function filterChitChat(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return a
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .filter((x) => !looksLikeChitChatLine(x));
}

function firstFencedCodeBlock(md) {
  const text = String(md || "");
  const m = text.match(/```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```/);
  if (!m) return { lang: "", code: "" };
  return { lang: String(m[1] || "").trim(), code: String(m[2] || "").trim() };
}

function allFencedCodeBlocks(md) {
  const text = String(md || "");
  const out = [];
  const re = /```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(text))) {
    const code = String(m[2] || "").trim();
    if (!code) continue;
    out.push({ lang: String(m[1] || "").trim(), code });
  }
  return out;
}

function extractLabelLines(md, labels = []) {
  const set = new Set((labels || []).map((x) => String(x || "").toLowerCase().trim()).filter(Boolean));
  if (!set.size) return [];

  return String(md || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((line) => {
      const norm = line
        .toLowerCase()
        .replace(/^[-*]\s+/, "")
        .replace(/^>\s*/, "")
        .replace(/[⚠️📌✅🔁]/g, "")
        .trim();
      return [...set].some((k) => norm.startsWith(`${k}:`) || norm.startsWith(`${k} :`) || norm === k);
    })
    .map((line) =>
      line
        .replace(/^[-*]\s+/, "")
        .replace(/^>\s*/, "")
        .replace(/[⚠️📌✅🔁]/g, "")
        .replace(/^\s*[^:]+:\s*/, "")
        .trim()
    )
    .filter(Boolean);
}

function extractWarningLikeLines(md) {
  const lines = String(md || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    const t = line.toLowerCase();
    if (
      /⚠|warning|warnings|هشدار|هشدارها|احتیاط|خطر/.test(t) ||
      /before (run|running|execute|execution)/.test(t) ||
      /قبل\s+از\s+(اجرا|استفاده|ریستارت|خاموش)/.test(t)
    ) {
      const cleaned = line
        .replace(/^[-*]\s+/, "")
        .replace(/^>\s*/, "")
        .replace(/[⚠️]/g, "")
        .replace(/^\s*[^:]+:\s*/, "")
        .trim();
      if (cleaned) out.push(cleaned);
    }
  }
  return [...new Set(out)];
}

function isWarningTextLine(line) {
  const t = String(line || "").toLowerCase().trim();
  if (!t) return false;
  return (
    /⚠|warning|warnings|هشدار|هشدارها|احتیاط|خطر/.test(t) ||
    /before (run|running|execute|execution)/.test(t) ||
    /قبل\s+از\s+(اجرا|استفاده|ریستارت|خاموش)/.test(t)
  );
}

function coerceCommandItem(x) {
  if (typeof x === "string") return x.trim();
  if (x && typeof x === "object") {
    // رایج‌ترین حالت‌ها + robust keys
    const v =
      x.command ||
      x.cmd ||
      x.value ||
      x.text ||
      x.code ||
      x.script ||
      x?.primary?.command ||
      x?.primary_command;

    if (typeof v === "string") return v.trim();
    const ks = Object.keys(x);
    if (ks.length === 1 && typeof x[ks[0]] === "string") return String(x[ks[0]]).trim();
  }
  return "";
}

function asTextValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean).join("\n");
  try {
    return String(v);
  } catch {
    return "";
  }
}

function extractPythonCommentLines(code) {
  return String(code || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#(?!\!)/.test(line))
    .map((line) => line.replace(/^#\s*/, "").trim())
    .filter(Boolean);
}

function buildToolFromResponse(res, lang, cliGuess, outputMode, prevTool = null, refineTarget = "") {
  const md = String(res?.markdown || res?.output || res?.result || "").trim();

  const pyRaw =
    (typeof res?.pythonScript === "string" && res.pythonScript.trim()) ||
    (typeof res?.python_script === "string" && res.python_script.trim()) ||
    "";

  const isPython = Boolean(pyRaw) || outputMode === "python";
  const isScriptMode = outputMode === "script";

  // ---------- Python mode ----------
  if (isPython) {
    const pythonBody =
      pyRaw || firstFencedCodeBlock(md).code || (Array.isArray(res?.commands) ? coerceCommandItem(res.commands[0]) : "");

    const expRaw =
      extractSection(md, ["Explanation", "توضیح", "توضیحات", "شرح"]) ||
      asTextValue(res?.explanation || res?.explanations || res?.description);

    const warnRaw =
      extractSection(md, ["Warning", "Warnings", "هشدار", "هشدارها"]) ||
      asTextValue(res?.warnings || res?.warning || res?.alert || res?.alerts);

    const notesRaw =
      extractSection(md, ["More Details", "توضیحات بیشتر", "📌 More Details", "📌 توضیحات بیشتر", "Details", "جزئیات بیشتر"]) ||
      extractSection(md, ["Notes", "توضیحات", "نکات"]) ||
      asTextValue(res?.notes || res?.note || res?.details || res?.moreDetails) ||
      stripCodeBlocks(md);

    let explanation = filterChitChat(toBullets(expRaw));
    let warnings = filterChitChat(toBullets(warnRaw));
    let notes = filterChitChat(toBullets(notesRaw));

    const commentLines = extractPythonCommentLines(pythonBody);
    if (!explanation.length && commentLines.length) {
      explanation = commentLines.filter((x) => !isWarningTextLine(x));
    }
    if (!warnings.length && commentLines.length) {
      warnings = commentLines.filter((x) => isWarningTextLine(x));
    }

    if (!warnings.length) warnings = filterChitChat(extractLabelLines(md, ["warning", "warnings", "هشدار", "هشدارها"]));
    if (!warnings.length) warnings = filterChitChat(extractWarningLikeLines(md));

    if (!explanation.length) explanation = filterChitChat(extractLabelLines(md, ["explanation", "details", "توضیح", "توضیحات", "شرح"]));

    if (explanation.length) {
      const movedToWarnings = explanation.filter((x) => isWarningTextLine(x));
      const keptExplanation = explanation.filter((x) => !isWarningTextLine(x));
      if (movedToWarnings.length) {
        warnings = [...warnings, ...movedToWarnings];
        explanation = keptExplanation;
      }
    }

    if (!notes.length) {
      notes = filterChitChat(
        extractLabelLines(md, ["note", "notes", "more details", "detail", "نکته", "نکات", "توضیحات بیشتر"])
      );
    }

    // fallback: اگر متن هست ولی bullets خالی شد، همون متن رو نگه دار
    if (!explanation.length && String(expRaw || "").trim()) explanation.push(String(expRaw).trim());
    if (!warnings.length && String(warnRaw || "").trim()) warnings.push(String(warnRaw).trim());
    if (!notes.length && String(notesRaw || "").trim()) notes.push(String(notesRaw).trim());

    warnings = [...new Set(warnings.map((x) => String(x || "").trim()).filter(Boolean))];
    explanation = [...new Set(explanation.map((x) => String(x || "").trim()).filter(Boolean))];
    notes = [...new Set(notes.map((x) => String(x || "").trim()).filter(Boolean))];

    return {
      title: lang === "fa" ? "نتیجه" : "Result",
      cli: "python",
      lang: "python",
      pythonScript: true,
      python_script: pythonBody,
      notes,
      warnings,
      explanation,
      alternatives: [],
      primary_command: "",
    };
  }

  // ---------- Command / Script ----------
  const commandsArr = Array.isArray(res?.commands) ? res.commands : [];
  const moreArr = Array.isArray(res?.moreCommands)
    ? res.moreCommands
    : Array.isArray(res?.alternatives)
      ? res.alternatives
      : [];

  let primary = commandsArr.length ? coerceCommandItem(commandsArr[0]) : "";
  let alts = moreArr.map(coerceCommandItem).filter(Boolean);
  const mdBlocks = allFencedCodeBlocks(md);

  if (!primary) {
    const block = mdBlocks[0] || firstFencedCodeBlock(md);
    if (block.code) primary = block.code;
  }

  if (!isScriptMode && !alts.length) {
    const fromBlocks = mdBlocks
      .map((b) => b.code)
      .filter(Boolean)
      .filter((c) => c.trim() !== String(primary || "").trim());
    if (fromBlocks.length) alts = fromBlocks;
  }

  if (!isScriptMode && !alts.length) {
    const altRaw = extractSection(md, [
      "Alternative Commands",
      "Alternatives",
      "دستورات جایگزین",
      "جایگزین‌ها",
      "جایگزین ها",
      "فرمان‌های جایگزین",
      "فرمان های جایگزین",
    ]);
    const altBullets = toBullets(altRaw).filter((x) => x && x !== primary);
    if (altBullets.length) alts = altBullets;
  }

  const expRaw =
    extractSection(md, ["Explanation", "توضیح", "توضیحات", "شرح"]) ||
    asTextValue(res?.explanation || res?.explanations || res?.description);

  const warnRaw =
    extractSection(md, ["Warning", "Warnings", "هشدار", "هشدارها"]) ||
    asTextValue(res?.warnings || res?.warning || res?.alert || res?.alerts);

  const notesRaw =
    extractSection(md, ["More Details", "توضیحات بیشتر", "📌 More Details", "📌 توضیحات بیشتر", "Details", "جزئیات بیشتر"]) ||
    extractSection(md, ["Notes", "توضیحات", "نکات"]) ||
    asTextValue(res?.notes || res?.note || res?.details || res?.moreDetails) ||
    "";

  let explanation = filterChitChat(toBullets(expRaw));
  let warnings = filterChitChat(toBullets(warnRaw));
  let notes = filterChitChat(toBullets(notesRaw));

  if (!warnings.length) warnings = filterChitChat(extractLabelLines(md, ["warning", "warnings", "هشدار", "هشدارها"]));
  if (!warnings.length) warnings = filterChitChat(extractWarningLikeLines(md));

  if (!notes.length) {
    notes = filterChitChat(
      extractLabelLines(md, ["note", "notes", "more details", "detail", "نکته", "نکات", "توضیحات بیشتر"])
    );
  }

  if (!explanation.length) {
    explanation = filterChitChat(extractLabelLines(md, ["explanation", "details", "توضیح", "توضیحات", "شرح"]));
  }

  // اگر مدل هشدار را داخل توضیحات ریخته بود، جدا کن تا کارت هشدار حتماً نمایش داده شود
  if (explanation.length) {
    const movedToWarnings = explanation.filter((x) => isWarningTextLine(x));
    const keptExplanation = explanation.filter((x) => !isWarningTextLine(x));
    if (movedToWarnings.length) {
      warnings = [...warnings, ...movedToWarnings];
      explanation = keptExplanation;
    }
  }

  // fallback متن خام
  if (!explanation.length && String(expRaw || "").trim()) explanation.push(String(expRaw).trim());
  if (!warnings.length && String(warnRaw || "").trim()) warnings.push(String(warnRaw).trim());
  if (!notes.length && String(notesRaw || "").trim()) notes.push(String(notesRaw).trim());

  alts = [...new Set(alts.map((x) => String(x || "").trim()).filter(Boolean))].filter((x) => x !== primary);
  warnings = [...new Set(warnings.map((x) => String(x || "").trim()).filter(Boolean))];
  explanation = [...new Set(explanation.map((x) => String(x || "").trim()).filter(Boolean))];
  notes = [...new Set(notes.map((x) => String(x || "").trim()).filter(Boolean))];

  if (prevTool && refineTarget === "details") {
    primary = prevTool.primary_command || primary;
    alts = Array.isArray(prevTool.alternatives) ? prevTool.alternatives : alts;
  }

  if (prevTool && refineTarget === "commands") {
    primary = prevTool.primary_command || primary;
    explanation = Array.isArray(prevTool.explanation) ? prevTool.explanation : explanation;
    warnings = Array.isArray(prevTool.warnings) ? prevTool.warnings : warnings;
    notes = Array.isArray(prevTool.notes) ? prevTool.notes : notes;
  }

  return {
    title: lang === "fa" ? "نتیجه" : "Result",
    cli: String(cliGuess || "bash").toLowerCase(),
    pythonScript: false,
    primary_command: primary,
    alternatives: isScriptMode ? [] : alts,
    explanation,
    warnings,
    notes,
  };
}

/** ------------- Split Pane helpers ------------- */
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** --------- Client-side Precheck --------- */
const PRECHECK = { minChars: 8, minWords: 2 };

function countWords(s) {
  const t = normalizeSpaces(s);
  if (!t) return 0;
  return t.split(" ").filter(Boolean).length;
}

function isMostlyPunctOrEmoji(s) {
  const t = String(s || "").trim();
  if (!t) return true;
  const keep = t.replace(/[^\p{L}\p{N}]+/gu, "");
  return keep.length === 0;
}

function isRepeatedCharGibberish(s) {
  const t = normalizeSpaces(s);
  if (!t) return true;
  const compact = t.replace(/\s+/g, "");
  if (compact.length < 8) return false;
  return /(.)\1{5,}/u.test(compact);
}

function buildClientInputError({ lang, code, message, hint, fields }) {
  return { code, message, hint, fields: fields || null, source: "client", lang };
}

function precheckUserRequest(raw, lang) {
  const text = normalizeSpaces(raw);

  if (!text) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_EMPTY",
      message: lang === "fa" ? "⚠️ لطفا درخواست خود را وارد کنید" : "⚠️ Please enter your request",
      hint:
        lang === "fa"
          ? "مثال: «سیستم را ۱ ساعت دیگر ریستارت کن» یا «روی لینوکس سرویس nginx را ریستارت کن»"
          : "Example: “Restart the system in 1 hour” or “Restart nginx on Linux”",
    });
  }

  if (text.length < PRECHECK.minChars) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_TOO_SHORT",
      message: lang === "fa" ? "⚠️ درخواست خیلی کوتاه است" : "⚠️ Your request is too short",
      hint:
        lang === "fa"
          ? `حداقل ${PRECHECK.minWords} کلمه بنویس و هدف را مشخص کن. مثال: «سیستم را ۱ ساعت دیگر ریستارت کن».`
          : `Write at least ${PRECHECK.minWords} words and add context. Example: “Restart the system in 1 hour”.`,
      fields: { ...PRECHECK },
    });
  }

  const words = countWords(text);
  if (words < PRECHECK.minWords) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_MISSING_CONTEXT",
      message: lang === "fa" ? "⚠️ درخواست ناقص است" : "⚠️ Request needs more context",
      hint:
        lang === "fa"
          ? "فقط یک کلمه کافی نیست. بگو روی چه سیستمی، چه کاری و با چه شرطی. مثال: «روی ویندوز سیستم را همین الان ریستارت کن»."
          : "One word isn’t enough. Specify platform, action, and condition. Example: “Restart Windows now.”",
      fields: { ...PRECHECK },
    });
  }

  if (isMostlyPunctOrEmoji(text)) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_GIBBERISH",
      message: lang === "fa" ? "⚠️ متن نامفهوم است" : "⚠️ The text looks unclear",
      hint:
        lang === "fa"
          ? "لطفاً با کلمات واضح بنویس: چه کاری انجام شود؟ روی کدام سیستم؟"
          : "Please write a clear request: what action, on which system?",
    });
  }

  if (isRepeatedCharGibberish(text)) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_GIBBERISH",
      message: lang === "fa" ? "⚠️ متن شبیه ورودی نامعتبر است" : "⚠️ Input seems invalid",
      hint:
        lang === "fa"
          ? "به‌نظر می‌رسد متن شامل تکرار زیاد کاراکترهاست. لطفاً درخواست را واضح‌تر بنویس."
          : "It looks like repeated characters. Please write a clearer request.",
    });
  }

  return null;
}

function formatApiErrorForUI(err, lang) {
  const isAbort = err?.name === "AbortError" || /aborted|abort/i.test(String(err?.message || ""));
  if (isAbort) {
    return {
      code: "REQUEST_ABORTED",
      message: lang === "fa" ? "⛔ تولید لغو شد" : "⛔ Generation cancelled",
      hint: lang === "fa" ? "اگر لازم بود، دوباره تلاش کن." : "You can try again anytime.",
      source: "client",
      status: 0,
    };
  }

  const status = Number(err?.status || err?.response?.status || 0) || 0;
  const data = err?.data;

  const apiErr = data && typeof data === "object" ? data.error || data.err || null : null;
  if (apiErr && typeof apiErr === "object") {
    return {
      code: String(apiErr.code || "API_ERROR"),
      message: String(apiErr.userMessage || apiErr.message || err?.message || "Error"),
      hint: String(apiErr.hint || ""),
      fields: apiErr.fields || null,
      source: "api",
      status,
    };
  }

  if (status === 400) {
    return {
      code: "BAD_REQUEST",
      message: lang === "fa" ? "⚠️ درخواست نامعتبر است" : "⚠️ Invalid request",
      hint: lang === "fa" ? "لطفاً درخواست را واضح‌تر بنویس و جزئیات لازم را اضافه کن." : "Please rewrite with clearer details.",
      source: "api",
      status,
    };
  }

  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: lang === "fa" ? "⏳ تعداد درخواست‌ها زیاد است" : "⏳ Too many requests",
      hint: lang === "fa" ? "کمی صبر کن و دوباره تلاش کن." : "Please wait and try again.",
      source: "api",
      status,
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "FORBIDDEN",
      message: lang === "fa" ? "🚫 دسترسی غیرمجاز" : "🚫 Access denied",
      hint: lang === "fa" ? "اگر وارد حساب هستی، دوباره تلاش کن." : "If you’re signed in, try again.",
      source: "api",
      status,
    };
  }

  return {
    code: "SERVER_ERROR",
    message: err?.message || (lang === "fa" ? "❌ خطا در ارتباط با سرور" : "❌ Server connection error"),
    hint:
      lang === "fa"
        ? "اگر مشکل ادامه داشت، صفحه را رفرش کن یا چند دقیقه بعد دوباره تلاش کن."
        : "If it persists, refresh the page and try again in a minute.",
    source: "api",
    status,
  };
}
=======
/* ==============================
   COMPONENT
============================== */
>>>>>>> main

export default function GeneratorPage() {
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [platform, setPlatform] = usePersistState("platform", "linux");
  const [cli, setCli] = usePersistState("generator_cli", defaultCliForPlatform(platform));
  const [outputMode, setOutputMode] = usePersistState("generator_output_mode", "command");
  const [moreDetails, setMoreDetails] = usePersistState("generator_more_details", false);
  const [moreCommands, setMoreCommands] = usePersistState("generator_more_commands", false);

  const [input, setInput] = usePersistState("input", "");
  const [output, setOutput] = useState("");
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [advancedEnabled, setAdvancedEnabled] = usePersistState("advanced_enabled", false);
  const [advancedSettings, setAdvancedSettings] = usePersistComplexState("advanced_settings", {});

  const abortRef = useRef(null);
  const lastRequestRef = useRef(null);

  useEffect(() => {
    const allowed = new Set(cliOptionsForPlatform(platform));
    if (!allowed.has(cli)) {
      setCli(defaultCliForPlatform(platform));
    }
  }, [platform]);

  function computeCli() {
    if (outputMode === "python") return "python";
    return cli || "bash";
  }

  function mapOutputType(mode) {
    if (mode === "python") return "python";
    if (mode === "command") return "command";
    return "tool";
  }

  async function generate() {
    if (!normalizeSpaces(input)) {
      setError(lang === "fa" ? "درخواست را وارد کن" : "Please enter a request");
      return;
    }

    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const normalizedInput = normalizeSpaces(input);

    const requestKey = JSON.stringify({
      normalizedInput,
      outputMode,
      platform,
      cli: computeCli(),
      advancedEnabled,
      advanced: advancedEnabled ? advancedSettings : {},
    });

    const sameBase = lastRequestRef.current?.requestKey === requestKey;

    const payload = {
      mode: "generate",
      modeStyle: "generator",
      lang,
      platform,
      cli: computeCli(),
      outputType: mapOutputType(outputMode),
      moreDetails: Boolean(moreDetails),
      moreCommands: Boolean(moreCommands),
      pythonScript: outputMode === "python",
      advancedEnabled,
      advanced: advancedEnabled ? advancedSettings : undefined,
      user_request: normalizedInput,
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await callCCG(payload, { signal: controller.signal });

      const markdown = String(result?.markdown || "").trim();
      setOutput(markdown);
      setTool(result?.tool || null);

      lastRequestRef.current = { requestKey };
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Server Error");
      setOutput("");
      setTool(null);
      lastRequestRef.current = null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  function cancelGenerate() {
    if (!abortRef.current) return;
    try { abortRef.current.abort(); } catch {}
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl text-right" : "ltr text-left"}`}>
      <FeedbackButton />

      <div className="ccg-card p-4 rounded-2xl space-y-4">

        {/* PLATFORM */}
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPlatform(p.value)}
              className={`px-3 py-2 rounded-xl text-sm ${
                platform === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* INPUT */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-40 p-3 rounded-xl border"
          placeholder={
            lang === "fa"
              ? "مثال: سیستم را ۱ ساعت دیگر خاموش کن"
              : "Example: Shutdown system in 1 hour"
          }
        />

        {/* BUTTON */}
        <button
          onClick={loading ? cancelGenerate : generate}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white"
        >
          {loading ? (lang === "fa" ? "لغو" : "Cancel") : (lang === "fa" ? "تولید" : "Generate")}
        </button>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {/* OUTPUT */}
        {tool ? (
          <ToolResult tool={tool} uiLang={lang} />
        ) : output ? (
          <CodeBlock code={output} language="markdown" />
        ) : null}

      </div>
    </div>
  );
}

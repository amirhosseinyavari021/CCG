// /home/cando/CCG/server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatOutput } from "../utils/outputFormatter.js";
import { toPromptVariables, buildFallbackPrompt } from "../utils/promptTransformer.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "ccg", ts: Date.now() });
});

function pickUserRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const ur =
    b.userRequest ??
    b.user_request ??
    b.userrequest ??
    b.prompt ??
    b.request ??
    b.text ??
    b.message ??
    b.input ??
    b.query ??
    b.q ??
    (b.data && (b.data.userRequest ?? b.data.user_request ?? b.data.prompt ?? b.data.text)) ??
    "";
  return String(ur || "").trim();
}

function safeObj(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : {};
}

function compactAdvanced(adv) {
  const a = safeObj(adv);
  const out = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** ---------------- Input Validation (Fail Fast / No token waste) ---------------- */
const INPUT_RULES = {
  minChars: 8,
  minWords: 2,
  maxChars: 4000, // safety guard; can tune later
};

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function countWords(s) {
  const t = normalizeSpaces(s);
  if (!t) return 0;
  return t.split(" ").filter(Boolean).length;
}

function isMostlyPunctOrEmoji(s) {
  const t = String(s || "").trim();
  if (!t) return true;
  // keep letters/digits from many languages
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

function apiError(code, userMessage, hint, fields) {
  return {
    error: {
      code,
      userMessage,
      hint: hint || "",
      fields: fields || undefined,
    },
  };
}

function validateUserRequest(userRequest, lang) {
  const text = normalizeSpaces(userRequest);

  if (!text) {
    return apiError(
      "INVALID_INPUT_EMPTY",
      lang === "fa" ? "درخواست لازم است." : "Request is required.",
      lang === "fa"
        ? "مثال: «روی لینوکس سرویس nginx را ریستارت کن»"
        : "Example: “Restart nginx on Linux”.",
      { ...INPUT_RULES }
    );
  }

  if (text.length > INPUT_RULES.maxChars) {
    return apiError(
      "INVALID_INPUT_TOO_LONG",
      lang === "fa" ? "درخواست خیلی طولانی است." : "Request is too long.",
      lang === "fa"
        ? "درخواست را کوتاه‌تر کن یا به چند مرحله تقسیم کن."
        : "Please shorten your request or split it into steps.",
      { ...INPUT_RULES }
    );
  }

  if (text.length < INPUT_RULES.minChars) {
    return apiError(
      "INVALID_INPUT_TOO_SHORT",
      lang === "fa" ? "درخواست خیلی کوتاه است." : "Request is too short.",
      lang === "fa"
        ? `حداقل ${INPUT_RULES.minWords} کلمه بنویس و هدف را مشخص کن. مثال: «سیستم را ۱ ساعت دیگر ریستارت کن».`
        : `Write at least ${INPUT_RULES.minWords} words and add context. Example: “Restart the system in 1 hour”.`,
      { ...INPUT_RULES }
    );
  }

  const words = countWords(text);
  if (words < INPUT_RULES.minWords) {
    return apiError(
      "INVALID_INPUT_MISSING_CONTEXT",
      lang === "fa" ? "درخواست ناقص است." : "Request needs more context.",
      lang === "fa"
        ? "فقط یک کلمه کافی نیست. بگو روی چه سیستمی، چه کاری و با چه شرطی."
        : "One word isn’t enough. Specify platform, action, and conditions.",
      { ...INPUT_RULES }
    );
  }

  if (isMostlyPunctOrEmoji(text) || isRepeatedCharGibberish(text)) {
    return apiError(
      "INVALID_INPUT_GIBBERISH",
      lang === "fa" ? "متن نامفهوم است." : "The text looks unclear.",
      lang === "fa"
        ? "لطفاً با کلمات واضح بنویس: چه کاری انجام شود؟ روی کدام سیستم؟"
        : "Please write a clear request: what action, on which system?",
      { ...INPUT_RULES }
    );
  }

  return null;
}
/** ------------------------------------------------------------------------------ */

router.post("/", async (req, res) => {
  const t0 = Date.now();
  const rid = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Request-Id", rid);

    const body = safeObj(req.body);

    const lang = String(body.lang || "fa").toLowerCase() === "en" ? "en" : "fa";

    const userRequestRaw = pickUserRequest(body);
    const userRequest = normalizeSpaces(userRequestRaw);

    // ✅ fail-fast validation BEFORE calling AI
    const invalid = validateUserRequest(userRequest, lang);
    if (invalid) {
      return res.status(400).json({
        ok: false,
        ...invalid,
        requestId: rid,
        ms: Date.now() - t0,
      });
    }

    const platform = String(body.platform || body.os || "linux").toLowerCase();
    const cli = String(body.cli || body.shell || "bash").toLowerCase();

    const moreDetails = Boolean(body.moreDetails);
    const moreCommands = Boolean(body.moreCommands);
    const pythonScript = Boolean(body.pythonScript);

    const advancedEnabled = Boolean(body.advancedEnabled);
    const advanced = advancedEnabled ? compactAdvanced(body.advanced) : null;

    const variables = toPromptVariables({
      mode: "generate",
      modeStyle: "generator",
      lang,
      platform,
      os: platform,
      cli: pythonScript ? "python" : cli,
      user_request: userRequest,

      outputType: pythonScript ? "python" : "tool",
      knowledgeLevel: "intermediate",

      moreDetails,
      moreCommands,

      advanced: advanced || undefined,
      pythonScript,
    });

    const fallbackPrompt = buildFallbackPrompt(variables);

    const ai = await runAI({
      variables,
      fallbackPrompt,
      temperature: 0.25,
    });

    if (ai?.error) {
      // ✅ if AI layer returns error, this is a server-side failure
      return res.status(502).json({
        ok: false,
        error: {
          code: "AI_PROVIDER_ERROR",
          userMessage: lang === "fa" ? "خطا در سرویس هوش مصنوعی." : "AI provider error.",
          hint: lang === "fa" ? "چند لحظه بعد دوباره تلاش کن." : "Please try again in a moment.",
        },
        details: String(ai.error || ""),
        output: "",
        markdown: "",
        tool: null,
        commands: [],
        moreCommands: [],
        pythonScript: "",
        requestId: rid,
        ms: Date.now() - t0,
        lang,
        flags: { moreDetails, moreCommands, pythonScript },
      });
    }

    const raw = String(ai?.output || "").trim();

    // ✅ خروجی استاندارد برای UI
    const formatted = formatOutput(raw, {
      cli,
      lang,
      wantMoreCommands: moreCommands ? 5 : 2,
    });

    return res.status(200).json({
      ok: true,
      output: formatted.markdown || "",
      markdown: formatted.markdown || "",
      tool: null,

      commands: formatted.commands || [],
      moreCommands: formatted.moreCommands || [],
      pythonScript: formatted.pythonScript || "",

      requestId: rid,
      ms: Date.now() - t0,
      lang,
      flags: { moreDetails, moreCommands, pythonScript },
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    return res.status(500).json({
      ok: false,
      error: {
        code: "SERVER_ERROR",
        userMessage: "خطای داخلی سرور",
        hint: "اگر مشکل ادامه داشت، چند دقیقه بعد دوباره تلاش کن.",
      },
      details: msg,
      output: "",
      markdown: "",
      tool: null,
      commands: [],
      moreCommands: [],
      pythonScript: "",
      requestId: rid,
      ms: Date.now() - t0,
    });
  }
});

export default router;

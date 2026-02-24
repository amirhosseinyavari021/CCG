// /home/cando/CCG/server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatAIOutput, normalizeCompareMarkdown } from "../utils/outputFormatter.js";

const router = express.Router();

console.log("[ccgRoutes] loaded OK");

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function mkRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isNonEmpty(x) {
  return s(x).trim().length > 0;
}

// ✅ Normalize url/path as much as possible
router.use((req, _res, next) => {
  console.log(`[ccgRoutes] HIT ${req.method} ${req.originalUrl} (url="${req.url}")`);
  if (req.url === "") req.url = "/";
  if (req.url && !req.url.startsWith("/")) req.url = "/" + req.url;
  next();
});

/**
 * ✅ IMPORTANT:
 * بعضی وقت‌ها به‌خاطر mount یا proxy، داخل router مسیر "/" درست match نمی‌شود.
 * پس GET/POST را با regex می‌گیریم تا هر چی زیر /api/ccg آمد، به handler اصلی برسد.
 */

// GET anything under /api/ccg  => info
router.get(/.*/, (_req, res) => {
  res.json({
    ok: true,
    route: "/api/ccg",
    ts: Date.now(),
    methods: ["POST"],
    note: "Use POST /api/ccg for generate/compare.",
  });
});

// POST anything under /api/ccg => main handler
router.post(/.*/, async (req, res) => {
  const t0 = Date.now();
  const requestId = mkRequestId();

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const mode = s(body.mode || "generate").toLowerCase().trim();
    const lang = s(body.lang || "fa").toLowerCase() === "en" ? "en" : "fa";

    const wantMoreCommands = Number(body.wantMoreCommands || 2) || 2;
    const temperature = typeof body.temperature === "number" ? body.temperature : undefined;

    if (mode !== "generate" && mode !== "compare") {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_MODE",
          userMessage: lang === "fa" ? "حالت درخواست معتبر نیست." : "Invalid mode.",
          hint: lang === "fa" ? "mode باید generate یا compare باشد." : "mode must be generate or compare.",
        },
        requestId,
        ms: Date.now() - t0,
      });
    }

    // ========== GENERATE ==========
    if (mode === "generate") {
      const user_request = s(body.user_request || body.input || body.text || "");
      if (!isNonEmpty(user_request)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "EMPTY_INPUT",
            userMessage: lang === "fa" ? "ورودی خالی است." : "Empty input.",
            hint: lang === "fa" ? "متن درخواست را وارد کن." : "Provide input.",
          },
          requestId,
          ms: Date.now() - t0,
        });
      }

      const ai = await runAI({
        requestId,
        mode: "generate",
        lang,
        input: user_request,
        user_request,
        temperature,
        ...body,
      });

      if (ai?.error) {
        return res.status(502).json({
          ok: false,
          error: {
            code: "AI_ERROR",
            userMessage: lang === "fa" ? "خطا در سرویس هوش مصنوعی." : "AI provider error.",
            hint: lang === "fa" ? "دوباره تلاش کن." : "Retry.",
          },
          details: { message: s(ai.error) },
          requestId,
          ms: Date.now() - t0,
        });
      }

      const formatted = formatAIOutput(ai?.output || "", { lang, wantMoreCommands });

      return res.json({
        ok: true,
        output: formatted.markdown || s(ai?.output || ""),
        markdown: formatted.markdown || "",
        commands: formatted.commands || [],
        moreCommands: formatted.moreCommands || [],
        pythonScript: formatted.pythonScript || "",
        requestId,
        ms: Date.now() - t0,
        lang,
      });
    }

    // ========== COMPARE ==========
    const input_a = s(body.input_a || body.inputA || body.a || "");
    const input_b = s(body.input_b || body.inputB || body.b || "");

    if (!isNonEmpty(input_a) || !isNonEmpty(input_b)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "EMPTY_COMPARE_INPUT",
          userMessage: lang === "fa" ? "برای مقایسه باید هر دو کد A و B ارسال شود." : "Both A and B are required.",
          hint: lang === "fa" ? "input_a و input_b را پر کن." : "Provide input_a and input_b.",
        },
        requestId,
        ms: Date.now() - t0,
      });
    }

    const codeLangA = s(body.codeLangA || "auto").toLowerCase().trim();
    const codeLangB = s(body.codeLangB || "auto").toLowerCase().trim();
    const modeStyle = s(body.modeStyle || "comparator").toLowerCase().trim();

    // ✅ determine sameLang deterministically (do NOT trust UI)
    const sameLang =
      codeLangA &&
      codeLangB &&
      codeLangA !== "auto" &&
      codeLangB !== "auto" &&
      codeLangA === codeLangB;

    // ✅ decide compareOutputMode server-side (hard rule)
    const compareOutputMode =
      s(body.compareOutputMode || "").toLowerCase().trim() ||
      (sameLang ? "merge" : "advice");

    const ai = await runAI({
      requestId,
      mode: "compare",
      lang,
      input_a,
      input_b,
      codeLangA,
      codeLangB,
      sameLang,
      modeStyle,
      compareOutputMode,
      temperature,
      ...body,
    });

    let out = s(ai?.output || "");

    // ✅ CRITICAL FIX:
    // normalizeCompareMarkdown is async -> MUST await.
    // Otherwise you return raw model output (inline one-liner) and waste time forever.
    try {
      if (typeof normalizeCompareMarkdown === "function") {
        out = await normalizeCompareMarkdown(out, {
          lang,
          // for normalizer: tell desired mode
          compareOutputMode,
          mode: compareOutputMode,

          // help fence language selection
          fenceLang: sameLang ? codeLangA : "txt",
          codeLangA,
          codeLangB,
          sameLang,
        });
      }
    } catch (e) {
      console.warn("[ccgRoutes] normalizeCompareMarkdown failed:", e?.message || e);
      // keep raw out if normalizer crashes
    }

    if (!out.trim()) {
      out =
        lang === "fa"
          ? "## تفاوت‌های فنی\n\n- خروجی تولید نشد.\n"
          : "## Technical Differences\n\n- No output.\n";
    }

    return res.json({
      ok: true,
      output: out,
      markdown: out,
      requestId,
      ms: Date.now() - t0,
      lang,
      flags: {
        mode: "compare",
        modeStyle,
        compareOutputMode,
        codeLangA,
        codeLangB,
        sameLang,
      },
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    return res.status(500).json({
      ok: false,
      error: {
        code: "SERVER_ERROR",
        userMessage: "خطای داخلی سرور رخ داد.",
        hint: "لاگ‌ها را بررسی کن.",
      },
      details: { message: msg },
      requestId,
      ms: Date.now() - t0,
    });
  }
});

export default router;

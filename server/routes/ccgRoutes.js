// /home/cando/CCG/server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import * as outputFormatter from "../utils/outputFormatter.js";

const formatAIOutput = outputFormatter.formatAIOutput;
const normalizeCompareMarkdown = outputFormatter.normalizeCompareMarkdown;
const extractFirstFencedCode = outputFormatter.extractFirstFencedCode;
const postProcessMergeCode = outputFormatter.postProcessMergeCode;

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
        warnings: formatted.warnings || [],
        explanation: formatted.explanation || [],
        notes: formatted.notes || [],
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

    // ✅ normalizeCompareMarkdown is async -> MUST await.
    try {
      if (typeof normalizeCompareMarkdown === "function") {
        out = await normalizeCompareMarkdown(out, {
          lang,
          compareOutputMode,
          mode: compareOutputMode,
          codeLangA,
          codeLangB,
          sameLang,
        });
      }
    } catch (e) {
      console.warn("[ccgRoutes] normalizeCompareMarkdown failed:", e?.message || e);
    }

    // ✅ MERGE: extract code and make it copy-ready (all languages)
    let plainMergeCode = "";
    if (compareOutputMode === "merge") {
      const ex = extractFirstFencedCode(out);

      // Hint priority:
      // 1) if sameLang -> trust codeLangA
      // 2) else use fence language if present
      // 3) else sniff from code itself inside postProcess
      const hinted = sameLang ? codeLangA : (ex?.fenceLang || "txt");

      const rawCode = ex?.code || "";
      if (rawCode && rawCode.trim()) {
        plainMergeCode = await postProcessMergeCode(rawCode, hinted);
      } else {
        // fallback: if model didn't send a fence, try processing the whole out
        plainMergeCode = await postProcessMergeCode(out, hinted);
      }
    }

    if (!out.trim()) {
      out =
        lang === "fa"
          ? "## تفاوت‌های فنی\n\n- خروجی تولید نشد.\n"
          : "## Technical Differences\n\n- No output.\n";
    }

    return res.json({
      ok: true,

      // ✅ For merge: send only clean code to UI so copy works
      output: plainMergeCode || out,

      // keep markdown for debugging / future UI rendering improvements
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

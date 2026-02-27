// /home/cando/CCG/server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import * as outputFormatter from "../utils/outputFormatter.js";
import { quota } from "../middleware/quota.js";

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

function normLang(x) {
  return s(x).toLowerCase() === "en" ? "en" : "fa";
}

// ✅ Normalize url/path as much as possible
router.use((req, _res, next) => {
  console.log(`[ccgRoutes] HIT ${req.method} ${req.originalUrl} (url="${req.url}")`);
  if (req.url === "") req.url = "/";
  if (req.url && !req.url.startsWith("/")) req.url = "/" + req.url;
  next();
});

// GET anything under /api/ccg => info
router.get(/.*/, (_req, res) => {
  res.json({
    ok: true,
    route: "/api/ccg",
    ts: Date.now(),
    methods: {
      post: "POST /api/ccg",
      health: "GET /api/health",
    },
  });
});

/**
 * DYNAMIC QUOTA (طبق قوانین تو)
 *
 * Guest:
 * - هر سرویس (generator/compare) = 5 در روز
 *
 * Logged-in Free:
 * - Generator:
 *   - platform windows/mac + outputType (command/tool) => 100/day
 *   - python (outputType=python یا pythonScript=true) => 30/day
 *   - linux/network/other => 30/day
 * - Compare => 10/day
 *
 * Pro: فعلاً همون free (بعداً راحت افزایش می‌دیم)
 */
function quotaForRequest(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const mode = s(body.mode || "generate").toLowerCase().trim();

  // Guest is handled by quota middleware via limitGuest
  const limitGuest = 5;

  // default user limits (free/pro)
  const userFree = {
    genWinMac: 100,
    genOther: 30,
    genPython: 30,
    compare: 10,
  };
  const userPro = { ...userFree }; // فعلاً

  if (mode === "compare") {
    return {
      bucket: "compare",
      limitGuest,
      limitUser: { free: userFree.compare, pro: userPro.compare },
    };
  }

  // generate
  const platform = s(body.platform || "").toLowerCase().trim();
  const outputType = s(body.outputType || "").toLowerCase().trim(); // command | tool | python
  const pythonScript = !!body.pythonScript || outputType === "python";

  if (pythonScript) {
    return {
      bucket: "gen_python",
      limitGuest,
      limitUser: { free: userFree.genPython, pro: userPro.genPython },
    };
  }

  const isWinMac = platform === "windows" || platform === "mac";
  const isFreeWinMacOutput = isWinMac && (outputType === "command" || outputType === "tool");

  if (isFreeWinMacOutput) {
    return {
      bucket: "gen_winmac",
      limitGuest,
      limitUser: { free: userFree.genWinMac, pro: userPro.genWinMac },
    };
  }

  // linux/network/other
  return {
    bucket: `gen_${platform || "other"}`,
    limitGuest,
    limitUser: { free: userFree.genOther, pro: userPro.genOther },
  };
}

router.post(
  /.*/,
  async (req, res, next) => {
    const q = quotaForRequest(req);
    return quota({ bucket: q.bucket, limitGuest: q.limitGuest, limitUser: q.limitUser })(req, res, next);
  },
  async (req, res) => {
    const t0 = Date.now();
    const requestId = mkRequestId();

    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const mode = s(body.mode || "generate").toLowerCase().trim();
      const lang = normLang(body.lang);

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
          requestId,
          ms: Date.now() - t0,
          ...formatted,
        });
      }

      // ========== COMPARE ==========
      const inputA = s(body.inputA || body.input_a || "");
      const inputB = s(body.inputB || body.input_b || "");
      const langA = s(body.langA || body.lang_a || "");
      const langB = s(body.langB || body.lang_b || "");
      const finalMode = s(body.finalMode || body.outputMode || "advice");

      if (!isNonEmpty(inputA) || !isNonEmpty(inputB)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "EMPTY_INPUT",
            userMessage: lang === "fa" ? "هر دو ورودی لازم است." : "Both inputs required.",
          },
          requestId,
          ms: Date.now() - t0,
        });
      }

      const ai = await runAI({
        requestId,
        mode: "compare",
        lang,
        inputA,
        inputB,
        langA,
        langB,
        finalMode,
        temperature,
        ...body,
      });

      if (ai?.error) {
        return res.status(502).json({
          ok: false,
          error: {
            code: "AI_ERROR",
            userMessage: lang === "fa" ? "خطا در سرویس هوش مصنوعی." : "AI provider error.",
          },
          details: { message: s(ai.error) },
          requestId,
          ms: Date.now() - t0,
        });
      }

      const markdown = normalizeCompareMarkdown(s(ai?.output || ""), { lang });
      const mergeCode = postProcessMergeCode(extractFirstFencedCode(markdown) || "", { lang });
      const mergeLang = s(body.mergeLang || body.merge_lang || langA || langB || "");

      return res.json({
        ok: true,
        requestId,
        ms: Date.now() - t0,
        markdown,
        output: markdown,
        mergeCode,
        mergeLang,
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: { code: "CCG_FAILED", message: s(e?.message), requestId },
        requestId,
        ms: Date.now() - t0,
      });
    }
  }
);

export default router;

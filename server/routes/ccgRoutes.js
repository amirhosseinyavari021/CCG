// /home/cando/CCG/server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatOutput } from "../utils/outputFormatter.js";
import { toPromptVariables, buildFallbackPrompt } from "../utils/promptTransformer.js";
import { buildComparatorPromptStrict } from "../utils/promptBuilder.js";

const router = express.Router();

router.get("/health", (req, res) => res.json({ ok: true, service: "ccg", ts: Date.now() }));

function safeObj(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : {};
}

const MAX_COMPARE_CODE_CHARS = 30000;
function capText(t, max) {
  const s = String(t || "");
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n/* ...TRUNCATED (${s.length - max} chars) ... */\n`;
}

/** -------- Compare output quality gate (prevents template-only answers) -------- */
function hasCodeFence(md) {
  return /```[\s\S]*?```/m.test(String(md || ""));
}
function extractFirstFence(md) {
  const m = String(md || "").match(/```[^\n]*\n([\s\S]*?)```/m);
  return m ? m[1] : "";
}
function includesFragment(md, frag) {
  const t = String(md || "");
  const f = String(frag || "").trim();
  if (!f) return false;
  const tokens = f
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 6)
    .slice(0, 8);
  if (!tokens.length) return false;
  return tokens.some((tok) => t.includes(tok));
}
function looksTemplatey(md) {
  const t = String(md || "");
  if (t.includes("mergestyle")) return true;
  if (/فرض کردم|کلی\s*گویی|به صورت کامل و منظم|باید مراجعه کنید/u.test(t)) return true;
  return false;
}
function isGoodComparatorMarkdown(md, lang, codeA, codeB) {
  const t = String(md || "").trim();
  if (!t) return false;

  const req =
    lang === "en"
      ? ["## Differences", "## Quality & Security", "## Final Merged Code"]
      : ["## تفاوت‌ها", "## کیفیت و امنیت", "## کد Merge نهایی"];
  if (!req.every((h) => t.includes(h))) return false;

  if (!hasCodeFence(t)) return false;

  const merged = extractFirstFence(t);
  if (!merged.trim()) return false;
  if (merged.includes("##") || merged.includes("Differences") || merged.includes("تفاوت")) return false;

  const okA = includesFragment(t, codeA);
  const okB = includesFragment(t, codeB);

  if (!okA || !okB) return false;
  if (looksTemplatey(t)) return false;

  return true;
}
/** --------------------------------------------------------------------------- */

router.post("/", async (req, res) => {
  const t0 = Date.now();
  const rid = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Request-Id", rid);

    const body = safeObj(req.body);
    const lang = String(body.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
    const mode = String(body.mode || "generate").toLowerCase();

    const platform = String(body.platform || body.os || "linux").toLowerCase();
    const cli = String(body.cli || body.shell || "bash").toLowerCase();

    const moreDetails = Boolean(body.moreDetails);
    const moreCommands = Boolean(body.moreCommands);
    const pythonScript = Boolean(body.pythonScript);

    let inputA = body.input_a;
    let inputB = body.input_b;
    if (mode === "compare") {
      inputA = capText(inputA, MAX_COMPARE_CODE_CHARS);
      inputB = capText(inputB, MAX_COMPARE_CODE_CHARS);
    }

    const variables = toPromptVariables({
      ...body,
      input_a: inputA,
      input_b: inputB,
      lang,
      platform,
      os: platform,
      cli: pythonScript ? "python" : cli,
      outputType: pythonScript ? "python" : "tool",
      moreDetails,
      moreCommands,
      pythonScript,
      requestId: rid,
    });

    const fallbackPrompt = buildFallbackPrompt(variables);

    const timeoutMs = mode === "compare" ? 25000 : 20000;

    const ai = await runAI({
      variables,
      fallbackPrompt,
      temperature: 0.25,
      timeoutMs,
      max_tokens: mode === "compare" ? 900 : 700,
      requestId: rid,
    });

    if (ai?.error) {
      const isTimeout = String(ai.error || "").toLowerCase().includes("timed out");
      return res.status(502).json({
        ok: false,
        error: {
          code: isTimeout ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
          userMessage: lang === "fa"
            ? (isTimeout ? "پاسخ‌گویی سرویس AI بیش از حد طول کشید." : "خطا در سرویس هوش مصنوعی.")
            : (isTimeout ? "AI response took too long." : "AI provider error."),
          hint: lang === "fa"
            ? (isTimeout ? "کد کوتاه‌تر بده یا دوباره تلاش کن." : "چند لحظه بعد دوباره تلاش کن.")
            : (isTimeout ? "Try shorter inputs or retry." : "Please try again in a moment."),
        },
        details: String(ai.error || ""),
        output: "",
        markdown: "",
        requestId: rid,
        ms: Date.now() - t0,
      });
    }

    let raw = String(ai?.output || "").trim();

    // ✅ if somehow empty, do NOT return ok:true
    if (!raw) {
      return res.status(502).json({
        ok: false,
        error: {
          code: "AI_EMPTY_OUTPUT",
          userMessage: lang === "fa" ? "مدل خروجی خالی برگرداند." : "Model returned empty output.",
          hint: lang === "fa" ? "لطفاً دوباره تلاش کن یا ورودی را کوتاه‌تر کن." : "Retry or use shorter inputs.",
        },
        details: "Empty output",
        output: "",
        markdown: "",
        requestId: rid,
        ms: Date.now() - t0,
      });
    }

    if (variables.mode === "compare") {
      const codeA = String(variables.input_a || "");
      const codeB = String(variables.input_b || "");

      if (!isGoodComparatorMarkdown(raw, lang, codeA, codeB)) {
        const strictPrompt = buildComparatorPromptStrict(variables);

        const ai2 = await runAI({
          variables: { ...variables, prompt: strictPrompt },
          fallbackPrompt,
          temperature: 0.15,
          timeoutMs: 25000,
          max_tokens: 900,
          requestId: rid,
        });

        const raw2 = String(ai2?.output || "").trim();
        if (raw2 && isGoodComparatorMarkdown(raw2, lang, codeA, codeB)) raw = raw2;
      }

      // ✅ final empty guard
      if (!String(raw || "").trim()) {
        return res.status(502).json({
          ok: false,
          error: {
            code: "AI_EMPTY_OUTPUT",
            userMessage: lang === "fa" ? "مدل خروجی قابل‌نمایش برنگرداند." : "No displayable output.",
            hint: lang === "fa" ? "دوباره تلاش کن یا کد را کوتاه‌تر کن." : "Retry or shorten code.",
          },
          details: "Empty comparator output",
          output: "",
          markdown: "",
          requestId: rid,
          ms: Date.now() - t0,
        });
      }

      return res.status(200).json({
        ok: true,
        output: raw,
        markdown: raw,
        requestId: rid,
        ms: Date.now() - t0,
        lang,
        flags: { mode: "compare" },
      });
    }

    const formatted = formatOutput(raw, {
      cli,
      lang,
      wantMoreCommands: moreCommands ? 5 : 2,
    });

    const md = String(formatted.markdown || "").trim();
    if (!md) {
      return res.status(502).json({
        ok: false,
        error: {
          code: "AI_EMPTY_OUTPUT",
          userMessage: lang === "fa" ? "خروجی قابل‌نمایش تولید نشد." : "No displayable output produced.",
          hint: lang === "fa" ? "دوباره تلاش کن یا ورودی را کوتاه‌تر کن." : "Retry or shorten input.",
        },
        details: "Formatter produced empty markdown",
        output: "",
        markdown: "",
        requestId: rid,
        ms: Date.now() - t0,
      });
    }

    return res.status(200).json({
      ok: true,
      output: md,
      markdown: md,
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
      requestId: rid,
      ms: Date.now() - t0,
    });
  }
});

export default router;

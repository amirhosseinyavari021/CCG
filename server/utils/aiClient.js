// /home/cando/CCG/server/utils/aiClient.js
import fs from "fs";
import path from "path";
import { callOpenAICompat } from "./openaiCompat.js";
import { buildGeneratorPrompt, buildComparatorPrompt } from "./promptBuilder.js";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function toInt(v, def) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}

/** ---------------- Safe Provider Logger (NO secrets, NO prompt) ---------------- */
const logDir = path.join(process.cwd(), "logs");
const providerLogFile = path.join(logDir, "ai-provider.log");

function ensureLogDir() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch {}
}

function safeShort(v, n = 240) {
  const t = s(v).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function logProviderEvent(evt) {
  try {
    ensureLogDir();
    const ts = new Date().toISOString();
    fs.appendFileSync(providerLogFile, JSON.stringify({ ts, ...evt }) + "\n", { flag: "a" });
  } catch {}
}
/** --------------------------------------------------------------------------- */

function pickProvider(ctx) {
  const p = s(ctx.aiProvider || process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  return p === "openrouter" ? "openrouter" : "openai";
}

function getCompatConfig(provider, ctx) {
  if (provider === "openrouter") {
    const apiKey = s(process.env.OPENROUTER_API_KEY).trim();
    const model =
      s(ctx.model).trim() ||
      s(process.env.OPENROUTER_MODEL).trim() ||
      s(process.env.AI_PRIMARY_MODEL).trim() ||
      "openrouter/auto";

    const baseUrl = s(process.env.OPENROUTER_BASE_URL).trim() || "https://openrouter.ai/api/v1";

    const extraHeaders = {};
    if (process.env.OPENROUTER_HTTP_REFERER) extraHeaders["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
    if (process.env.OPENROUTER_APP_TITLE) extraHeaders["X-Title"] = process.env.OPENROUTER_APP_TITLE;

    return { apiKey, model, baseUrl, extraHeaders };
  }

  const apiKey = s(process.env.OPENAI_API_KEY).trim();
  const model = s(ctx.model).trim() || s(process.env.AI_PRIMARY_MODEL).trim() || "gpt-4.1";
  const baseUrl = s(process.env.OPENAI_BASE_URL).trim() || "https://api.openai.com/v1";
  return { apiKey, model, baseUrl, extraHeaders: {} };
}

function buildPromptByMode(ctx) {
  const mode = s(ctx.mode || "generate").toLowerCase();
  if (mode === "compare") return buildComparatorPrompt(ctx);
  return buildGeneratorPrompt(ctx);
}

/** ---------------- Concurrency limiter (simple semaphore) ---------------- */
const MAX_AI_CONCURRENCY = Math.max(1, toInt(process.env.AI_MAX_CONCURRENCY, 2));
let inflight = 0;
const waiters = [];

async function acquire() {
  if (inflight < MAX_AI_CONCURRENCY) {
    inflight += 1;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  inflight += 1;
}

function release() {
  inflight = Math.max(0, inflight - 1);
  const next = waiters.shift();
  if (next) next();
}
/** ----------------------------------------------------------------------- */

function isRetryableError(err) {
  const t = s(err).toLowerCase();
  if (!t) return false;
  return (
    t.includes("timeout") ||
    t.includes("timed out") ||
    t.includes("empty model output") ||
    t.includes("429") ||
    t.includes("rate limit") ||
    t.includes("overloaded") ||
    t.includes("5xx") ||
    t.includes("http 5")
  );
}

function fallbackCompareMarkdown({ lang = "fa", compareOutputMode = "advice" } = {}) {
  const fa = lang !== "en";
  if (String(compareOutputMode).toLowerCase() === "merge") {
    const h1 = fa ? "## تفاوت‌های فنی" : "## Technical Differences";
    const h2 = fa ? "## کد Merge نهایی" : "## Final Merged Code";
    const diff = fa
      ? [
          "- سرویس هوش مصنوعی پاسخ پایدار ارائه نداد و خروجی به حالت جایگزین برگشت.",
          "- برای تحلیل دقیق‌تر: دوباره تلاش کنید یا حجم کد را کمتر کنید.",
          "- پیشنهاد: تست‌ها، مدیریت خطا و بهینه‌سازی IO/حافظه را بررسی کنید.",
        ].join("\n")
      : [
          "- AI provider returned unstable output; returned fallback response.",
          "- For deeper analysis: retry or shorten code input.",
          "- Suggestion: review tests, error handling, and IO/memory optimizations.",
        ].join("\n");

    return [h1, "", diff, "", h2, "", "```txt\n" + (fa ? "کد نهایی در این تلاش تولید نشد." : "Final code was not produced in this attempt.") + "\n```"].join(
      "\n"
    );
  }

  // advice
  const hDiff = fa ? "## تفاوت‌های فنی" : "## Technical Differences";
  const hA = fa ? "## پیشنهادهای بهبود برای کد A" : "## Improvement Suggestions for Code A";
  const hB = fa ? "## پیشنهادهای بهبود برای کد B" : "## Improvement Suggestions for Code B";

  const diff = fa
    ? [
        "- سرویس هوش مصنوعی پاسخ پایدار ارائه نداد و خروجی به حالت جایگزین برگشت.",
        "- به صورت کلی تفاوت‌ها معمولاً در رویکرد IO، ساختار داده‌ها، مدیریت خطا و خوانایی است.",
      ].join("\n")
    : [
        "- AI provider returned unstable output; returned fallback response.",
        "- Differences often include IO strategy, data structures, error handling, and readability.",
      ].join("\n");

  const a = fa
    ? ["- خوانایی و نام‌گذاری را بهتر کنید.", "- مدیریت خطا/edge-caseها را اضافه کنید.", "- تست واحد اضافه کنید."].join("\n")
    : ["- Improve readability and naming.", "- Add error handling/edge cases.", "- Add unit tests."].join("\n");

  const b = fa
    ? ["- عملکرد و مصرف حافظه را بررسی کنید.", "- لاگینگ و خروجی‌سازی را پایدار کنید.", "- تست و سناریوهای مرزی را اضافه کنید."].join("\n")
    : ["- Review performance and memory.", "- Stabilize logging/output.", "- Add tests and edge cases."].join("\n");

  return [hDiff, "", diff, "", hA, "", a, "", hB, "", b].join("\n");
}

/**
 * runAI({ variables, fallbackPrompt, temperature, requestId, ... })
 * - NEVER throws (returns { error } instead)
 */
export async function runAI(vars = {}) {
  const t0 = Date.now();

  const base = vars && typeof vars === "object" ? vars : {};
  const v = base.variables && typeof base.variables === "object" ? base.variables : {};
  const ctx = { ...v, ...base };

  const mode = s(ctx.mode || "generate").toLowerCase();
  const provider = pickProvider(ctx);
  const { apiKey, model, baseUrl, extraHeaders } = getCompatConfig(provider, ctx);

  const rid = s(ctx.requestId || ctx.request_id || ctx.rid || "").trim() || undefined;

  // hard fail if key is missing
  if (provider === "openrouter" && !apiKey) {
    const err = "OPENROUTER_API_KEY is not configured (AI_PROVIDER=openrouter).";
    logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
    return { error: err, output: "" };
  }
  if (provider === "openai" && !apiKey) {
    const err = "OPENAI_API_KEY is not configured (AI_PROVIDER=openai).";
    logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
    return { error: err, output: "" };
  }

  const prompt = s(ctx.prompt).trim() || buildPromptByMode(ctx);
  const fallbackPrompt = s(ctx.fallbackPrompt || base.fallbackPrompt || "").trim();

  // timeouts/retries
  const timeoutMs = toInt(process.env.AI_HTTP_TIMEOUT_MS, mode === "compare" ? 35_000 : 55_000);
  const maxRetries = toInt(process.env.AI_HTTP_MAX_RETRIES, 1);

  await acquire();
  try {
    const res = await callOpenAICompat({
      prompt,
      model,
      temperature: typeof ctx.temperature === "number" ? ctx.temperature : 0.25,
      apiKey,
      baseUrl,
      headers: extraHeaders,
      provider,
      timeoutMs,
      maxRetries,
    });

    // If error and fallbackPrompt exists => try fallback once
    if (res?.error && fallbackPrompt) {
      const retry = await callOpenAICompat({
        prompt: fallbackPrompt,
        model,
        temperature: typeof ctx.temperature === "number" ? ctx.temperature : 0.2,
        apiKey,
        baseUrl,
        headers: extraHeaders,
        provider,
        timeoutMs,
        maxRetries,
      });

      if (retry?.error) {
        // compare should not die hard => return fallback markdown for stability
        if (mode === "compare") {
          logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(retry.error) });
          return {
            output: fallbackCompareMarkdown({ lang: ctx.lang || "fa", compareOutputMode: ctx.compareOutputMode || ctx.modeStyle || "advice" }),
            raw: retry,
          };
        }

        logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(retry.error) });
        return { error: retry.error, output: "" };
      }

      logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: true, ms: Date.now() - t0 });
      return { output: s(retry?.output || ""), raw: retry };
    }

    if (res?.error) {
      // retry one more time if retryable (even without fallbackPrompt)
      if (isRetryableError(res.error)) {
        const retry2 = await callOpenAICompat({
          prompt: fallbackPrompt || prompt,
          model,
          temperature: typeof ctx.temperature === "number" ? Math.max(0.15, ctx.temperature - 0.1) : 0.2,
          apiKey,
          baseUrl,
          headers: extraHeaders,
          provider,
          timeoutMs,
          maxRetries,
        });

        if (!retry2?.error && s(retry2?.output).trim()) {
          logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: true, ms: Date.now() - t0 });
          return { output: s(retry2.output), raw: retry2 };
        }

        if (mode === "compare") {
          logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(retry2?.error || res.error) });
          return {
            output: fallbackCompareMarkdown({ lang: ctx.lang || "fa", compareOutputMode: ctx.compareOutputMode || ctx.modeStyle || "advice" }),
            raw: retry2 || res,
          };
        }

        logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(retry2?.error || res.error) });
        return { error: retry2?.error || res.error, output: "" };
      }

      if (mode === "compare") {
        logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(res.error) });
        return {
          output: fallbackCompareMarkdown({ lang: ctx.lang || "fa", compareOutputMode: ctx.compareOutputMode || ctx.modeStyle || "advice" }),
          raw: res,
        };
      }

      logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(res.error) });
      return { error: res.error, output: "" };
    }

    logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: true, ms: Date.now() - t0 });
    return { output: s(res?.output || ""), raw: res };
  } catch (e) {
    const err = e?.message ? e.message : String(e);

    if (mode === "compare") {
      logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
      return {
        output: fallbackCompareMarkdown({ lang: ctx.lang || "fa", compareOutputMode: ctx.compareOutputMode || ctx.modeStyle || "advice" }),
      };
    }

    logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
    return { error: err, output: "" };
  } finally {
    release();
  }
}

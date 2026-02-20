// server/utils/aiClient.js
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

function normProvider(p) {
  const x = s(p).toLowerCase().trim();
  return x === "openrouter" ? "openrouter" : "openai";
}

function getPrimaryProvider(ctx) {
  return normProvider(ctx.aiProvider || process.env.AI_PROVIDER || "openai");
}

function getFallbackProvider(ctx) {
  const fb = s(ctx.fallbackProvider || process.env.AI_FALLBACK_PROVIDER || "").trim();
  return fb ? normProvider(fb) : "";
}

function getProviderApiKey(provider) {
  return provider === "openrouter" ? s(process.env.OPENROUTER_API_KEY).trim() : s(process.env.OPENAI_API_KEY).trim();
}

function getProviderBaseUrl(provider) {
  if (provider === "openrouter") return s(process.env.OPENROUTER_BASE_URL).trim() || "https://openrouter.ai/api/v1";
  return s(process.env.OPENAI_BASE_URL).trim() || "https://api.openai.com/v1";
}

function getProviderModel(provider, ctx, isFallback) {
  if (!isFallback) {
    const m = s(ctx.model).trim() || s(process.env.AI_PRIMARY_MODEL).trim();
    if (m) return m;
    return provider === "openrouter" ? (s(process.env.OPENROUTER_MODEL).trim() || "openrouter/auto") : "gpt-4.1";
  }

  const m = s(ctx.fallbackModel).trim() || s(process.env.AI_FALLBACK_MODEL).trim();
  if (m) return m;
  return provider === "openrouter" ? (s(process.env.OPENROUTER_MODEL).trim() || "openrouter/auto") : "gpt-4.1";
}

function getProviderExtraHeaders(provider) {
  if (provider !== "openrouter") return {};
  const extraHeaders = {};
  if (process.env.OPENROUTER_HTTP_REFERER) extraHeaders["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
  if (process.env.OPENROUTER_APP_TITLE) extraHeaders["X-Title"] = process.env.OPENROUTER_APP_TITLE;
  return extraHeaders;
}

function buildPromptByMode(ctx) {
  const mode = s(ctx.mode || "generate").toLowerCase();
  if (mode === "compare") return buildComparatorPrompt(ctx);

  if (mode === "chat") {
    const msg = s(ctx.user_request || ctx.userRequest || ctx.message || "").trim();
    if (msg) return `You are a technical assistant.\n\nUser:\n${msg}\n\nAssistant:\n`;
  }

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

function isEmptyOutput(out) {
  return !s(out).trim();
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

    return [h1, "", diff, "", h2, "", "```txt\n" + (fa ? "کد نهایی در این تلاش تولید نشد." : "Final code was not produced in this attempt.") + "\n```"].join("\n");
  }

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
 * runAI({ variables, fallbackPrompt, temperature, requestId, signal, ... })
 * - NEVER throws (returns { error } instead)
 */
export async function runAI(vars = {}) {
  const t0 = Date.now();

  const base = vars && typeof vars === "object" ? vars : {};
  const v = base.variables && typeof base.variables === "object" ? base.variables : {};
  const ctx = { ...v, ...base };

  const mode = s(ctx.mode || "generate").toLowerCase();
  const rid = s(ctx.requestId || ctx.request_id || ctx.rid || "").trim() || undefined;

  const primaryProvider = getPrimaryProvider(ctx);
  const fallbackProvider = getFallbackProvider(ctx);

  const primaryModel = getProviderModel(primaryProvider, ctx, false);
  const fallbackModel = fallbackProvider ? getProviderModel(fallbackProvider, ctx, true) : "";

  const primaryKey = getProviderApiKey(primaryProvider);
  const fallbackKey = fallbackProvider ? getProviderApiKey(fallbackProvider) : "";

  const primaryBaseUrl = getProviderBaseUrl(primaryProvider);
  const fallbackBaseUrl = fallbackProvider ? getProviderBaseUrl(fallbackProvider) : "";

  const primaryHeaders = getProviderExtraHeaders(primaryProvider);
  const fallbackHeaders = fallbackProvider ? getProviderExtraHeaders(fallbackProvider) : {};

  const signal = ctx.signal;

  if (!primaryKey) {
    const err =
      primaryProvider === "openrouter"
        ? "OPENROUTER_API_KEY is not configured (AI_PROVIDER=openrouter)."
        : "OPENAI_API_KEY is not configured (AI_PROVIDER=openai).";
    logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err), tier: "primary" });
    return { error: err, output: "" };
  }

  if (fallbackProvider && !fallbackKey) {
    logProviderEvent({
      rid,
      provider: fallbackProvider,
      model: s(fallbackModel || "unknown"),
      mode,
      ok: false,
      ms: Date.now() - t0,
      err: "AI_FALLBACK_PROVIDER is set but its API key is missing.",
      tier: "fallback",
    });
  }

  const prompt = s(ctx.prompt).trim() || buildPromptByMode(ctx);
  const fallbackPrompt = s(ctx.fallbackPrompt || base.fallbackPrompt || "").trim();

  const timeoutMs = toInt(process.env.AI_HTTP_TIMEOUT_MS, mode === "compare" ? 35_000 : 55_000);
  const maxRetries = toInt(process.env.AI_HTTP_MAX_RETRIES, 1);

  async function callProvider({ provider, apiKey, model, baseUrl, headers, usePrompt, temperature }) {
    return callOpenAICompat({
      prompt: usePrompt,
      model,
      temperature,
      apiKey,
      baseUrl,
      headers,
      provider,
      timeoutMs,
      maxRetries,
      signal,
    });
  }

  await acquire();
  try {
    // PRIMARY
    const res = await callProvider({
      provider: primaryProvider,
      apiKey: primaryKey,
      model: primaryModel,
      baseUrl: primaryBaseUrl,
      headers: primaryHeaders,
      usePrompt: prompt,
      temperature: typeof ctx.temperature === "number" ? ctx.temperature : 0.25,
    });

    const primaryOk = !res?.error && !isEmptyOutput(res?.output);
    if (primaryOk) {
      logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: true, ms: Date.now() - t0, tier: "primary" });
      return { output: s(res.output), raw: res };
    }

    if (mode === "compare") {
      const err = res?.error || "Empty model output";
      logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err), tier: "primary" });
      return {
        output: fallbackCompareMarkdown({
          lang: ctx.lang || "fa",
          compareOutputMode: ctx.compareOutputMode || ctx.modeStyle || "advice",
        }),
        raw: res,
      };
    }

    // primary retry with fallbackPrompt (same provider)
    if (fallbackPrompt) {
      const retryPrompt = await callProvider({
        provider: primaryProvider,
        apiKey: primaryKey,
        model: primaryModel,
        baseUrl: primaryBaseUrl,
        headers: primaryHeaders,
        usePrompt: fallbackPrompt,
        temperature: typeof ctx.temperature === "number" ? ctx.temperature : 0.2,
      });

      if (!retryPrompt?.error && !isEmptyOutput(retryPrompt?.output)) {
        logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: true, ms: Date.now() - t0, tier: "primary_fallbackPrompt" });
        return { output: s(retryPrompt.output), raw: retryPrompt };
      }
    }

    // FALLBACK PROVIDER
    if (fallbackProvider && fallbackKey) {
      const fb = await callProvider({
        provider: fallbackProvider,
        apiKey: fallbackKey,
        model: fallbackModel,
        baseUrl: fallbackBaseUrl,
        headers: fallbackHeaders,
        usePrompt: prompt,
        temperature: 0.2,
      });

      if (!fb?.error && !isEmptyOutput(fb?.output)) {
        logProviderEvent({ rid, provider: fallbackProvider, model: s(fallbackModel || "unknown"), mode, ok: true, ms: Date.now() - t0, tier: "fallback" });
        return { output: s(fb.output), raw: fb };
      }

      const err = fb?.error || "Empty model output";
      logProviderEvent({ rid, provider: fallbackProvider, model: s(fallbackModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err), tier: "fallback" });
      return { error: err, output: "" };
    }

    // last retry on retryable
    const err0 = res?.error || "Empty model output";
    if (res?.error && isRetryableError(res.error)) {
      const retry2 = await callProvider({
        provider: primaryProvider,
        apiKey: primaryKey,
        model: primaryModel,
        baseUrl: primaryBaseUrl,
        headers: primaryHeaders,
        usePrompt: fallbackPrompt || prompt,
        temperature: typeof ctx.temperature === "number" ? Math.max(0.15, ctx.temperature - 0.1) : 0.2,
      });

      if (!retry2?.error && !isEmptyOutput(retry2?.output)) {
        logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: true, ms: Date.now() - t0, tier: "primary_retry" });
        return { output: s(retry2.output), raw: retry2 };
      }

      const err = retry2?.error || err0;
      logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err), tier: "primary_retry" });
      return { error: err, output: "" };
    }

    logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err0), tier: "primary" });
    return { error: err0, output: "" };
  } catch (e) {
    const err = e?.message ? e.message : String(e);

    if (mode === "compare") {
      logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
      return {
        output: fallbackCompareMarkdown({
          lang: ctx.lang || "fa",
          compareOutputMode: ctx.compareOutputMode || ctx.modeStyle || "advice",
        }),
      };
    }

    logProviderEvent({ rid, provider: primaryProvider, model: s(primaryModel || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
    return { error: err, output: "" };
  } finally {
    release();
  }
}

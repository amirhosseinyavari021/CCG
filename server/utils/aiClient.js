// /home/cando/CCG/server/utils/aiClient.js
// Production-grade AI client for CCG
// - Builds prompt automatically based on mode if prompt not provided
// - Supports OpenAI + OpenRouter via openaiCompat
// - NEVER throws (returns { output, error, raw, meta })

import { buildGeneratorPrompt, buildComparatorPrompt } from "./promptBuilder.js";
import { callOpenAICompat } from "./openaiCompat.js";
import { buildFallbackPrompt, toPromptVariables } from "./promptTransformer.js";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function pickProvider(ctx = {}) {
  // explicit override wins
  const p = s(ctx.provider || process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (p === "openrouter" || p === "openai") return p;

  // if OpenRouter key exists -> prefer it (optional)
  const hasOR = !!s(process.env.OPENROUTER_API_KEY).trim();
  if (hasOR) return "openrouter";

  return "openai";
}

function getCompatConfig(provider, ctx = {}) {
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
  const model =
    s(ctx.model).trim() ||
    s(process.env.AI_PRIMARY_MODEL).trim() ||
    s(process.env.OPENAI_MODEL).trim() ||
    "gpt-4.1-mini";

  const baseUrl = s(process.env.OPENAI_BASE_URL).trim() || "https://api.openai.com/v1";
  return { apiKey, model, baseUrl, extraHeaders: {} };
}


function buildChatPromptByMode(ctx = {}) {
  const lang = s(ctx.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const text = s(ctx.user_request || ctx.userRequest || ctx.input || ctx.message || ctx.text || "").trim();

  if (lang === "en") {
    return [
      "You are CCG Technical Assistant.",
      "Scope: 1) Analyze errors/logs and provide step-by-step fixes. 2) Analyze/explain code and scripts.",
      "If request is outside this scope, briefly refuse and ask for a relevant technical input.",
      "Output plain Markdown (no JSON).",
      "",
      "User message:",
      text || "(empty)",
    ].join("\n");
  }

  return [
    "تو CCG Technical Assistant هستی.",
    "حوزه کاری فقط: 1) تحلیل خطا/لاگ و ارائه راه‌حل مرحله‌ای. 2) تحلیل و توضیح کد/اسکریپت.",
    "اگر درخواست خارج از این حوزه بود، کوتاه رد کن و از کاربر ورودی فنی مرتبط بخواه.",
    "خروجی فقط Markdown باشد (نه JSON).",
    "",
    "پیام کاربر:",
    text || "(خالی)",
  ].join("\n");
}

function buildPromptByMode(ctx = {}) {
  const mode = s(ctx.mode || "generate").toLowerCase().trim();
  if (mode === "generate") {
    const vars = toPromptVariables(ctx);
    return buildFallbackPrompt(vars);
  }
  if (mode === "compare") return buildComparatorPrompt(ctx);
  if (mode === "chat") return buildChatPromptByMode(ctx);
  return buildGeneratorPrompt(ctx);
}

function asNumber(x, d) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

/**
 * runAI(vars)
 * Accepts either:
 * - { prompt: "..." }  (direct)
 * OR
 * - any object that includes enough fields for promptBuilder (mode/lang/input_a/input_b/user_request/...)
 *
 * Returns:
 * { output, error, raw, meta }
 */
export async function runAI(vars = {}) {
  const t0 = Date.now();

  const base = vars && typeof vars === "object" ? vars : {};
  const v = base.variables && typeof base.variables === "object" ? base.variables : {};
  const ctx = { ...v, ...base };

  const provider = pickProvider(ctx);
  const { apiKey, model, baseUrl, extraHeaders } = getCompatConfig(provider, ctx);

  // hard fail if key missing (fast)
  if (provider === "openrouter" && !apiKey) {
    return { output: "", error: "OPENROUTER_API_KEY_MISSING", meta: { provider, model }, ms: Date.now() - t0 };
  }
  if (provider === "openai" && !apiKey) {
    return { output: "", error: "OPENAI_API_KEY_MISSING", meta: { provider, model }, ms: Date.now() - t0 };
  }

  // Build prompt if not provided
  let prompt = s(ctx.prompt).trim();
  if (!prompt) {
    prompt = s(buildPromptByMode(ctx)).trim();
  }
  if (!prompt) {
    return { output: "", error: "EMPTY_PROMPT", meta: { provider, model }, ms: Date.now() - t0 };
  }

  const temperature =
    typeof ctx.temperature === "number" ? ctx.temperature : asNumber(process.env.AI_TEMPERATURE, 0.3);

  const maxTokens = asNumber(process.env.CCG_MAX_OUTPUT_TOKENS, 3200);

  const timeoutMs = asNumber(process.env.AI_HTTP_TIMEOUT_MS, 35000);
  const maxRetries = asNumber(process.env.AI_HTTP_MAX_RETRIES, 1);

  const headers = { ...(extraHeaders || {}) };

  const resp = await callOpenAICompat({
    provider,
    apiKey,
    baseUrl,
    headers,
    model,
    temperature,
    max_tokens: maxTokens,
    timeoutMs,
    maxRetries,
    prompt,
  });

  if (resp?.error) {
    return {
      output: "",
      error: s(resp.error),
      raw: resp?.raw,
      meta: { provider, model, baseUrl },
      ms: Date.now() - t0,
    };
  }

  return {
    output: s(resp?.output || ""),
    raw: resp?.raw,
    meta: { provider, model, baseUrl },
    ms: Date.now() - t0,
  };
}


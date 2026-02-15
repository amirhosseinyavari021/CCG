// /home/cando/CCG/server/utils/aiClient.js
import fs from "fs";
import path from "path";
import { callOpenAICompat } from "./openaiCompat.js";
import { buildGeneratorPrompt, buildComparatorPrompt } from "./promptBuilder.js";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}
function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/** ---------------- Safe Provider Logger (NO secrets, NO prompt) ---------------- */
const logDir = path.join(process.cwd(), "logs");
const providerLogFile = path.join(logDir, "ai-provider.log");

function ensureLogDir() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch {}
}

function safeShort(v, n = 220) {
  const t = s(v).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function logProviderEvent(evt) {
  try {
    ensureLogDir();
    const ts = new Date().toISOString();
    const line = JSON.stringify({ ts, ...evt });
    fs.appendFileSync(providerLogFile, line + "\n", { flag: "a" });
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
  const baseUrl = s(process.env.OPENAI_BASE_URL).trim();
  return { apiKey, model, baseUrl: baseUrl || undefined, extraHeaders: {} };
}

function buildPromptByMode(ctx) {
  const mode = s(ctx.mode || "generate").toLowerCase();
  if (mode === "compare") return buildComparatorPrompt(ctx);
  return buildGeneratorPrompt(ctx);
}

/**
 * runAI({ variables, fallbackPrompt, temperature, timeoutMs, max_tokens, ... })
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

  const timeoutMs = num(ctx.timeoutMs, mode === "compare" ? 25000 : 20000);
  const max_tokens = num(ctx.max_tokens, mode === "compare" ? 900 : 700);

  async function callOnce(p) {
    const r = await callOpenAICompat({
      prompt: p,
      model,
      temperature: typeof ctx.temperature === "number" ? ctx.temperature : 0.25,
      max_tokens,
      maxTokens: max_tokens, // compat
      apiKey,
      baseUrl,
      headers: extraHeaders,
      provider,
      timeoutMs,
    });

    // ✅ normalize "empty output" into error
    const out = s(r?.output || "");
    if (!out.trim() && !r?.error) {
      return { ...r, error: "Empty model output", output: "" };
    }
    return r;
  }

  try {
    const res = await callOnce(prompt);

    // retry once using fallback prompt if error OR empty output
    if ((res?.error || !s(res?.output).trim()) && fallbackPrompt) {
      const retry = await callOnce(fallbackPrompt);

      if (retry?.error || !s(retry?.output).trim()) {
        logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(retry?.error || "Empty model output") });
        return { error: retry?.error || "Empty model output", output: "" };
      }

      logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: true, ms: Date.now() - t0 });
      return { output: s(retry?.output || ""), raw: retry };
    }

    if (res?.error || !s(res?.output).trim()) {
      logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(res?.error || "Empty model output") });
      return { error: res?.error || "Empty model output", output: "" };
    }

    logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: true, ms: Date.now() - t0 });
    return { output: s(res?.output || ""), raw: res };
  } catch (e) {
    const err = e?.message ? e.message : String(e);
    logProviderEvent({ rid, provider, model: s(model || "unknown"), mode, ok: false, ms: Date.now() - t0, err: safeShort(err) });
    return { error: err, output: "" };
  }
}

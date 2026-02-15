// /home/cando/CCG/server/utils/openaiCompat.js
import dotenv from "dotenv";
import OpenAI from "openai";

// Load .env reliably (PM2 does NOT load it by default)
dotenv.config({ path: process.env.DOTENV_PATH || "/home/cando/CCG/.env" });

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}
function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/**
 * getOpenAIClient({ apiKey, baseURL, headers })
 * - Supports OpenAI & OpenRouter (OpenAI-compatible) by injecting apiKey/baseURL
 * - NEVER throws (returns { client:null, error } instead)
 */
export function getOpenAIClient(opts = {}) {
  const apiKey = s(opts.apiKey).trim() || s(process.env.OPENAI_API_KEY).trim();

  const baseURL = s(opts.baseURL).trim() || s(process.env.OPENAI_BASE_URL).trim() || undefined;

  const headers = opts.headers && typeof opts.headers === "object" ? opts.headers : {};

  if (!apiKey) {
    return {
      client: null,
      error:
        "API key is missing. (For OpenRouter set OPENROUTER_API_KEY + AI_PROVIDER=openrouter). " +
        "If OpenAI: set OPENAI_API_KEY. سپس PM2 را با --update-env ریستارت کن.",
    };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: Object.keys(headers).length ? headers : undefined,
    });
    return { client, error: "" };
  } catch (e) {
    return { client: null, error: e?.message ? e.message : String(e) };
  }
}

/**
 * callOpenAICompat(opts)
 * - prompt, model, temperature
 * - max_tokens OR maxTokens
 * - provider, apiKey, baseUrl/baseURL, headers
 * - signal, timeoutMs
 *
 * IMPORTANT: Never throws
 */
export async function callOpenAICompat(opts = {}) {
  const prompt = s(opts.prompt).trim();
  if (!prompt) return { output: "", error: "Empty prompt" };

  const provider = s(opts.provider || process.env.AI_PROVIDER || "openai").toLowerCase().trim();

  const model =
    s(opts.model).trim() ||
    (provider === "openrouter" ? s(process.env.OPENROUTER_MODEL).trim() : "") ||
    s(process.env.AI_PRIMARY_MODEL).trim() ||
    s(process.env.OPENAI_MODEL).trim() ||
    "gpt-4.1";

  const temperature = typeof opts.temperature === "number" ? opts.temperature : 0.2;

  const max_tokens =
    typeof opts.max_tokens === "number"
      ? opts.max_tokens
      : typeof opts.maxTokens === "number"
      ? opts.maxTokens
      : undefined;

  const apiKey =
    s(opts.apiKey).trim() ||
    (provider === "openrouter" ? s(process.env.OPENROUTER_API_KEY).trim() : s(process.env.OPENAI_API_KEY).trim());

  const baseURL =
    s(opts.baseUrl).trim() ||
    s(opts.baseURL).trim() ||
    (provider === "openrouter"
      ? s(process.env.OPENROUTER_BASE_URL).trim() || "https://openrouter.ai/api/v1"
      : s(process.env.OPENAI_BASE_URL).trim() || "https://api.openai.com/v1");

  const headers = opts.headers && typeof opts.headers === "object" ? opts.headers : {};

  const { client, error: clientErr } = getOpenAIClient({ apiKey, baseURL, headers });
  if (!client) return { output: "", error: clientErr || "Failed to create AI client" };

  const externalSignal = opts.signal;
  const timeoutMs = num(opts.timeoutMs, 0);

  let controller = null;
  let timer = null;

  if (timeoutMs > 0) {
    controller = new AbortController();
    const onAbort = () => controller.abort(new Error("AI_ABORTED"));

    if (externalSignal) {
      if (externalSignal.aborted) onAbort();
      else externalSignal.addEventListener("abort", onAbort, { once: true });
    }

    timer = setTimeout(() => controller.abort(new Error("AI_TIMEOUT")), timeoutMs);
  }

  const finalSignal = controller ? controller.signal : externalSignal;

  try {
    const body = {
      model,
      temperature,
      max_tokens,
      messages: [{ role: "user", content: prompt }],
    };

    const resp = await client.chat.completions.create(body, finalSignal ? { signal: finalSignal } : undefined);

    const content = resp?.choices?.[0]?.message?.content ?? "";

    // ✅ CRITICAL: treat empty output as error (prevents "ok:true but empty markdown")
    if (!String(content).trim()) {
      return { output: "", error: "Empty model output", raw: resp };
    }

    return { output: content, raw: resp };
  } catch (e) {
    const isAbort =
      e?.name === "AbortError" ||
      String(e?.message || "").includes("AI_TIMEOUT") ||
      String(e?.message || "").toLowerCase().includes("aborted");

    const msg = isAbort
      ? "AI request timed out (abort)"
      : e?.response?.data?.error?.message || e?.message || String(e);

    return { output: "", error: msg, raw: e };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

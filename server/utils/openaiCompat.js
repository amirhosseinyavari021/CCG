// /home/cando/CCG/server/utils/openaiCompat.js
import dotenv from "dotenv";
import OpenAI from "openai";

// Load .env reliably
dotenv.config({ path: process.env.DOTENV_PATH || "/home/cando/CCG/.env" });

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function toInt(v, def) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}

function pickProvider(optsProvider) {
  const p = s(optsProvider || process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  return p === "openrouter" ? "openrouter" : "openai";
}

function getApiKey(provider, optsApiKey) {
  const fromOpts = s(optsApiKey).trim();
  if (fromOpts) return fromOpts;
  return provider === "openrouter" ? s(process.env.OPENROUTER_API_KEY).trim() : s(process.env.OPENAI_API_KEY).trim();
}

function getBaseURL(provider, optsBase) {
  const b = s(optsBase).trim();
  if (b) return b;
  if (provider === "openrouter") return s(process.env.OPENROUTER_BASE_URL).trim() || "https://openrouter.ai/api/v1";
  return s(process.env.OPENAI_BASE_URL).trim() || "https://api.openai.com/v1";
}

function getModel(provider, optsModel) {
  const m = s(optsModel).trim();
  if (m) return m;
  if (provider === "openrouter") return s(process.env.OPENROUTER_MODEL).trim() || "openrouter/auto";
  return s(process.env.AI_PRIMARY_MODEL).trim() || s(process.env.OPENAI_MODEL).trim() || "gpt-4.1";
}

function extractErr(e) {
  const status = e?.status || e?.response?.status || e?.response?.statusCode || "";
  const code = e?.code || e?.response?.data?.error?.code || "";
  const message =
    e?.response?.data?.error?.message ||
    e?.error?.message ||
    e?.message ||
    String(e);

  const parts = [];
  if (status) parts.push(`HTTP ${status}`);
  if (code) parts.push(`code=${code}`);
  if (message) parts.push(message);
  return parts.join(" | ").trim() || "Unknown AI error";
}

/**
 * callOpenAICompat(opts)
 * - NEVER throws (returns { output, error, raw })
 */
export async function callOpenAICompat(opts = {}) {
  const prompt = s(opts.prompt).trim();
  if (!prompt) return { output: "", error: "Empty prompt" };

  const provider = pickProvider(opts.provider);
  const apiKey = getApiKey(provider, opts.apiKey);
  if (!apiKey) {
    return {
      output: "",
      error: provider === "openrouter"
        ? "OPENROUTER_API_KEY is not configured (AI_PROVIDER=openrouter)."
        : "OPENAI_API_KEY is not configured (AI_PROVIDER=openai).",
    };
  }

  const baseURL = getBaseURL(provider, opts.baseUrl || opts.baseURL);
  const model = getModel(provider, opts.model);

  const temperature = typeof opts.temperature === "number" ? opts.temperature : 0.2;
  const max_tokens = typeof opts.max_tokens === "number" ? opts.max_tokens : undefined;

  const timeoutMs =
    typeof opts.timeoutMs === "number"
      ? opts.timeoutMs
      : toInt(process.env.AI_HTTP_TIMEOUT_MS, 35_000);

  const maxRetries =
    typeof opts.maxRetries === "number"
      ? opts.maxRetries
      : toInt(process.env.AI_HTTP_MAX_RETRIES, 1);

  const headers = opts.headers && typeof opts.headers === "object" ? opts.headers : {};

  let client;
  try {
    client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: Object.keys(headers).length ? headers : undefined,
      timeout: timeoutMs,
      maxRetries,
    });
  } catch (e) {
    return { output: "", error: `Failed to create OpenAI client: ${extractErr(e)}`, raw: e };
  }

  try {
    const resp = await client.chat.completions.create({
      model,
      temperature,
      max_tokens,
      messages: [{ role: "user", content: prompt }],
    });

    const content = resp?.choices?.[0]?.message?.content ?? "";
    if (!s(content).trim()) return { output: "", error: "Empty model output", raw: resp };
    return { output: content, error: "", raw: resp };
  } catch (e) {
    return { output: "", error: extractErr(e), raw: e };
  }
}

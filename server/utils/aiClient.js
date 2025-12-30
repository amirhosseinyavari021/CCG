// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

// Stored prompt
const PROMPT_ID =
  process.env.OPENAI_PROMPT_ID ||
  "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd";
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || "13";

/**
 * IMPORTANT:
 * gpt-4.1 currently supports ONLY text.verbosity="medium"
 * So we hard-force it to avoid: Unsupported value 'high' ...
 */
const SAFE_TEXT = { format: { type: "text" }, verbosity: "medium" };

function asString(x, fallback = "") {
  if (x === null || x === undefined) return fallback;
  if (typeof x === "string") return x;
  try { return String(x); } catch { return fallback; }
}

function normalizeVars(payload) {
  const b = (payload && typeof payload === "object" && !Array.isArray(payload)) ? payload : {};

  // user_request / userRequest / prompt / text / message / input / query ...
  const ur =
    (typeof payload === "string")
      ? payload
      : (b.user_request ?? b.userRequest ?? b.prompt ?? b.text ?? b.message ?? b.input ?? b.query ?? b.q ?? "");

  return {
    // Stored prompt expects these keys (keep mode internally even if UI removes it)
    mode: asString(b.mode ?? b.action ?? b.type ?? "generate") || "generate",
    cli: asString(b.cli ?? b.shell ?? b.terminal ?? "bash") || "bash",
    os: asString(b.os ?? b.platform ?? "linux") || "linux",
    lang: asString(b.lang ?? b.language ?? "fa") || "fa",
    error_message: asString(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    input_a: asString(b.input_a ?? b.inputA ?? b.a ?? b.codeA ?? b.code_a ?? b.left ?? ""),
    input_b: asString(b.input_b ?? b.inputB ?? b.b ?? b.codeB ?? b.code_b ?? b.right ?? ""),
    user_request: asString(ur ?? "").trim(),
  };
}

function extractText(data) {
  let text = "";

  // Responses API output format
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") text += c.text;
          if (typeof c?.output_text === "string") text += c.output_text;
        }
      } else if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") text += c.text;
          if (typeof c?.output_text === "string") text += c.output_text;
        }
      }
    }
  }

  if (!text && typeof data?.output_text === "string") text = data.output_text;
  if (!text && typeof data?.text?.value === "string") text = data.text.value;

  // Legacy fallbacks
  if (!text && data?.choices?.[0]?.message?.content)
    text = data.choices[0].message.content;
  if (!text && data?.choices?.[0]?.text)
    text = data.choices[0].text;

  return (typeof text === "string") ? text.trim() : "";
}

export async function callOpenAI({ apiKey, body }) {
  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

/**
 * runAI({ variables, fallbackPrompt, temperature })
 * - tries Stored Prompt first
 * - if fails, falls back to raw input prompt
 */
export async function runAI({ variables, fallbackPrompt, temperature = 0.35 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { output: "", error: "Missing OPENAI_API_KEY" };

  const v = normalizeVars(variables);

  // If user_request is empty, don't call OpenAI
  if (!v.user_request) return { output: "", error: "user_request is empty" };

  // 1) Stored Prompt attempt
  const attempt1 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      prompt: { id: PROMPT_ID, version: PROMPT_VERSION, variables: v },
      temperature,
      text: SAFE_TEXT,
      store: true,
    },
  });

  if (attempt1.ok) {
    const out = extractText(attempt1.data);
    if (out) return { output: out, error: null, raw: attempt1.data };
    return { output: "", error: "Empty AI response", raw: attempt1.data };
  }

  // 2) Fallback raw prompt
  const attempt2 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      input: fallbackPrompt || v.user_request,
      temperature,
      text: SAFE_TEXT,
      store: true,
    },
  });

  if (attempt2.ok) {
    const out = extractText(attempt2.data);
    if (out) return { output: out, error: null, raw: attempt2.data };
    return { output: "", error: "Empty AI response (fallback)", raw: attempt2.data };
  }

  const msg =
    attempt1.data?.error?.message ||
    attempt2.data?.error?.message ||
    `AI request failed (status ${attempt2.status || attempt1.status})`;

  return { output: "", error: msg, raw: { attempt1: attempt1.data, attempt2: attempt2.data } };
}

// server/utils/aiClient.js
import dotenv from "dotenv";

dotenv.config();

// ----------------------
// OpenAI Responses API
// ----------------------
const OPENAI_URL = "https://api.openai.com/v1/responses";

// Model + Stored Prompt
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
const PROMPT_ID = process.env.PROMPT_ID || "";
const PROMPT_VERSION = process.env.PROMPT_VERSION || "";

// Safety timeout to avoid hanging forever
const CCG_OPENAI_TIMEOUT_MS = Number(process.env.CCG_OPENAI_TIMEOUT_MS || 25000);

/**
 * IMPORTANT:
 * gpt-4.1 currently supports ONLY text.verbosity="medium"
 * So we hard-force it to avoid: Unsupported value 'high' ...
 */
const TEXT_BLOCK = {
  format: { type: "text" },
  verbosity: "medium",
};

// ----------------------
// Helpers
// ----------------------
function asString(x, fallback = "") {
  try {
    return String(x);
  } catch {
    return fallback;
  }
}

/**
 * Normalize vars for stored prompt.
 * Stored prompt expects fixed keys.
 */
function normalizeVars(payload) {
  const b =
    payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

  // user_request / userRequest / prompt / text / message / input / query ...
  const ur =
    b.user_request ??
    b.userRequest ??
    b.prompt ??
    b.text ??
    b.message ??
    b.input ??
    b.query ??
    "";

  // Stored prompt expects these keys (keep mode internally even if UI removes it)
  return {
    mode: asString(b.mode ?? b.action ?? b.type ?? "generate") || "generate",
    cli: asString(b.cli ?? b.shell ?? b.terminal ?? "bash") || "bash",
    os: asString(b.os ?? b.platform ?? "linux") || "linux",
    lang: asString(b.lang ?? b.language ?? "fa") || "fa",
    error_message: asString(b.error_message ?? b.errorMessage ?? b.err ?? ""),

    input_a: asString(
      b.input_a ??
        b.inputA ??
        b.a ??
        b.input1 ??
        b.codeA ??
        b.code_a ??
        b.left ??
        ""
    ),
    input_b: asString(
      b.input_b ??
        b.inputB ??
        b.b ??
        b.input2 ??
        b.codeB ??
        b.code_b ??
        b.right ??
        ""
    ),

    user_request: asString(ur ?? "").trim(),
  
    // extra context (safe; may be used by fallback prompt or future prompt versions)
    outputType: asString(b.outputType ?? b.output_type ?? ""),
    modeStyle: asString(b.modeStyle ?? b.mode_style ?? ""),
    vendor: asString(b.vendor ?? ""),
    deviceType: asString(b.deviceType ?? b.device_type ?? ""),
    force_raw: asString(b.force_raw ?? b.forceRaw ?? ""),
};
}

/**
 * Extract assistant text from OpenAI Responses API payload.
 */
export function extractText(data) {
  // Responses API output format
  if (Array.isArray(data?.output)) {
    let acc = "";
    for (const item of data.output) {
      if (!item) continue;

      // Common: { type:"message", content:[{type:"output_text",text:"..."}], role:"assistant" }
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          const t =
            c?.text ??
            c?.value ??
            c?.content ??
            c?.output_text ??
            c?.outputText ??
            "";
          if (typeof t === "string" && t.trim()) acc += (acc ? "\n" : "") + t.trim();
          if (c?.type === "output_text" && typeof c?.text === "string" && c.text.trim()) {
            // (Handled above, but kept for clarity)
          }
        }
        continue;
      }

      // Some shapes have item.content directly
      if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          const t = c?.text ?? c?.value ?? "";
          if (typeof t === "string" && t.trim()) acc += (acc ? "\n" : "") + t.trim();
        }
      }
    }
    return acc.trim();
  }

  // Legacy fallbacks (just in case)
  const text =
    data?.output_text ??
    data?.text ??
    data?.message ??
    data?.content ??
    data?.choices?.[0]?.message?.content ??
    "";

  return typeof text === "string" ? text.trim() : "";
}

/**
 * Call OpenAI Responses API with timeout (AbortController).
 * Throws on non-2xx or AbortError.
 */
export async function callOpenAI({ apiKey, body }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CCG_OPENAI_TIMEOUT_MS);

  try {
    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        `OpenAI error ${resp.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("OpenAI request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * runAI({ variables, fallbackPrompt, temperature })
 * - tries Stored Prompt first
 * - if fails, falls back to raw input prompt
 */
export async function runAI({ variables, fallbackPrompt, temperature = 0.35 }) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return { ok: false, output: "", error: "Missing OPENAI_API_KEY" };
  }

  const v = normalizeVars(variables);

  

  const forceRaw = String(v.force_raw || "").trim() === "1";
  const mode = String(v.mode || "").toLowerCase();
  const skipStored = forceRaw || mode === "generate" || mode === "chat";
// If user_request is empty, don't call OpenAI
  if (!v.user_request) {
    return { ok: false, output: "", error: "Empty user_request" };
  }

  // ----------------------
    if (!skipStored) {
  // 1) Stored Prompt attempt
  // ----------------------
  if (PROMPT_ID) {
    try {
      const body = {
        model: MODEL,
        prompt: {
          id: PROMPT_ID,
          ...(PROMPT_VERSION ? { version: PROMPT_VERSION } : {}),
        },
        input: v,
        temperature,
        text: TEXT_BLOCK,
        store: true,
      };

      const data = await callOpenAI({ apiKey, body });
      const out = extractText(data);
      if (out) return { ok: true, output: out, error: "" };

      // If no usable text, treat as failure and fallback
      throw new Error("Stored prompt returned empty output");
    } catch (e) {
      const msg = e?.message ? e.message : String(e);
      // fall through to fallback
      // (we keep going)
      // eslint-disable-next-line no-console
      console.error(`[AI] stored-prompt failed: ${msg}`);
    }
  }

  // ----------------------
    }

  // 2) Fallback raw prompt
  // ----------------------
  try {
    const rawInput = String(fallbackPrompt || v.user_request || "").trim();

    const body = {
      model: MODEL,
      input: rawInput,
      temperature,
      text: TEXT_BLOCK,
      store: false,
    };

    const data = await callOpenAI({ apiKey, body });
    const out = extractText(data);
    return { ok: true, output: out || "", error: "" };
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    return { ok: false, output: "", error: msg };
  }
}

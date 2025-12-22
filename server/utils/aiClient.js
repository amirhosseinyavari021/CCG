// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

const PROMPT_ID =
  process.env.OPENAI_PROMPT_ID ||
  "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd";
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || "13";

function extractText(data) {
  let text = "";

  // responses format
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      const c = item?.content?.[0];
      if (c?.text) text += c.text;
      if (c?.value) text += c.value;
    }
  }

  if (!text && data?.text?.value) text = data.text.value;

  // legacy fallbacks
  if (!text && data?.choices?.[0]?.message?.content)
    text = data.choices[0].message.content;
  if (!text && data?.choices?.[0]?.text) text = data.choices[0].text;

  return typeof text === "string" ? text.trim() : "";
}

async function callOpenAI({ apiKey, body }) {
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
 * variables: object (must match your prompt variables)
 * fallbackPrompt: string (raw prompt when stored prompt fails)
 */
export async function runAI({ variables, fallbackPrompt, temperature = 0.35 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { output: "", error: "Missing OPENAI_API_KEY" };

  // 1) Stored Prompt
  const attempt1 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      prompt: {
        id: PROMPT_ID,
        version: PROMPT_VERSION,
        variables,
      },
      temperature,
      text: { format: { type: "text" }, verbosity: "medium" },
      store: true,
    },
  });

  if (attempt1.ok) {
    const out = extractText(attempt1.data);
    if (out) return { output: out, error: null };
    return { output: "", error: "Empty AI response" };
  }

  // 2) Fallback raw prompt
  const attempt2 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      input: fallbackPrompt,
      temperature,
      text: { format: { type: "text" }, verbosity: "medium" },
      store: true,
    },
  });

  if (attempt2.ok) {
    const out = extractText(attempt2.data);
    if (out) return { output: out, error: null };
    return { output: "", error: "Empty AI response (fallback)" };
  }

  const msg =
    attempt1.data?.error?.message ||
    attempt2.data?.error?.message ||
    `AI request failed (status ${attempt2.status || attempt1.status})`;

  return { output: "", error: msg };
}

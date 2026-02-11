// /home/cando/CCG/server/utils/openaiCompat.js
import dotenv from "dotenv";
import OpenAI from "openai";

// Load .env reliably (PM2 does NOT load it by default)
dotenv.config({ path: process.env.DOTENV_PATH || "/home/cando/CCG/.env" });

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function getOpenAIClient() {
  const apiKey = s(process.env.OPENAI_API_KEY).trim();
  const baseURL = s(process.env.OPENAI_BASE_URL).trim() || undefined;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Put it in /home/cando/CCG/.env and restart PM2 with --update-env"
    );
  }

  return new OpenAI({ apiKey, baseURL });
}

/**
 * The function expected by server/utils/aiClient.js
 * Accepts { prompt, model, temperature, max_tokens }.
 */
export async function callOpenAICompat(opts = {}) {
  const client = getOpenAIClient();

  const prompt = s(opts.prompt).trim();
  if (!prompt) {
    return { output: "", error: "Empty prompt" };
  }

  const model =
    s(opts.model).trim() ||
    s(process.env.AI_PRIMARY_MODEL).trim() ||
    s(process.env.OPENAI_MODEL).trim() ||
    "gpt-4.1";

  const temperature =
    typeof opts.temperature === "number" ? opts.temperature : 0.2;

  const max_tokens =
    typeof opts.max_tokens === "number" ? opts.max_tokens : undefined;

  const resp = await client.chat.completions.create({
    model,
    temperature,
    max_tokens,
    messages: [{ role: "user", content: prompt }],
  });

  const content = resp?.choices?.[0]?.message?.content ?? "";
  return { output: content, raw: resp };
}

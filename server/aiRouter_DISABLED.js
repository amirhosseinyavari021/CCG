// /home/cando/CCG/server/aiRouter.js
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { transformPrompt } from "./utils/promptTransformer.js";

dotenv.config();

const {
  OPENAI_API_KEY,
  OPENAI_API_URL,
  AI_LOCAL_MODEL_URL,
  AI_LOCAL_MODEL_NAME,
} = process.env;

// Global safety timeout (برای جلوگیری از hang شدن)
const AI_TIMEOUT_MS = 15000; // 15 sec

function aiTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), AI_TIMEOUT_MS)
    ),
  ]);
}

const finalSystemMessage = `You are CCG... (same text you had)`;

// -------------------------
// Clients
// -------------------------
const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_API_URL || "https://api.openai.com/v1",
});

const localClient = new OpenAI({
  apiKey: "ollama",
  baseURL: AI_LOCAL_MODEL_URL || "http://localhost:11434/v1",
});

// -------------------------
// Main Router Function
// -------------------------
export const routeRequest = async (prompt) => {
  const vars = prompt?.variables || {};
  const promptId = prompt?.id || "pmpt_default";
  const version = String(prompt?.version || "1");

  // Log start
  console.log(
    JSON.stringify({
      event: "ai_route_start",
      prompt_id: promptId,
      version,
      mode: vars.mode,
    })
  );

  // -------------------------
  // 1) PRIMARY — OPENAI PROMPT PLATFORM
  // -------------------------
  try {
    console.log(
      JSON.stringify({
        event: "ai_primary_attempt",
        engine: "openai_prompt_platform",
        prompt_id: promptId,
        version,
      })
    );

    const response = await aiTimeout(
      openaiClient.responses.create({
        prompt: {
          id: promptId,
          version,
          variables: vars,
        },
      }),
      "OpenAI Primary"
    );

    let text = null;

    if (response.output?.[0]?.content?.[0]?.text) {
      text = response.output[0].content[0].text;
    } else if (typeof response.output_text === "string") {
      text = response.output_text;
    }

    if (!text) throw new Error("OpenAI Platform returned no usable text");

    return text;
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "ai_primary_failed",
        error: err.message,
      })
    );
  }

  // -------------------------
  // 2) FALLBACK — LOCAL MODEL
  // -------------------------
  try {
    console.log(
      JSON.stringify({
        event: "ai_fallback_attempt",
        engine: "local",
        model: AI_LOCAL_MODEL_NAME,
      })
    );

    const systemMessage = {
      role: "system",
      content: finalSystemMessage,
    };

    let userMessages;

    try {
      userMessages = transformPrompt(vars) || [];
    } catch (err) {
      throw new Error("transformPrompt failed: " + err.message);
    }

    const msg = [systemMessage, ...userMessages];

    const fallbackResponse = await aiTimeout(
      localClient.chat.completions.create({
        model: AI_LOCAL_MODEL_NAME || "qwen2:7b-instruct",
        messages: msg,
        temperature: 0.4,
      }),
      "Local Model"
    );

    const text =
      fallbackResponse.choices?.[0]?.message?.content ||
      fallbackResponse.choices?.[0]?.message?.text;

    if (!text) throw new Error("Local model returned empty response");

    return text;
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "ai_fallback_failed",
        error: err.message,
      })
    );

    throw new Error(
      "AI system failed: " + err.message
    );
  }
};

// server/utils/aiClient.js

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// سقف منطقی بالا (کاربر عادی متوجه نمی‌شود)
const MAX_OUTPUT_TOKENS = Number(process.env.CCG_MAX_OUTPUT_TOKENS || 3200);

export async function runAI({ mode = "chat", lang = "fa", prompt, requestId }) {
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    });

    return {
      output: response.output_text || "",
    };
  } catch (err) {
    return { error: err?.message || "AI_ERROR" };
  }
}

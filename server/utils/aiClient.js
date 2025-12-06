// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

export async function runAI(prompt) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { output: "", error: "⚠️ Missing OPENAI_API_KEY." };
    }

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",   // ← MATCH EXACTLY WHAT PM2 LOG SHOWS
        input: prompt,
      }),
    });

    const data = await resp.json();
    console.log("AI RAW:", data);

    let text = "";

    // ====== 2025 MODELS (NEW FORMAT) ======
    if (data?.output?.length > 0) {
      const content = data.output[0]?.content?.[0];

      if (content?.text) text = content.text;
      if (content?.value) text = content.value;
    }

    // ====== NEW "text" OUTER FIELD ======
    if (!text && data?.text?.value) {
      text = data.text.value;
    }

    // ====== OLD chat/completions ======
    if (!text && data?.choices?.[0]?.message?.content) {
      text = data.choices[0].message.content;
    }

    if (!text && data?.choices?.[0]?.text) {
      text = data.choices[0].text;
    }

    // Final Check
    if (typeof text === "string" && text.trim()) {
      return { output: text.trim(), error: null };
    }

    if (data.error) {
      return {
        output: "",
        error: `⚠️ AI Error: ${data.error.message || data.error.code}`
      };
    }

    return { output: "", error: "⚠️ Empty AI response." };

  } catch (err) {
    return { output: "", error: "⚠️ AI request failed: " + err.message };
  }
}

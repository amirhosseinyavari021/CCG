import express from "express";
import ccgNormalize from "../middleware/ccgNormalize.js";

// Try to import existing AI client in a compatible way.
import * as aiClient from "../utils/aiClient.js";

const router = express.Router();

function extractText(ai) {
  if (!ai) return "";
  if (typeof ai === "string") return ai;
  if (typeof ai.output_text === "string") return ai.output_text;
  if (typeof ai.text === "string") return ai.text;

  // OpenAI Responses-like format: ai.output -> [{type:"message", content:[...]}]
  try {
    if (Array.isArray(ai.output)) {
      const msg = ai.output.find(x => x && x.type === "message" && Array.isArray(x.content));
      if (msg) {
        const texts = msg.content
          .map(c => (c && (c.text || c.output_text)) ? (c.text || c.output_text) : "")
          .filter(Boolean);
        return texts.join("\n").trim();
      }
    }
  } catch {}

  // Fallback: try common shapes
  try {
    if (ai.data && typeof ai.data === "string") return ai.data;
    if (ai.result && typeof ai.result === "string") return ai.result;
    if (ai.result && typeof ai.result.text === "string") return ai.result.text;
  } catch {}

  return "";
}

router.post("/", ccgNormalize, ccgNormalize, ccgNormalize, async (req, res) => {
  const body = (req.ccg ?? req.body ?? {});
  try {
    const { mode, lang, os, outputStyle, userRequest } = req.body || {};

    if (!userRequest || String(userRequest).trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: "userRequest is required",
        hint: "Send { mode: 'generate'|'learn', lang: 'fa', os: 'windows|linux|macos', userRequest: '...' }"
      });
    }

    const runAI = aiClient.runAI || aiClient.default || aiClient.callOpenAI;
    if (!runAI) {
      return res.status(500).json({ ok: false, error: "AI client not available (runAI not found)" });
    }

    // Pass a superset for maximum backward-compatibility
    const payload = {
      mode,
      lang,
      os,
      outputStyle,
      userRequest,
      user_request: userRequest
    };

    const ai = await runAI(payload);
    const text = extractText(ai);

    return res.json({
      ok: true,
      mode,
      lang,
      os,
      outputStyle,
      text: text || "",
      raw: (!text ? ai : undefined) // only include raw if extraction failed
    });
  } catch (e) {
    console.error("CCG route error:", e);
    return res.status(500).json({ ok: false, error: "Internal error", details: String(e?.message || e) });
  }
});

export default router;

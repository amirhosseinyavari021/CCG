// server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatAIResponse } from "../utils/formatter.js";
import { toPromptVariables, buildFallbackPrompt } from "../utils/promptTransformer.js";

import { optionalAuth } from "../middleware/optionalAuth.js";
import { usageLimit } from "../middleware/usageLimit.js";

const router = express.Router();

router.post("/", optionalAuth, usageLimit(), async (req, res) => {
  try {
    const body = req.body || {};

    const user_request = String(body.user_request || "").trim();
    if (!user_request || user_request.length > 1200) {
      return res.status(400).json({
        ok: false,
        error: "Invalid or too long user request",
        code: "BAD_REQUEST",
      });
    }

    // Guest can send lang/mode; logged-in user can override defaults from profile
    const vars = toPromptVariables({
      mode: body.mode || "learn",
      os: body.os,
      cli: body.cli,
      lang: body.lang || req.user?.lang || "en",
      deviceType: body.deviceType,
      knowledgeLevel: body.knowledgeLevel || "beginner",
      user_request,
      error_message: body.error_message,
      input_a: body.input_a,
      input_b: body.input_b,
    });

    const fallbackPrompt = buildFallbackPrompt(vars);

    const ai = await runAI({ variables: vars, fallbackPrompt });

    const formatted = formatAIResponse(ai.output, ai.error);

    // keep compatibility: also return raw output if frontend wants markdown renderer
    return res.json({
      ...formatted,
      output: ai.output || "",
    });
  } catch (err) {
    console.error("CCG route error:", err);
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error",
      code: "SERVER_ERROR",
    });
  }
});

export default router;

// server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { buildDirectPrompt, buildClassicCCG } from "../utils/promptBuilder.js";
import { formatAIResponse } from "../utils/formatter.js";

const router = express.Router();

/**
 * 🔥 مسیر اصلی AI برای CCG v3.2.0
 * احراز هویت و لیمیت در server.js هندل می‌شود.
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body;

    // Direct prompt mode
    if (typeof body.prompt === "string" && body.prompt.trim()) {
      const prompt = buildDirectPrompt(body.prompt.trim());
      const result = await runAI(prompt);
      return res.json(formatAIResponse(result.output, result.error));
    }

    // Classic CCG mode
    const prompt = buildClassicCCG(body);
    const result = await runAI(prompt);

    return res.json(formatAIResponse(result.output, result.error));
  } catch (err) {
    console.error("CCG AI Route Error:", err);
    return res.json({
      output: "",
      error: "⚠️ Unexpected server error: " + err.message,
    });
  }
});

export default router;

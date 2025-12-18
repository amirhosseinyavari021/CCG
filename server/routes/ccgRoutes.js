// server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { buildCCGPrompt } from "../utils/promptBuilder.js";
import { formatAIResponse } from "../utils/formatter.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { usageLimit } from "../middleware/usageLimit.js";

const router = express.Router();

router.post(
  "/",
  optionalAuth,
  usageLimit(),
  async (req, res) => {
    try {
      const {
        user_request,
        os,
        deviceType,
        lang,
      } = req.body || {};

      if (!user_request || user_request.length > 800) {
        return res.status(400).json({
          error: "Invalid or too long user request",
        });
      }

      const role = req.user?.role || "learner";
      const finalLang = lang || req.user?.lang || "en";

      const prompt = buildCCGPrompt({
        userRequest: user_request.trim(),
        os,
        deviceType,
        role,
        lang: finalLang,
      });

      const result = await runAI(prompt);

      // ⬇⬇⬇ این خط حیاتی است
      const formatted = formatAIResponse(result.output, result.error);

      return res.json(formatted);
    } catch (err) {
      console.error("CCG route error:", err);
      return res.status(500).json({
        error: "Unexpected server error",
      });
    }
  }
);

export default router;

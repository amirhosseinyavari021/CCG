// server/routes/ccgRoutes.js

import express from "express";
import { runAI } from "../utils/aiClient.js";
import { buildDirectPrompt, buildClassicCCG } from "../utils/promptBuilder.js";
import { formatAIResponse } from "../utils/formatter.js";

import { requireAuth } from "../middleware/auth.js";
import { usageLimit } from "../middleware/usageLimit.js";
// اگر domainGuard داری، اضافه کن
// import { domainGuard } from "../middleware/domainGuard.js";

const router = express.Router();

/**
 * 🔥 مسیر اصلی AI برای CCG v3.2.0
 * ترتیب درست:
 * - requireAuth → باید user داخل req باشه
 * - usageLimit() → چک پلن / لیمیت روزانه
 * - handler اصلی AI
 */

router.post(
  "/",
  // domainGuard,   // اگر می‌خوای فعالش کن
  requireAuth,
  usageLimit(),
  async (req, res) => {
    try {
      const body = req.body;

      // Direct prompt mode
      if (typeof body.prompt === "string" && body.prompt.trim()) {
        const prompt = buildDirectPrompt(body.prompt.trim());
        const result = await runAI(prompt);

        // بعد از موفقیت: مصرف اضافه کن
        if (req.incrementUsage) await req.incrementUsage();

        return res.json(formatAIResponse(result.output, result.error));
      }

      // Classic CCG mode
      const prompt = buildClassicCCG(body);
      const result = await runAI(prompt);

      // بعد از موفقیت: مصرف اضافه کن
      if (req.incrementUsage) await req.incrementUsage();

      return res.json(formatAIResponse(result.output, result.error));

    } catch (err) {
      console.error("CCG AI Route Error:", err);
      return res.json({
        output: "",
        error: "⚠️ Unexpected server error: " + err.message
      });
    }
  }
);

export default router;

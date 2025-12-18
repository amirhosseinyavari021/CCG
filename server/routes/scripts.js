import express from "express";
import crypto from "crypto";
import SavedScript from "../models/SavedScript.js";
import { requireAuth } from "../middleware/auth.js";
import { saveLimit } from "../middleware/saveLimit.js";

const router = express.Router();

function safeStr(v, max = 2000) {
  const s = typeof v === "string" ? v : "";
  return s.slice(0, max);
}

function hashPayload(obj) {
  const raw = JSON.stringify(obj);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// POST /api/scripts/save
router.post("/save", requireAuth, saveLimit(), async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      title,
      userRequest,
      output,
      role,
      os,
      deviceType,
    } = req.body || {};

    const clean = {
      title: safeStr(title, 120),
      userRequest: safeStr(userRequest, 800),
      output: {
        command: safeStr(output?.command, 4000),
        explanation: safeStr(output?.explanation, 8000),
        warnings: Array.isArray(output?.warnings)
          ? output.warnings.slice(0, 20).map((w) => safeStr(w, 300))
          : [],
        verify: safeStr(output?.verify, 1000),
      },
      role: role === "expert" ? "expert" : "learner",
      os: safeStr(os, 30),
      deviceType: safeStr(deviceType, 40),
    };

    if (!clean.userRequest) {
      return res.status(400).json({ message: "userRequest is required" });
    }

    const hash = hashPayload({
      userRequest: clean.userRequest,
      output: clean.output,
      role: clean.role,
      os: clean.os,
      deviceType: clean.deviceType,
    });

    const doc = await SavedScript.create({
      userId,
      ...clean,
      hash,
    });

    res.json({ ok: true, item: doc });
  } catch (err) {
    // اگر تکراری بود (unique index)
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "این خروجی قبلاً ذخیره شده است.",
      });
    }
    console.error("save script error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/scripts
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const items = await SavedScript.find({ userId })
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ ok: true, items });
});

// DELETE /api/scripts/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const doc = await SavedScript.findOneAndDelete({ _id: id, userId });
  if (!doc) return res.status(404).json({ message: "Not found" });

  res.json({ ok: true });
});

export default router;

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET /api/profile/me
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      family: user.family,
      email: user.email,
      role: user.role,
      lang: user.lang,
      plan: user.plan,
      usage: user.usage,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Profile fetch failed" });
  }
});

/**
 * PATCH /api/profile/role
 */
router.patch("/role", requireAuth, async (req, res) => {
  const { role } = req.body;

  if (!["expert", "learner"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { role },
    { new: true }
  );

  res.json({ ok: true, role: user.role });
});

/**
 * PATCH /api/profile/lang
 */
router.patch("/lang", requireAuth, async (req, res) => {
  const { lang } = req.body;

  if (!["en", "fa"].includes(lang)) {
    return res.status(400).json({ error: "Invalid language" });
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { lang },
    { new: true }
  );

  res.json({ ok: true, lang: user.lang });
});

/**
 * GET /api/profile/usage
 */
router.get("/usage", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    plan: user.plan,
    usage: user.usage,
  });
});

export default router;

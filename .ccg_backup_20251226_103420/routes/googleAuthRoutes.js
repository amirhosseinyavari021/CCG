// server/routes/googleAuthRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const router = express.Router();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const oauth = new OAuth2Client(googleClientId);

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, plan: user.plan || "free" },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

/**
 * POST /api/google/login
 * body: { credential: "<google_id_token>" }
 */
router.post("/login", async (req, res) => {
  try {
    const credential = String(req.body?.credential || "").trim();
    if (!credential) return res.status(400).json({ ok: false, error: "Missing credential" });
    if (!googleClientId) return res.status(500).json({ ok: false, error: "GOOGLE_CLIENT_ID not configured" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ ok: false, error: "JWT_SECRET not configured" });

    const ticket = await oauth.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerified = payload?.email_verified;
    const name = payload?.name || "";
    const picture = payload?.picture || "";

    if (!email || !emailVerified) {
      return res.status(401).json({ ok: false, error: "Unverified Google account" });
    }

    // Upsert by email
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name,
        avatar: picture,
        plan: "free",
        lang: "en",
        role: "expert",
      });
    } else {
      const updates = {};
      if (!user.name && name) updates.name = name;
      if (!user.avatar && picture) updates.avatar = picture;
      if (Object.keys(updates).length) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true });
      }
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || "",
        plan: user.plan || "free",
        lang: user.lang || "en",
        role: user.role || "expert",
      },
    });
  } catch (e) {
    console.error("google login error:", e?.message || e);
    return res.status(401).json({ ok: false, error: "Invalid Google token" });
  }
});

export default router;

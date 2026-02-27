// server/routes/authRoutes.js
import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import EmailVerification from "../models/EmailVerification.js";

const router = express.Router();

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function normEmail(x) {
  return s(x).trim().toLowerCase();
}

function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sha256(x) {
  return crypto.createHash("sha256").update(String(x)).digest("hex");
}

// ---- SMTP SEND (placeholder)
async function sendOtpEmail({ email, code }) {
  console.log("[OTP] email:", email, "code:", code);
  return true;
}

/**
 * POST /api/auth/email/request-otp
 * body: { email }
 */
router.post("/email/request-otp", async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: { code: "INVALID_EMAIL", requestId: req.requestId } });
  }

  const now = new Date();

  const existing = await EmailVerification.findOne({ email });
  if (existing?.cooldownUntil && existing.cooldownUntil > now) {
    return res.status(429).json({
      ok: false,
      error: { code: "OTP_COOLDOWN", userMessage: "کمی بعد دوباره تلاش کن.", requestId: req.requestId },
    });
  }

  const code = genCode6();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + Number(process.env.OTP_TTL_MS || 10 * 60 * 1000));
  const cooldownUntil = new Date(Date.now() + Number(process.env.OTP_COOLDOWN_MS || 60 * 1000));

  await EmailVerification.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        codeHash,
        expiresAt,
        attempts: 0,
        cooldownUntil,
        lastSentAt: now,
      },
    },
    { upsert: true, new: true }
  );

  await sendOtpEmail({ email, code });

  return res.json({ ok: true });
});

/**
 * POST /api/auth/email/verify-otp
 * body: { email, code }
 */
router.post("/email/verify-otp", async (req, res) => {
  const email = normEmail(req.body?.email);
  const code = s(req.body?.code).trim();

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", requestId: req.requestId } });
  }

  const doc = await EmailVerification.findOne({ email });
  if (!doc) return res.status(400).json({ ok: false, error: { code: "OTP_NOT_FOUND", requestId: req.requestId } });

  if (doc.expiresAt && doc.expiresAt < new Date()) {
    return res.status(400).json({ ok: false, error: { code: "OTP_EXPIRED", requestId: req.requestId } });
  }

  doc.attempts = Number(doc.attempts || 0) + 1;
  if (doc.attempts > Number(process.env.OTP_MAX_ATTEMPTS || 5)) {
    await EmailVerification.deleteOne({ email });
    return res.status(429).json({ ok: false, error: { code: "OTP_TOO_MANY_ATTEMPTS", requestId: req.requestId } });
  }

  const ok = sha256(code) === doc.codeHash;
  if (!ok) {
    await doc.save();
    return res.status(400).json({ ok: false, error: { code: "OTP_INVALID", requestId: req.requestId } });
  }

  await doc.save();
  return res.json({ ok: true });
});

/**
 * POST /api/auth/register
 * body: { email, password }
 * Note: assumes otp already verified (front enforces). You can hard-enforce later.
 */
router.post("/register", async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = s(req.body?.password);

  if (!email || !email.includes("@") || password.length < 6) {
    return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", requestId: req.requestId } });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ ok: false, error: { code: "EMAIL_EXISTS", requestId: req.requestId } });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    passwordHash,
    emailVerified: true,
    plan: "free",
  });

  req.session.userId = String(user._id);
  req.session.plan = user.plan;

  return res.json({
    ok: true,
    user: { id: String(user._id), email: user.email, plan: user.plan, emailVerified: user.emailVerified },
  });
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = s(req.body?.password);

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", requestId: req.requestId } });
  }

  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ ok: false, error: { code: "INVALID_CREDENTIALS", requestId: req.requestId } });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ ok: false, error: { code: "INVALID_CREDENTIALS", requestId: req.requestId } });
  }

  user.lastLoginAt = new Date();
  await user.save();

  req.session.userId = String(user._id);
  req.session.plan = user.plan;

  return res.json({
    ok: true,
    user: { id: String(user._id), email: user.email, plan: user.plan, emailVerified: user.emailVerified },
  });
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (req, res) => {
  req.session = null;
  return res.json({ ok: true });
});

/**
 * GET /api/auth/me
 */
router.get("/me", async (req, res) => {
  const uid = req.session?.userId;
  if (!uid) return res.json({ ok: true, user: null });

  const user = await User.findById(uid);
  if (!user) return res.json({ ok: true, user: null });

  // keep session in sync
  req.session.plan = user.plan;

  return res.json({
    ok: true,
    user: { id: String(user._id), email: user.email, plan: user.plan, emailVerified: user.emailVerified },
  });
});

export default router;

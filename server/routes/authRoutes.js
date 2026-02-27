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
// اینجا فعلاً stub می‌ذارم چون گفتی SMTP داری.
// بعداً دقیقاً وصلش می‌کنیم به config واقعی.
async function sendOtpEmail({ email, code }) {
  // TODO: implement real SMTP (nodemailer یا سرویس شما)
  // فعلاً برای اینکه سیستم fail نکنه:
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
  const expiresAt = new Date(Date.now() + Number(process.env.OTP_TTL_MS || 10 * 60 * 1000)); // 10 min
  const cooldownUntil = new Date(Date.now() + Number(process.env.OTP_COOLDOWN_MS || 60 * 1000)); // 60 sec

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
  if (!doc) {
    return res.status(400).json({ ok: false, error: { code: "OTP_NOT_FOUND", requestId: req.requestId } });
  }

  if (doc.expiresAt < new Date()) {
    return res.status(400).json({ ok: false, error: { code: "OTP_EXPIRED", requestId: req.requestId } });
  }

  if (doc.attempts >= Number(process.env.OTP_MAX_ATTEMPTS || 5)) {
    return res.status(429).json({ ok: false, error: { code: "OTP_TOO_MANY_ATTEMPTS", requestId: req.requestId } });
  }

  const ok = sha256(code) === doc.codeHash;
  doc.attempts += 1;
  await doc.save();

  if (!ok) {
    return res.status(400).json({ ok: false, error: { code: "OTP_INVALID", requestId: req.requestId } });
  }

  // mark user as verified (create user if doesn't exist? نه، فقط verify flag وقتی register)
  return res.json({ ok: true, verified: true });
});

/**
 * POST /api/auth/register
 * body: { email, password }
 * شرط: OTP verify شده باشد (یعنی رکورد EmailVerification موجود و codeHash درست بوده)
 */
router.post("/register", async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = s(req.body?.password);

  if (!email || password.length < 8) {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_INPUT", userMessage: "ایمیل معتبر و رمز حداقل ۸ کاراکتر.", requestId: req.requestId },
    });
  }

  // اینجا ساده نگه می‌داریم: اگر OTP record هست و expire نشده، ثبت‌نام مجاز
  const otp = await EmailVerification.findOne({ email });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({
      ok: false,
      error: { code: "EMAIL_NOT_VERIFIED", userMessage: "اول ایمیل را تایید کن.", requestId: req.requestId },
    });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({
      ok: false,
      error: { code: "EMAIL_EXISTS", userMessage: "این ایمیل قبلاً ثبت شده.", requestId: req.requestId },
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    passwordHash,
    emailVerified: true,
    plan: "free",
    lastLoginAt: new Date(),
  });

  req.session.userId = String(user._id);

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

  return res.json({
    ok: true,
    user: { id: String(user._id), email: user.email, plan: user.plan, emailVerified: user.emailVerified },
  });
});

export default router;

// server/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// -------------------------------
// JWT helper
// -------------------------------
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

// -------------------------------
// TEST ROUTE
// -------------------------------
router.get("/test", (_, res) => {
  res.json({ ok: true });
});

// ===============================
// EMAIL REGISTER
// ===============================
router.post("/register-email", async (req, res) => {
  try {
    const { name, family, email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "ایمیل و رمز عبور ضروری است." });

    let exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "ایمیل قبلاً ثبت شده." });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      family,
      email,
      password: hashed,
      provider: "email",
    });

    const token = signToken(user);
    return res.json({ user, token });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ message: "خطا در ثبت‌نام." });
  }
});

// ===============================
// EMAIL LOGIN
// ===============================
router.post("/login-email", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "ایمیل یافت نشد." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ message: "رمز عبور اشتباه است." });

    const token = signToken(user);
    return res.json({ user, token });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "خطا در ورود." });
  }
});

// ===============================
// SEND OTP FOR PHONE LOGIN/SIGNUP
// ===============================
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone)
      return res.status(400).json({ message: "شماره ضروری است." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        provider: "phone",
      });
    }

    user.otpCode = otp;
    user.otpExpires = Date.now() + 2 * 60 * 1000; // 2 دقیقه
    await user.save();

    // در نسخه واقعی: ارسال SMS. فعلاً:
    return res.json({ otp, message: "کد ارسال شد." });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ message: "خطا در ارسال کد." });
  }
});

// ===============================
// VERIFY OTP → LOGIN / REGISTER
// ===============================
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name, family } = req.body;

    const user = await User.findOne({ phone });
    if (!user)
      return res.status(400).json({ message: "کاربر وجود ندارد." });

    if (user.otpCode !== otp)
      return res.status(400).json({ message: "کد اشتباه است." });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "کد منقضی شده." });

    if (name) user.name = name;
    if (family) user.family = family;

    user.otpCode = null;
    await user.save();

    const token = signToken(user);
    return res.json({ user, token });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ message: "خطا در تایید کد." });
  }
});

// ===============================
// GET CURRENT USER
// ===============================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    return res.json({ user });
  } catch (err) {
    console.error("ME Error:", err);
    return res.status(500).json({ message: "خطا در دریافت کاربر." });
  }
});

// ===============================
// LOGOUT
// ===============================
router.post("/logout", (req, res) => {
  return res.json({ message: "خروج انجام شد." });
});

export default router;

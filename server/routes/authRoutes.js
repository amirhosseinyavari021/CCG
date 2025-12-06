import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ---------------------------
// Signup
// ---------------------------
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashed,
      name,
      plan: "free",
      usage: {
        dailyUsed: 0,
        lastReset: new Date()
      }
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------
// Login
// ---------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;


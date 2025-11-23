import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();
const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is not set. Authentication routes will not work correctly.');
}

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      plan: user.plan
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی است.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'برای این ایمیل قبلاً حساب ساخته شده است.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 3); // 3 روز تریال

    const user = await User.create({
      email,
      passwordHash,
      plan: 'free',
      trialEnds
    });

    const token = createToken(user);

    res.json({
      token,
      user: {
        email: user.email,
        plan: user.plan,
        trialEnds: user.trialEnds
      }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'خطای داخلی سرور هنگام ثبت‌نام.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی است.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        email: user.email,
        plan: user.plan,
        trialEnds: user.trialEnds
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'خطای داخلی سرور هنگام ورود.' });
  }
});

export default router;

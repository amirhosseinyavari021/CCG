import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is not set. Authentication will not work correctly.');
}

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'برای استفاده از CCG باید وارد حساب کاربری شوید.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'کاربر یافت نشد یا دسترسی نامعتبر است.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'نشست کاربری شما معتبر نیست. دوباره وارد شوید.' });
  }
};

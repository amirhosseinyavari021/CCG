// server/middleware/optionalAuth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * اگر توکن معتبر باشد → req.user پر می‌شود
 * اگر نباشد → به عنوان مهمان ادامه می‌دهد (بدون خطا)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return next(); // مهمان
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return next(); // توکن خراب → مثل مهمان
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next();
    }

    req.user = { id: user._id, email: user.email, name: user.name };
    return next();
  } catch (err) {
    // توکن نامعتبر → مهمان
    return next();
  }
};

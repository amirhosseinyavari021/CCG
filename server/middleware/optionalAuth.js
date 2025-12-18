// server/middleware/optionalAuth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.id).select("_id email name role plan lang");
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      lang: user.lang,
    };

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

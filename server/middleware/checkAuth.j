// server/middleware/checkAuth.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const checkAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "no_token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ error: "invalid_user" });

    req.user = user;

    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "auth_failed" });
  }
};

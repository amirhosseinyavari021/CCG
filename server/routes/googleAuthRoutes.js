import express from "express";
import passport from "../auth/googleStrategy.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth?google=failure" }),
  async (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // برگشت به فرانت
    res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
  }
);

export default router;

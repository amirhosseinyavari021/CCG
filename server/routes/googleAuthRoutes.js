import express from "express";
import passport from "../auth/googleStrategy.js";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/?google=failure`,
    session: false,
  }),
  async (req, res) => {
    const { token } = req.user;

    // redirect to frontend callback page
    return res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

export default router;

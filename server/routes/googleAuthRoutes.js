// server/routes/googleAuthRoutes.js
import express from "express";

const router = express.Router();

// Disabled for v3.2.0 stability (googleStrategy missing)
router.all("*", (req, res) => {
  return res.status(503).json({
    ok: false,
    error: "Google OAuth is temporarily disabled.",
    code: "GOOGLE_AUTH_DISABLED",
  });
});

export default router;

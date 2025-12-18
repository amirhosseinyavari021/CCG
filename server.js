// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import { optionalAuth } from "./server/middleware/optionalAuth.js";
import { usageLimit } from "./server/middleware/usageLimit.js";

import ccgRoutes from "./server/routes/ccgRoutes.js";
import authRoutes from "./server/routes/authRoutes.js";
import profileRoutes from "./server/routes/profileRoutes.js";

dotenv.config();

const app = express();

/* ======================
   IMPORTANT FOR NGINX
====================== */
app.set("trust proxy", 1);

/* ======================
   BASIC SECURITY
====================== */
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

/* ======================
   RATE LIMIT (AUTH ONLY)
====================== */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);

/* ======================
   MAIN API (NO HTTP RATE LIMIT)
====================== */
app.use("/api/ccg", optionalAuth, usageLimit(), ccgRoutes);
app.use("/api/profile", optionalAuth, profileRoutes);

/* ======================
   HEALTH CHECK
====================== */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ======================
   DB + START
====================== */
const PORT = process.env.PORT || 50000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 CCG backend running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

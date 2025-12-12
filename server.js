// server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Middlewares
import { optionalAuth } from "./server/middleware/optionalAuth.js";
import { requireAuth } from "./server/middleware/auth.js";
import { usageLimit } from "./server/middleware/usageLimit.js";

// Routes
import ccgRoutes from "./server/routes/ccgRoutes.js";
import authRoutes from "./server/routes/authRoutes.js";

// Google OAuth (passport)
import passport from "passport";
import "./server/auth/googleStrategy.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "4mb" }));

// Initialize passport (NO session)
app.use(passport.initialize());

// ======================
// AUTH ROUTES (email, phone, google)
// ======================
app.use("/api/auth", authRoutes);

// ======================
// MAIN CCG AI ROUTE (Auth + Guest Limit)
// ======================
app.use("/api/ccg", optionalAuth, usageLimit(), ccgRoutes);

// ======================
// HEALTH CHECK
// ======================
app.get("/", (_, res) =>
  res.json({
    status: "online",
    version: "3.2.0",
    oauth: true,
  })
);

// ======================
// DB CONNECTION & SERVER START
// ======================
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI).then(() => {
  console.log("✅ MongoDB connected");
  const PORT = process.env.PORT || 50000;
  app.listen(PORT, () =>
    console.log(`🚀 CCG Backend running on ${PORT} — v3.2.0`)
  );
}).catch((err) => {
  console.error("❌ MongoDB error:", err);
  process.exit(1);
});

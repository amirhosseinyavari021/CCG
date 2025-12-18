import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    family: String,

    email: { type: String, unique: true, sparse: true },
    password: String,

    phone: { type: String, unique: true, sparse: true },

    provider: {
      type: String,
      enum: ["email", "google", "phone"],
      default: "email",
    },

    googleId: String,
    avatar: String,

    // 🔐 Product Controls
    role: {
      type: String,
      enum: ["expert", "learner"],
      default: "learner",
    },

    lang: {
      type: String,
      enum: ["en", "fa"],
      default: "en",
    },

    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },

    usage: {
      dailyUsed: { type: Number, default: 0 },
      lastReset: { type: Date, default: new Date() },
    },

    otpCode: String,
    otpExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

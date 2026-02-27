// server/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },

    googleId: { type: String, default: null, unique: true, sparse: true, index: true },

    plan: { type: String, default: "free", enum: ["free", "pro"] }, // فعلاً pro نداریم ولی آماده است
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null },
  },
  { minimize: false }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);

// server/models/EmailVerification.js
import mongoose from "mongoose";

const EmailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },

    attempts: { type: Number, default: 0 },
    cooldownUntil: { type: Date, default: null }, // برای جلوگیری از ارسال زیاد
    lastSentAt: { type: Date, default: null },
  },
  { minimize: false, timestamps: true }
);

// TTL (بعد از expire پاک شود)
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.EmailVerification ||
  mongoose.model("EmailVerification", EmailVerificationSchema);

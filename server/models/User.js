// server/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // هویت اصلی
    name: { type: String },
    family: { type: String },

    // ایمیل
    email: { type: String, unique: true, sparse: true },

    // پسورد (فقط برای provider=email)
    password: { type: String },

    // لاگین با شماره
    phone: { type: String, unique: true, sparse: true },

    // نوع ورود
    provider: {
      type: String,
      enum: ["email", "google", "phone"],
      default: "email",
    },

    // گوگل
    googleId: { type: String },
    avatar: { type: String },

    // OTP
    otpCode: { type: String },
    otpExpires: { type: Date },

    // پلن
    plan: { type: String, default: "free" },

    // محدودیت استفاده (همون ساختار قبلی رو نگه می‌داریم)
    usage: {
      dailyUsed: { type: Number, default: 0 },
      lastReset: { type: Date, default: new Date() },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;

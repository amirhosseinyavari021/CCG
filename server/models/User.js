// server/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },

    // برای یوزرهای معمولی (local)
    password: { 
      type: String, 
      default: null   // نباید required باشد
    },

    name: { 
      type: String, 
      default: ""     // گوگل همیشه name را می‌دهد
    },

    // -----------------------------
    //   GOOGLE OAUTH FIELDS
    // -----------------------------
    googleId: { 
      type: String, 
      sparse: true 
    },

    avatar: { 
      type: String, 
      default: null 
    },

    provider: { 
      type: String, 
      enum: ["local", "google"], 
      default: "local" 
    },

    // -----------------------------
    //   PLAN + USAGE
    // -----------------------------
    plan: { 
      type: String, 
      default: "free" 
    },

    usage: {
      used:  { type: Number, default: 0 },
      limit: { type: Number, default: 50 }
    }
  },

  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;

import mongoose from "mongoose";

const savedScriptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, default: "" },

    userRequest: { type: String, required: true },

    output: {
      command: { type: String, default: "" },
      explanation: { type: String, default: "" },
      warnings: { type: [String], default: [] },
      verify: { type: String, default: "" },
    },

    role: { type: String, enum: ["expert", "learner"], default: "learner" },
    os: { type: String, default: "" },
    deviceType: { type: String, default: "" },

    // جلوگیری از ذخیره تکراری/اسپم
    hash: { type: String, index: true },
  },
  { timestamps: true }
);

// هر کاربر نتونه یک خروجی رو ۱۰۰ بار ذخیره کنه
savedScriptSchema.index({ userId: 1, hash: 1 }, { unique: true });

export default mongoose.model("SavedScript", savedScriptSchema);

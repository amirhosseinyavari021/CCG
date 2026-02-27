// server/models/UsageDaily.js
import mongoose from "mongoose";

const UsageDailySchema = new mongoose.Schema(
  {
    ownerType: { type: String, required: true, enum: ["guest", "user"], index: true },
    ownerId: { type: String, required: true, index: true }, // userId stringify یا guestId
    dayKey: { type: String, required: true, index: true },   // YYYY-MM-DD (UTC)

    counters: {
      type: Object,
      default: {},
    },
  },
  { minimize: false, timestamps: true }
);

UsageDailySchema.index({ ownerType: 1, ownerId: 1, dayKey: 1 }, { unique: true });

export default mongoose.models.UsageDaily || mongoose.model("UsageDaily", UsageDailySchema);

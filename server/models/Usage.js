// server/models/Usage.js
import mongoose from "mongoose";

const UsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: String, required: true }, // YYYY-MM-DD

  windows: { type: Number, default: 0 },
  mac: { type: Number, default: 0 },
  linux: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  compare: { type: Number, default: 0 },
});

UsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("Usage", UsageSchema);

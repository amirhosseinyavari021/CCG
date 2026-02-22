// server/models/ChatThread.js
import mongoose from "mongoose";

const ChatThreadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    title: { type: String, default: "" },
    lang: { type: String, enum: ["fa", "en"], default: "fa" },

    pinned: { type: Boolean, default: false, index: true },

    expiresAt: { type: Date, required: true, index: true },

    regenCount: { type: Number, default: 0 },
    lastAssistantMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

ChatThreadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ChatThread", ChatThreadSchema);

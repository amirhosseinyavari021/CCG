// server/models/ChatMessage.js
import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },

    // For edit tracking (optional)
    editedFromMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);

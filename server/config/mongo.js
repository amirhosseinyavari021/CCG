// server/config/mongo.js
import mongoose from "mongoose";

export async function connectMongo({ uri, log } = {}) {
  const MONGO_URI = (uri || process.env.MONGO_URI || "").trim();

  if (!MONGO_URI) {
    log?.("warn", "⚠️ MongoDB URI is NOT configured (MONGO_URI missing)");
    return { ok: false, skipped: true };
  }

  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect(MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
    });

    log?.("info", "✅ MongoDB connected");
    return { ok: true };
  } catch (e) {
    log?.("error", "⛔ MongoDB connect failed", { err: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
}

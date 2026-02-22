// server/utils/chatThreadsStore.js
import ChatThread from "../models/ChatThread.js";
import ChatMessage from "../models/ChatMessage.js";

const RETENTION_DAYS = Number(process.env.CHAT_RETENTION_DAYS || 14);
const MAX_HISTORY_MESSAGES = Number(process.env.CHAT_MAX_HISTORY_MESSAGES || 40);

function addDays(d, days) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

export function retentionInfo() {
  return { retentionDays: RETENTION_DAYS };
}

export async function createThread({ lang = "fa", userId = null, title = "" } = {}) {
  const now = new Date();
  const th = await ChatThread.create({
    userId,
    lang: lang === "en" ? "en" : "fa",
    title: String(title || "").trim().slice(0, 44),
    pinned: false,
    expiresAt: addDays(now, RETENTION_DAYS),
  });
  return th;
}

/**
 * List threads:
 * - pinned first
 * - newest updated first
 */
export async function listThreads({ userId = null, lang } = {}) {
  const q = {};
  if (userId) q.userId = userId;

  // ⚠️ مهم: اگر خواستی language فقط UI باشه و چت‌ها پاک/مخفی نشن،
  // اصلاً فیلتر lang نزن. (پیشنهاد همین است)
  // اگر واقعاً لازم داشتی جدا بشن: این خط را فعال کن:
  // if (lang === "fa" || lang === "en") q.lang = lang;

  return ChatThread.find(q)
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(80)
    .lean();
}

export async function getThread(threadId) {
  return ChatThread.findById(threadId).lean();
}

export async function deleteThread(threadId, { userId = null } = {}) {
  const q = { _id: threadId };
  if (userId) q.userId = userId;

  await ChatMessage.deleteMany({ threadId });
  await ChatThread.deleteOne(q);
  return true;
}

export async function getMessages(threadId, { limit = MAX_HISTORY_MESSAGES } = {}) {
  return ChatMessage.find({ threadId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

export async function appendMessage(threadId, role, content, { editedFromMessageId = null } = {}) {
  const msg = await ChatMessage.create({
    threadId,
    role,
    content: String(content || ""),
    editedFromMessageId,
  });

  await ChatThread.findByIdAndUpdate(threadId, { updatedAt: new Date() });
  return msg;
}

export async function setThreadTitleIfEmpty(threadId, title) {
  const t = String(title || "").trim().replace(/\s+/g, " ");
  if (!t) return;

  const th = await ChatThread.findById(threadId);
  if (!th) return;

  if (!String(th.title || "").trim()) {
    th.title = t.slice(0, 44);
    await th.save();
  }
}

export async function renameThread(threadId, title) {
  const t = String(title || "").trim().replace(/\s+/g, " ").slice(0, 44);
  if (!t) return { ok: false, error: "INVALID_TITLE" };

  const th = await ChatThread.findById(threadId);
  if (!th) return { ok: false, error: "THREAD_NOT_FOUND" };

  th.title = t;
  await th.save();
  return { ok: true, thread: th.toObject() };
}

export async function setPinned(threadId, pinned) {
  const th = await ChatThread.findById(threadId);
  if (!th) return { ok: false, error: "THREAD_NOT_FOUND" };

  th.pinned = Boolean(pinned);
  await th.save();
  return { ok: true, thread: th.toObject() };
}

/**
 * ChatGPT-like Edit:
 * - truncate all messages AFTER the edited message
 * - reset regen
 */
export async function truncateAfterMessage(threadId, messageId) {
  const pivot = await ChatMessage.findOne({ _id: messageId, threadId }).lean();
  if (!pivot) return { ok: false, error: "MESSAGE_NOT_FOUND" };

  await ChatMessage.deleteMany({
    threadId,
    createdAt: { $gt: pivot.createdAt },
  });

  await ChatThread.findByIdAndUpdate(threadId, {
    regenCount: 0,
    lastAssistantMessageId: null,
    updatedAt: new Date(),
  });

  return { ok: true };
}

export async function popTrailingAssistant(threadId) {
  const last = await ChatMessage.findOne({ threadId }).sort({ createdAt: -1 }).lean();
  if (last && last.role === "assistant") {
    await ChatMessage.deleteOne({ _id: last._id });
    await ChatThread.findByIdAndUpdate(threadId, { lastAssistantMessageId: null, updatedAt: new Date() });
    return { ok: true, removed: true };
  }
  return { ok: true, removed: false };
}

export async function bumpRegen(threadId) {
  const th = await ChatThread.findById(threadId);
  if (!th) return { ok: false, error: "THREAD_NOT_FOUND" };

  const next = Number(th.regenCount || 0) + 1;
  if (next > 3) return { ok: false, error: "REGEN_LIMIT" };

  th.regenCount = next;
  await th.save();
  return { ok: true, regenCount: next };
}

export async function resetRegen(threadId) {
  await ChatThread.findByIdAndUpdate(threadId, {
    regenCount: 0,
    lastAssistantMessageId: null,
    updatedAt: new Date(),
  });
}

export async function setLastAssistant(threadId, assistantMessageId) {
  await ChatThread.findByIdAndUpdate(threadId, {
    lastAssistantMessageId: assistantMessageId,
    updatedAt: new Date(),
  });
}

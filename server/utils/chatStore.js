// server/utils/chatStore.js
import crypto from "node:crypto";

const TTL_MS = Number(process.env.CHAT_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 14); // 14d default
const MAX_TURNS = Number(process.env.CHAT_MAX_TURNS || 60);

const store = new Map();

function now() {
  return Date.now();
}

function gc() {
  const t = now();
  for (const [sid, sess] of store.entries()) {
    if (!sess?.expiresAt || sess.expiresAt <= t) store.delete(sid);
  }
}

const ALLOWED_LANG = new Set(["fa", "en"]);

function sanitizeProfile(p = {}) {
  const b = p && typeof p === "object" ? p : {};
  const lang = ALLOWED_LANG.has(String(b.lang || "fa").toLowerCase()) ? String(b.lang).toLowerCase() : "fa";

  return {
    lang,
    os: String(b.os || "linux"),
    cli: String(b.cli || "bash"),
    outputType: b.outputType ? String(b.outputType) : "markdown",
    platform: b.platform ? String(b.platform) : "",
    vendor: b.vendor ? String(b.vendor) : "",
    deviceType: b.deviceType ? String(b.deviceType) : "",
  };
}

function newMsg(role, content) {
  return {
    id: crypto.randomUUID(),
    role,
    content: String(content || "").trim(),
    ts: now(),
  };
}

export function createSession(profile = {}) {
  gc();
  const sessionId = crypto.randomUUID();
  const p = sanitizeProfile(profile);

  store.set(sessionId, {
    sessionId,
    profile: p,
    messages: [],
    meta: {
      // once we see a valid technical first message, we unlock follow-ups
      isTechnicalSession: false,
      // regenerate limit per last user turn
      regenUsed: 0,
      lastUserMsgId: "",
    },
    createdAt: now(),
    updatedAt: now(),
    expiresAt: now() + TTL_MS,
  });

  return { sessionId, profile: p };
}

export function getSession(sessionId) {
  gc();
  const s = store.get(String(sessionId || ""));
  if (!s) return null;
  if (s.expiresAt <= now()) {
    store.delete(s.sessionId);
    return null;
  }
  return s;
}

export function touchSession(sessionId) {
  const s = getSession(sessionId);
  if (!s) return null;
  s.updatedAt = now();
  s.expiresAt = now() + TTL_MS;
  return s;
}

export function appendMessage(sessionId, role, content) {
  const s = touchSession(sessionId);
  if (!s) return null;

  const msg = newMsg(role, content);
  if (!msg.content) return s;

  s.messages.push(msg);

  // keep within max turns
  if (s.messages.length > MAX_TURNS) {
    s.messages = s.messages.slice(s.messages.length - MAX_TURNS);
  }

  // update meta
  if (role === "user") {
    s.meta.lastUserMsgId = msg.id;
    s.meta.regenUsed = 0; // reset regenerate counter on new user message
  }

  return s;
}

export function setMeta(sessionId, patch = {}) {
  const s = touchSession(sessionId);
  if (!s) return null;
  s.meta = { ...(s.meta || {}), ...(patch || {}) };
  return s;
}

export function getLastUserMessage(sessionId) {
  const s = getSession(sessionId);
  if (!s) return null;
  for (let i = s.messages.length - 1; i >= 0; i--) {
    if (s.messages[i]?.role === "user") return s.messages[i];
  }
  return null;
}

export function popTrailingAssistant(sessionId) {
  const s = getSession(sessionId);
  if (!s) return null;
  const last = s.messages[s.messages.length - 1];
  if (last?.role === "assistant") s.messages.pop();
  return s;
}

export function isNewSession(sessionId) {
  const s = getSession(sessionId);
  if (!s) return true;
  return !Array.isArray(s.messages) || s.messages.length === 0;
}

export function sessionTTLInfo(sessionId) {
  const s = getSession(sessionId);
  if (!s) return null;
  return {
    ttlMs: TTL_MS,
    expiresAt: s.expiresAt,
    remainingMs: Math.max(0, s.expiresAt - now()),
  };
}

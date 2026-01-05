// server/utils/chatStore.js
import crypto from "node:crypto";

const TTL_MS = Number(process.env.CHAT_SESSION_TTL_MS || 1000 * 60 * 60 * 6); // 6h
const MAX_TURNS = Number(process.env.CHAT_MAX_TURNS || 18); // total messages kept (user+assistant)

const store = new Map();

function now() { return Date.now(); }

function sanitizeProfile(p = {}) {
  const b = (p && typeof p === "object") ? p : {};
  return {
    lang: String(b.lang || "fa"),
    os: String(b.os || "linux"),
    cli: String(b.cli || "bash"),
    knowledgeLevel: b.knowledgeLevel ? String(b.knowledgeLevel) : "",
    outputType: b.outputType ? String(b.outputType) : "markdown",
    modeStyle: b.modeStyle ? String(b.modeStyle) : "",
    platform: b.platform ? String(b.platform) : "",
    vendor: b.vendor ? String(b.vendor) : "",
    deviceType: b.deviceType ? String(b.deviceType) : "",
    mode: b.mode ? String(b.mode) : "generate",
  };
}

function gc() {
  const t = now();
  for (const [sid, sess] of store.entries()) {
    if (!sess?.expiresAt || sess.expiresAt <= t) store.delete(sid);
  }
}

export function createSession(profile = {}) {
  gc();
  const sessionId = crypto.randomUUID();
  const p = sanitizeProfile(profile);
  store.set(sessionId, {
    sessionId,
    profile: p,
    messages: [], // {role:"user"|"assistant", content:"..."}
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
  if (s.expiresAt <= now()) { store.delete(s.sessionId); return null; }
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
  const msg = { role, content: String(content || "").trim() };
  if (!msg.content) return s;

  s.messages.push(msg);
  // keep last MAX_TURNS messages
  if (s.messages.length > MAX_TURNS) {
    s.messages = s.messages.slice(s.messages.length - MAX_TURNS);
  }
  return s;
}

export function updateProfile(sessionId, patch = {}) {
  const s = touchSession(sessionId);
  if (!s) return null;
  s.profile = { ...s.profile, ...sanitizeProfile(patch) };
  return s;
}

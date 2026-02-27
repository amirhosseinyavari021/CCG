// server/routes/chatRoutes.js
import express from "express";
import mongoose from "mongoose";

import { runAI } from "../utils/aiClient.js";
import { rateLimit } from "../middleware/rateLimit.js";

import {
  retentionInfo,
  createThread,
  listThreads,
  getThread,
  deleteThread,
  getMessages,
  appendMessage,
  setThreadTitleIfEmpty,
  popTrailingAssistant,
  bumpRegen,
  resetRegen,
  setLastAssistant,
  renameThread,
} from "../utils/chatThreadsStore.js";

const router = express.Router();

/* =========================
   HELPERS
========================= */
function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function normLang(x) {
  return s(x).toLowerCase() === "en" ? "en" : "fa";
}

function isValidId(id) {
  return mongoose.isValidObjectId(String(id || ""));
}

async function safeCall(fn, primaryArgs, fallbackArgs) {
  try {
    return await fn(...primaryArgs);
  } catch (e1) {
    try {
      return await fn(...fallbackArgs);
    } catch (e2) {
      throw e2;
    }
  }
}

/**
 * ✅ appendMessage wrapper (signature-safe)
 */
async function appendMsg(threadId, { role, content, editedFromMessageId }) {
  const tid = s(threadId).trim();
  const r = s(role).trim();
  const c = typeof content === "string" ? content : s(content);
  const meta = { editedFromMessageId: editedFromMessageId || null };

  try {
    return await appendMessage(tid, r, c, meta);
  } catch {}

  try {
    return await appendMessage(tid, { role: r, content: c, ...meta });
  } catch {}

  return await appendMessage({ threadId: tid, role: r, content: c, ...meta });
}

function extractAIText(aiResult) {
  if (typeof aiResult === "string") return aiResult;
  if (!aiResult) return "";

  const direct =
    aiResult.markdown ??
    aiResult.output ??
    aiResult.text ??
    aiResult.content ??
    aiResult.message ??
    aiResult.data?.markdown ??
    aiResult.data?.output ??
    aiResult.data?.output_md ??
    aiResult.data?.text ??
    aiResult.result?.markdown ??
    aiResult.result?.output ??
    aiResult.result?.text;

  if (typeof direct === "string") return direct;

  const c0 = aiResult.choices?.[0];
  const nested = c0?.message?.content ?? c0?.text;
  if (typeof nested === "string") return nested;

  try {
    return JSON.stringify(aiResult, null, 2);
  } catch {
    return String(aiResult);
  }
}

function tryParseJsonLoose(text) {
  const raw = s(text).trim();
  if (!raw) return null;

  const candidates = [raw];

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(String(fenced[1]).trim());

  if (raw.includes("{") && raw.includes("}")) {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (last > first) candidates.push(raw.slice(first, last + 1).trim());
  }

  for (const item of candidates) {
    try {
      return JSON.parse(item);
    } catch {}
  }
  return null;
}

const MAX_INPUT_CHARS = Number(process.env.CHAT_MAX_CHARS || 32000);
const MAX_HISTORY_MESSAGES = Number(process.env.CHAT_MAX_HISTORY_MESSAGES || 18);

const chatLimiter = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.CHAT_RATE_MAX || 30),
});

/* =========================
   CHAT PROMPT (PLAIN CHAT)
========================= */
function buildChatPrompt({ lang = "fa", messages = [] } = {}) {
  const fa = lang !== "en";

  const system = fa
    ? `تو «CCG Chat» هستی.
هدف اصلی:
- کمک به تحلیل ارور/لاگ‌های Command/Script/Deploy و راهنمایی مرحله‌ای تا حل مشکل.
- تحلیل کد/اسکریپت و توضیح روان + پیشنهاد اصلاح.

قواعد خروجی:
- خروجی را مثل فرم generator (✅ دستور اصلی/هشدار/جایگزین) تولید نکن.
- چیزی را از خودت نساز؛ اگر اطلاعات لازم داری سوال دقیق بپرس.
- پاسخ‌ها کوتاه، عملی و مرحله‌ای باشند.`
    : `You are "CCG Chat".
Primary goals:
- Analyze errors/logs from commands/scripts/deployments and guide step-by-step until resolved.
- Analyze code/scripts and provide clear explanations + suggested fixes.

Output rules:
- Do NOT output the generator template (primary/warnings/alternatives).
- Do not invent details; ask targeted questions when needed.
- Keep answers practical and step-by-step.`;

  const convo = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => `${String(m.role || "").toUpperCase()}:\n${s(m.content)}`)
    .join("\n\n");

  return `SYSTEM:\n${system}\n\nCONVERSATION:\n${convo}\n\nAssistant:\n`;
}

/* =========================
   AI GUARD (SCOPE FILTER)
========================= */
function isGuardEnabled() {
  return String(process.env.AI_GUARD_ENABLED || "true").toLowerCase() === "true";
}

function buildGuardPrompt({ lang, userText }) {
  const fa = lang !== "en";
  if (fa) {
    return [
      "تو یک فیلترِ امنیتی برای CCG Chat هستی.",
      "وظیفه: تشخیص بده آیا پیام کاربر در حوزه مجاز هست یا نه.",
      "",
      "حوزه مجاز:",
      "1) تحلیل ارور/لاگ/دیپلوی/کانفیگ/شبکه/لینوکس/DevOps و راه‌حل مرحله‌ای",
      "2) تحلیل/دیباگ کد یا اسکریپت و پیشنهاد اصلاح",
      "",
      "اگر کاربر سوال عمومی/سرگرمی/غیر فنی/خارج حوزه پرسید => allow=false.",
      "اگر کاربر پرسید «تو چی هستی / درباره خودت» => allow=true و selfIntro=true.",
      "",
      "فقط JSON بده با این اسکیمای دقیق (بدون متن اضافه):",
      '{"allow":true|false,"selfIntro":true|false,"category":"in_scope|about_self|out_of_scope","reason":"کوتاه"}',
      "",
      "پیام کاربر:",
      s(userText),
    ].join("\n");
  }

  return [
    "You are a security scope filter for CCG Chat.",
    "Decide whether the user message is within allowed scope.",
    "",
    "Allowed scope:",
    "1) Analyze errors/logs/deploy/config/network/linux/DevOps + step-by-step fix",
    "2) Analyze/debug code or scripts + propose fixes",
    "",
    'If user asks "what are you / about yourself" => allow=true and selfIntro=true.',
    "If outside scope => allow=false.",
    "",
    "Return ONLY JSON with this exact schema (no extra text):",
    '{"allow":true|false,"selfIntro":true|false,"category":"in_scope|about_self|out_of_scope","reason":"short"}',
    "",
    "User message:",
    s(userText),
  ].join("\n");
}

function introMessage(lang = "fa") {
  if (lang === "en") {
    return `I'm **CCG Chat**, built for troubleshooting and code/log analysis for DevOps/IT tasks.\n\nCreated by **Amirhossein Yavari** with support from **Cando Academy** (an IT training institute).`;
  }

  // طبق چیزی که خودت خواستی
  return `من **CCG Chat** هستم؛ دستیار فنی برای تحلیل ارورها/لاگ‌ها، دیباگ کد و راهنمایی مرحله‌ای در حوزه DevOps/IT.\n\nتوسط **امیرحسین یاوری** با همکاری **آموزشگاه IT کندو** ساخته شدم (برترین آموزشگاه IT کشور).`;
}

function outOfScopeMessage(lang = "fa") {
  if (lang === "en") {
    return `I can only help with **technical troubleshooting** (errors/logs/deploy/config) and **code/script analysis**.\n\nSend me one of these and I’ll help:\n- The exact error/log\n- The command you ran + output\n- The relevant code snippet + what you expected`;
  }
  return `من فقط برای **عیب‌یابی فنی** (ارور/لاگ/دیپلوی/کانفیگ) و **تحلیل کد/اسکریپت** ساخته شدم.\n\nیکی از این‌ها رو بفرست تا دقیق کمک کنم:\n- متن دقیق ارور/لاگ\n- دستورهایی که زدی + خروجی\n- تکه کد مرتبط + نتیجه‌ای که انتظار داشتی`;
}

/* =========================
   RETENTION
========================= */
router.get("/retention", (_req, res) => {
  return res.json({ ok: true, ...retentionInfo() });
});

/* =========================
   THREADS
========================= */
router.get("/threads", async (req, res) => {
  const lang = normLang(req.query.lang);
  try {
    const r = await safeCall(listThreads, [{ lang }], [lang]);
    const threads = Array.isArray(r?.threads) ? r.threads : Array.isArray(r) ? r : [];
    return res.json({ ok: true, threads });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "THREADS_LIST_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

router.post("/threads", async (req, res) => {
  const lang = normLang(req.body?.lang);
  const title = s(req.body?.title).trim();

  try {
    const thread = await createThread({ lang, title });
    return res.json({ ok: true, thread });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "THREAD_CREATE_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

router.get("/threads/:threadId/messages", async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  if (!threadId) return res.status(400).json({ ok: false, error: { code: "MISSING_THREAD_ID", requestId: req.requestId } });
  if (!isValidId(threadId)) return res.status(400).json({ ok: false, error: { code: "INVALID_THREAD_ID", requestId: req.requestId } });

  try {
    const thread = await getThread(threadId);
    if (!thread) return res.status(404).json({ ok: false, error: { code: "THREAD_NOT_FOUND", requestId: req.requestId } });

    const messages = await safeCall(getMessages, [threadId, { limit: 500 }], [threadId]);
    return res.json({ ok: true, thread, messages: messages || [] });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "MESSAGES_GET_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

router.patch("/threads/:threadId", async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  const title = s(req.body?.title).trim().slice(0, 80);

  if (!threadId || !title) return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", requestId: req.requestId } });
  if (!isValidId(threadId)) return res.status(400).json({ ok: false, error: { code: "INVALID_THREAD_ID", requestId: req.requestId } });

  try {
    const r = await renameThread(threadId, title);
    const thread = r?.thread || (await getThread(threadId));
    return res.json({ ok: true, thread });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "THREAD_RENAME_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

router.delete("/threads/:threadId", async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  if (!threadId) return res.status(400).json({ ok: false, error: { code: "MISSING_THREAD_ID", requestId: req.requestId } });
  if (!isValidId(threadId)) return res.status(400).json({ ok: false, error: { code: "INVALID_THREAD_ID", requestId: req.requestId } });

  try {
    await deleteThread(threadId);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "THREAD_DELETE_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

/* =========================
   CHAT CORE
========================= */
async function buildHistory(threadId) {
  const raw = await safeCall(getMessages, [threadId, { limit: 500 }], [threadId]);
  const msgs = Array.isArray(raw) ? raw : raw?.messages || [];
  return msgs.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content }));
}

async function guardDecision({ lang, message, requestId }) {
  if (!isGuardEnabled()) return { allow: true, selfIntro: false, category: "in_scope", reason: "" };

  const max_tokens = Number(process.env.AI_GUARD_MAX_TOKENS || 120);
  const temperature = Number(process.env.AI_GUARD_TEMPERATURE || 0);

  const guardPrompt = buildGuardPrompt({ lang, userText: message });

  const r = await runAI({
    mode: "chat",
    lang,
    requestId,
    prompt: guardPrompt,
    max_tokens,
    temperature,
  });

  const txt = s(r?.output || extractAIText(r)).trim();
  const parsed = tryParseJsonLoose(txt);

  if (parsed && typeof parsed === "object") {
    const allow = !!parsed.allow;
    const selfIntro = !!parsed.selfIntro;
    const category = s(parsed.category || "").trim() || (selfIntro ? "about_self" : allow ? "in_scope" : "out_of_scope");
    const reason = s(parsed.reason || "").trim();
    return { allow, selfIntro, category, reason };
  }

  // اگر گارد خراب شد، fail-open اما محافظه‌کار: فقط در صورت خیلی واضح خارج حوزه رد کن
  return { allow: true, selfIntro: false, category: "in_scope", reason: "" };
}

async function runChatOnce({ threadId, lang, message, regenerate, editedFromMessageId, requestId }) {
  if (regenerate) {
    await popTrailingAssistant(threadId);
    await bumpRegen(threadId);
  } else {
    await resetRegen(threadId);
  }

  if (!regenerate) {
    await appendMsg(threadId, {
      role: "user",
      content: message,
      editedFromMessageId: editedFromMessageId || null,
    });
  }

  // ✅ GUARD
  const gd = await guardDecision({ lang, message, requestId });
  if (gd.selfIntro) {
    const answer = introMessage(lang);
    await appendMsg(threadId, { role: "assistant", content: answer, editedFromMessageId: null });
    try { await setLastAssistant(threadId, answer); } catch {}
    try { await setThreadTitleIfEmpty(threadId, message, lang); } catch {}
    const thread = await getThread(threadId);
    return { ok: true, markdown: answer, output: answer, thread, regenCount: Number(thread?.regenCount || 0) };
  }
  if (!gd.allow) {
    const answer = outOfScopeMessage(lang);
    await appendMsg(threadId, { role: "assistant", content: answer, editedFromMessageId: null });
    try { await setLastAssistant(threadId, answer); } catch {}
    try { await setThreadTitleIfEmpty(threadId, message, lang); } catch {}
    const thread = await getThread(threadId);
    return { ok: true, markdown: answer, output: answer, thread, regenCount: Number(thread?.regenCount || 0) };
  }

  const history = await buildHistory(threadId);
  const prompt = buildChatPrompt({ lang, messages: history });

  // ✅ AI call (main)
  const aiResult = await runAI({
    mode: "chat",
    lang,
    requestId,
    prompt,
  });

  const rawText = extractAIText(aiResult?.output ? aiResult : aiResult);
  let answer = s(rawText).trim() || (lang === "fa" ? "پاسخی دریافت نشد." : "No response received.");

  await appendMsg(threadId, { role: "assistant", content: answer, editedFromMessageId: null });

  try { await setLastAssistant(threadId, answer); } catch {}
  try { await setThreadTitleIfEmpty(threadId, message, lang); } catch {}

  const thread = await getThread(threadId);
  return { ok: true, markdown: answer, output: answer, thread, regenCount: Number(thread?.regenCount || 0) };
}

/* =========================
   THREAD MESSAGE ENDPOINT (UI)
========================= */
router.post("/threads/:threadId/messages", chatLimiter, async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  const lang = normLang(req.body?.lang);
  const message = s(req.body?.message).trim();
  const regenerate = Boolean(req.body?.regenerate);
  const editedFromMessageId = req.body?.editedFromMessageId ? s(req.body.editedFromMessageId) : null;

  if (!threadId) return res.status(400).json({ ok: false, error: { code: "MISSING_THREAD_ID", requestId: req.requestId } });
  if (!isValidId(threadId)) return res.status(400).json({ ok: false, error: { code: "INVALID_THREAD_ID", requestId: req.requestId } });

  try {
    const thread = await getThread(threadId);
    if (!thread) return res.status(404).json({ ok: false, error: { code: "THREAD_NOT_FOUND", requestId: req.requestId } });

    if (!regenerate) {
      if (!message) return res.status(400).json({ ok: false, error: { code: "EMPTY_MESSAGE", requestId: req.requestId } });
      if (message.length > MAX_INPUT_CHARS) {
        return res.status(413).json({ ok: false, error: { code: "MESSAGE_TOO_LARGE", requestId: req.requestId } });
      }
    }

    const result = await runChatOnce({ threadId, lang, message, regenerate, editedFromMessageId, requestId: req.requestId });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "CHAT_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

/* =========================
   LEGACY ENDPOINT
   POST /api/chat
========================= */
router.post("/", chatLimiter, async (req, res) => {
  const lang = normLang(req.body?.lang);
  const message = s(req.body?.message).trim();

  const incomingThreadId = s(req.body?.threadId || req.body?.sessionId || "").trim();
  const title = s(req.body?.title || "").trim();

  if (!message) return res.status(400).json({ ok: false, error: { code: "EMPTY_MESSAGE", requestId: req.requestId } });
  if (message.length > MAX_INPUT_CHARS) return res.status(413).json({ ok: false, error: { code: "MESSAGE_TOO_LARGE", requestId: req.requestId } });

  try {
    let threadId = incomingThreadId;

    if (!threadId || !isValidId(threadId)) {
      const th = await createThread({ lang, title });
      threadId = th?._id;
    } else {
      const exists = await getThread(threadId);
      if (!exists) {
        const th = await createThread({ lang, title });
        threadId = th?._id;
      }
    }

    const result = await runChatOnce({
      threadId,
      lang,
      message,
      regenerate: false,
      editedFromMessageId: null,
      requestId: req.requestId,
    });

    return res.json({
      ok: true,
      threadId,
      sessionId: threadId,
      markdown: result.markdown,
      output: result.output,
      thread: result.thread,
      retention: retentionInfo(),
      regenCount: result.regenCount,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "CHAT_FAILED", message: s(e?.message), requestId: req.requestId },
    });
  }
});

export default router;

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
 * supports:
 * 1) appendMessage(threadId, role, content, meta)
 * 2) appendMessage(threadId, {role, content, ...})
 * 3) appendMessage({threadId, role, content, ...})
 */
async function appendMsg(threadId, { role, content, editedFromMessageId }) {
  const tid = s(threadId).trim();
  const r = s(role).trim();
  const c = typeof content === "string" ? content : s(content);
  const meta = { editedFromMessageId: editedFromMessageId || null };

  // Variant 1
  try {
    return await appendMessage(tid, r, c, meta);
  } catch {}

  // Variant 2
  try {
    return await appendMessage(tid, { role: r, content: c, ...meta });
  } catch {}

  // Variant 3
  return await appendMessage({ threadId: tid, role: r, content: c, ...meta });
}

/**
 * ✅ Extract a displayable string from any AI result shape
 * prevents saving "[object Object]"
 */
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

const MAX_INPUT_CHARS = Number(process.env.CHAT_MAX_CHARS || 32000);
const MAX_HISTORY_MESSAGES = Number(process.env.CHAT_MAX_HISTORY_MESSAGES || 18);

const chatLimiter = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.CHAT_RATE_MAX || 30),
});

/* =========================
   CHAT PROMPT (NOT GENERATOR)
========================= */
function buildChatPrompt({ lang = "fa", messages = [] } = {}) {
  const fa = lang !== "en";

  const system = fa
    ? `تو «CCG Chat» هستی.
قواعد:
- این مسیر فقط «چت معمولی» است، نه Command Generator.
- خروجی را مثل فرم generator (✅ دستور اصلی/هشدار/جایگزین) تولید نکن.
- اگر کاربر small-talk گفت (مثل: خوبی؟ مرسی)، طبیعی و کوتاه جواب بده.
- اگر سؤال فنی/DevOps/Linux بود، مرحله‌ای پاسخ بده و اگر لازم شد دستور بده.
- چیزی را از خودت نساز؛ اگر اطلاعات لازم داری سوال دقیق بپرس.`
    : `You are "CCG Chat".
Rules:
- This endpoint is plain chat, NOT the command generator.
- Do NOT output generator template sections.
- For small talk, answer naturally and briefly.
- For technical questions, answer step-by-step; include commands only when needed.
- Do not invent logs/files; ask targeted questions if needed.`;

  const convo = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => `${String(m.role || "").toUpperCase()}:\n${s(m.content)}`)
    .join("\n\n");

  return `SYSTEM:\n${system}\n\nCONVERSATION:\n${convo}\n\nAssistant:\n`;
}

function looksLikeGeneratorJson(text = "") {
  const raw = s(text).trim();
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    const tool = parsed && typeof parsed === "object" ? parsed.tool : null;
    return !!(tool && typeof tool === "object" && (tool.primary || tool.alternatives || tool.command || tool.pythonScript));
  } catch {
    return false;
  }
}

function buildChatRepairPrompt({ lang = "fa", badOutput = "", lastUserMessage = "" } = {}) {
  const fa = lang !== "en";
  if (fa) {
    return [
      "خروجی قبلی اشتباه بوده و به فرمت جنریتور برگشته است.",
      "فقط یک پاسخ چت فنی معمولی برگردان (Markdown عادی، بدون JSON).",
      "حوزه مجاز: تحلیل خطا/لاگ + راه‌حل مرحله‌ای، یا تحلیل/توضیح کد و اسکریپت.",
      "اگر پیام کاربر خارج از این حوزه است، خیلی کوتاه بگو فقط همین حوزه‌ها پشتیبانی می‌شود.",
      "",
      "پیام آخر کاربر:",
      s(lastUserMessage).trim() || "(خالی)",
      "",
      "خروجی اشتباه قبلی:",
      s(badOutput).trim(),
    ].join("\n");
  }

  return [
    "The previous output was wrong and used generator JSON format.",
    "Return only a normal technical chat response (plain Markdown, no JSON).",
    "Allowed scope: error/log analysis with step-by-step fixes, or code/script analysis and explanation.",
    "If user request is out of scope, briefly say only these scopes are supported.",
    "",
    "Last user message:",
    s(lastUserMessage).trim() || "(empty)",
    "",
    "Bad previous output:",
    s(badOutput).trim(),
  ].join("\n");
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
   CHAT SEND
========================= */
async function buildHistory(threadId) {
  const raw = await safeCall(getMessages, [threadId, { limit: 500 }], [threadId]);
  const msgs = Array.isArray(raw) ? raw : raw?.messages || [];
  return msgs.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content }));
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

  const history = await buildHistory(threadId);
  const prompt = buildChatPrompt({ lang, messages: history });

  // ✅ AI call (may return string or object)
  const aiResult = await runAI(prompt, { mode: "chat", lang, requestId });

  // ✅ Extract real text and DO NOT run generator formatter here
  const rawText = extractAIText(aiResult);

  // ✅ Plain chat markdown/text
  let answer = s(rawText).trim() || (lang === "fa" ? "پاسخی دریافت نشد." : "No response received.");

  // اگر به هر دلیل شبیه JSON جنریتور شد، یک بار repair کنیم (اختیاری اما امن)
  if (looksLikeGeneratorJson(answer)) {
    const repair = await runAI(buildChatRepairPrompt({ lang, badOutput: answer, lastUserMessage: message }), {
      mode: "chat",
      lang,
      requestId,
    });
    const repaired = s(extractAIText(repair)).trim();
    if (repaired && !looksLikeGeneratorJson(repaired)) {
      answer = repaired;
    }
  }

  await appendMsg(threadId, { role: "assistant", content: answer, editedFromMessageId: null });

  try {
    await setLastAssistant(threadId, answer);
  } catch {}

  try {
    await setThreadTitleIfEmpty(threadId, message, lang);
  } catch {}

  const thread = await getThread(threadId);
  return { ok: true, markdown: answer, output: answer, thread, regenCount: Number(thread?.regenCount || 0) };
}

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
      if (message.length > MAX_INPUT_CHARS)
        return res.status(413).json({ ok: false, error: { code: "MESSAGE_TOO_LARGE", requestId: req.requestId } });
    }

    const result = await runChatOnce({ threadId, lang, message, regenerate, editedFromMessageId, requestId: req.requestId });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: { code: "CHAT_FAILED", message: s(e?.message), requestId: req.requestId } });
  }
});

export default router;
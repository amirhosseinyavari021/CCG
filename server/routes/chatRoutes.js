// server/routes/chatRoutes.js
import express from "express";
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

// Safe-call wrapper (تا اگر signature توی store فرق داشت، کمتر بشکنه)
async function callMaybe(fn, argsObj, argsAlt) {
  try {
    return await fn(argsObj);
  } catch {
    return await fn(argsAlt);
  }
}

const MAX_INPUT_CHARS = Number(process.env.CHAT_MAX_CHARS || 32000);
const MAX_HISTORY_MESSAGES = Number(process.env.CHAT_MAX_HISTORY_MESSAGES || 20);

const chatLimiter = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.CHAT_RATE_MAX || 30),
});

/* =========================
   PROMPT BUILDER
========================= */
function buildChatPrompt({ lang = "fa", messages = [] } = {}) {
  const fa = lang !== "en";

  const system = fa
    ? `
تو «CCG Technical Assistant» هستی.

ماموریت:
- تحلیل ارور و لاگ
- تحلیل و بهبود کد
- راه‌حل عملی و مرحله‌ای

قوانین:
- پاسخ‌ها کوتاه، کاربردی و حرفه‌ای.
- اگر پروژه بزرگ خواسته شد، ابتدا معماری و ساختار فایل‌ها را بده، سپس مرحله‌ای ادامه بده.
- اگر خارج از حوزه فنی بود، خیلی کوتاه رد کن.
- اگر اطلاعات کم بود، حداکثر 3 سؤال دقیق بپرس.
- هرگز خروجی بیش‌ازحد حجیم تولید نکن؛ مرحله‌ای پیش برو.

خروجی فقط Markdown.
`
    : `
You are CCG Technical Assistant.

Mission:
- Analyze logs/errors
- Improve and explain code
- Provide practical step-by-step fixes

Rules:
- Keep responses practical and concise.
- For large projects, provide architecture first, then continue step-by-step.
- If out of scope, briefly refuse.
- Ask up to 3 precise questions if needed.
- Avoid excessively large outputs; work incrementally.

Output pure Markdown.
`;

  const convo = messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}:\n${m.content}`)
    .join("\n\n");

  return `SYSTEM:\n${system}\n\nCONVERSATION:\n${convo}\n\nAssistant:\n`;
}


function extractGeneratorTool(text = "") {
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
      const parsed = JSON.parse(item);
      const tool = parsed && typeof parsed === "object" ? parsed.tool : null;
      if (tool && typeof tool === "object" && (tool.primary || tool.alternatives || tool.command || tool.pythonScript)) {
        return tool;
      }
    } catch {
      // keep trying
    }
  }

  return null;
}

function looksLikeGeneratorJson(text = "") {
  return !!extractGeneratorTool(text);
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
   META / RETENTION
========================= */
router.get("/retention", (_req, res) => {
  return res.json({
    ok: true,
    ...retentionInfo(),
  });
});

/* =========================
   THREADS API (برای UI)
   مطابق aiService.js:
   GET    /api/chat/threads
   POST   /api/chat/threads
   GET    /api/chat/threads/:id/messages
   PATCH  /api/chat/threads/:id
   DELETE /api/chat/threads/:id
========================= */

// list threads
router.get("/threads", async (req, res) => {
  const lang = normLang(req.query.lang);

  try {
    // بعضی storeها listThreads({lang}) دارند، بعضی listThreads(lang)
    const r = await callMaybe(listThreads, { lang }, lang);

    const threads = Array.isArray(r?.threads) ? r.threads : Array.isArray(r) ? r : [];
    return res.json({ ok: true, threads });
  } catch (e) {
    return res.status(500).json({ ok: false, error: { code: "THREADS_LIST_FAILED", requestId: req.requestId } });
  }
});

// create thread
router.post("/threads", async (req, res) => {
  const body = req.body || {};
  const lang = normLang(body.lang);
  const title = s(body.title).trim();

  try {
    const thread = await createThread({ lang, title });
    return res.json({ ok: true, thread });
  } catch {
    return res.status(500).json({ ok: false, error: { code: "THREAD_CREATE_FAILED", requestId: req.requestId } });
  }
});

// get messages
router.get("/threads/:threadId/messages", async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  if (!threadId) return res.status(400).json({ ok: false });

  try {
    const thread = await getThread(threadId);
    if (!thread) return res.status(404).json({ ok: false });

    const messages = await getMessages(threadId, { limit: 500 });
    return res.json({ ok: true, thread, messages: messages || [] });
  } catch {
    return res.status(500).json({ ok: false, error: { code: "MESSAGES_GET_FAILED", requestId: req.requestId } });
  }
});

// rename thread
router.patch("/threads/:threadId", async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  const title = s(req.body?.title).trim().slice(0, 80);

  if (!threadId || !title) return res.status(400).json({ ok: false });

  try {
    const r = await renameThread(threadId, title);
    const thread = r?.thread || (await getThread(threadId));
    return res.json({ ok: true, thread });
  } catch {
    return res.status(500).json({ ok: false, error: { code: "THREAD_RENAME_FAILED", requestId: req.requestId } });
  }
});

// delete thread
router.delete("/threads/:threadId", async (req, res) => {
  const threadId = s(req.params.threadId).trim();
  if (!threadId) return res.status(400).json({ ok: false });

  try {
    await deleteThread(threadId);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: { code: "THREAD_DELETE_FAILED", requestId: req.requestId } });
  }
});

/* =========================
   MAIN CHAT ENDPOINT
   POST /api/chat
========================= */
router.post("/", chatLimiter, async (req, res) => {
  const body = req.body || {};
  const lang = normLang(body.lang);

  const message = s(body.message).trim();
  const regenerate = body.regenerate === true;

  if (!regenerate && message.length > MAX_INPUT_CHARS) {
    return res.status(413).json({ ok: false });
  }

  let threadId = s(body.threadId || body.sessionId || "").trim();
  let th = threadId ? await getThread(threadId) : null;

  if (!th) {
    const created = await createThread({ lang, title: "" });
    th = created;
    threadId = String(created._id);
  }

  if (regenerate) {
    const rr = await bumpRegen(threadId);
    if (!rr?.ok) return res.status(429).json({ ok: false });

    await popTrailingAssistant(threadId);
  } else {
    if (!message) return res.status(400).json({ ok: false });

    await appendMessage(threadId, "user", message);
    await resetRegen(threadId);

    const history0 = await getMessages(threadId, { limit: MAX_HISTORY_MESSAGES });
    if ((history0 || []).filter((m) => m.role === "user").length === 1) {
      await setThreadTitleIfEmpty(threadId, message.slice(0, 44));
    }
  }

  const history = await getMessages(threadId, { limit: MAX_HISTORY_MESSAGES });

  const prompt = buildChatPrompt({
    lang,
    messages: (history || []).map((m) => ({ role: m.role, content: m.content })),
  });

  try {
    const ai = await runAI({
      mode: "chat",
      lang,
      prompt,
      requestId: req.requestId,
    });

    if (ai?.error) {
      return res.status(502).json({ ok: false });
    }

    let output = String(ai.output || "").trim();

    if (looksLikeGeneratorJson(output)) {
      const repair = await runAI({
        mode: "chat",
        lang,
        prompt: buildChatRepairPrompt({ lang, badOutput: output, lastUserMessage: message }),
        requestId: req.requestId,
      });
      const repaired = String(repair?.output || "").trim();
      if (repaired && !looksLikeGeneratorJson(repaired)) {
        output = repaired;
      } else if (looksLikeGeneratorJson(output)) {
        output =
          lang === "fa"
            ? "متوجه شدم. لطفاً خطا/لاگ یا تکه کد/اسکریپت را بفرست تا مرحله‌به‌مرحله تحلیل و رفعش کنیم."
            : "Got it. Please share the error/log or code/script snippet so we can analyze and fix it step by step.";
      }
    }

    const saved = await appendMessage(threadId, "assistant", output);
    await setLastAssistant(threadId, saved?._id || null);

    const updatedTh = await getThread(threadId);

    return res.json({
      ok: true,
      threadId,
      sessionId: threadId,
      markdown: output,
      retention: retentionInfo(),
      threadTTL: {
        retentionDays: retentionInfo().retentionDays,
        expiresAt: updatedTh?.expiresAt,
      },
      regenCount: Number(updatedTh?.regenCount || 0),
    });
  } catch {
    return res.status(500).json({ ok: false });
  }
});

export default router;

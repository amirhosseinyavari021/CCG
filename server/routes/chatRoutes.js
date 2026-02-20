import express from "express";
import { runAI } from "../utils/aiClient.js";
import {
  createSession,
  getSession,
  appendMessage,
  popTrailingAssistant,
  getLastUserMessage,
  sessionTTLInfo,
} from "../utils/chatStore.js";

const router = express.Router();

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

const MAX_CHARS = Number(process.env.CHAT_MAX_CHARS || 32000);

function sanitizeMarkdown(out = "") {
  let t = String(out || "").trim();
  if (!t) return "";

  t = t.replace(/^\s*MARKDOWN\s*\n+/i, "");
  t = t.replace(/^```markdown\s*\n/i, "");
  t = t.replace(/\n```$/i, "");

  const m = t.match(/^```markdown\s*\n([\s\S]*?)\n```$/i);
  if (m && m[1]) t = m[1].trim();

  return t.trim();
}

function buildChatPrompt({ lang = "fa", messages = [] } = {}) {
  const fa = lang !== "en";

  const system = fa
    ? `
تو «CCG Technical Assistant» هستی.

فقط دو کار انجام می‌دهی:
1) تحلیل ارور/لاگ
2) تحلیل کد/اسکریپت

اگر سوال خارج از این محدوده بود:
خیلی کوتاه و محترمانه بگو خارج از محدوده است
و از کاربر بخواه لاگ یا کد مرتبط ارسال کند.

خروجی فقط Markdown خالص باشد.
هرگز از \`\`\`markdown استفاده نکن.
هرگز کلمه MARKDOWN چاپ نکن.
`
    : `
You are CCG Technical Assistant.

You ONLY do:
1) Error/log analysis
2) Code/script analysis

If user is out of scope:
Briefly refuse and ask for relevant log/code.

Output MUST be pure Markdown.
Never wrap in \`\`\`markdown.
Never print MARKDOWN header.
`;

  const convo = messages
    .slice(-20)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}:\n${m.content}`)
    .join("\n\n");

  return `SYSTEM:\n${system}\n\nCONVERSATION:\n${convo}\n\nAssistant:\n`;
}

router.post("/", async (req, res) => {
  const body = req.body || {};
  const lang = s(body.lang).toLowerCase() === "en" ? "en" : "fa";
  const message = s(body.message).trim();
  const regenerate = body.regenerate === true;

  if (message.length > MAX_CHARS) {
    return res.status(413).json({
      ok: false,
      error: { code: "PAYLOAD_TOO_LARGE" },
    });
  }

  let sessionId = s(body.sessionId).trim();
  let sess = sessionId ? getSession(sessionId) : null;

  if (!sess) {
    const created = createSession({ lang });
    sessionId = created.sessionId;
    sess = getSession(sessionId);
  }

  if (regenerate) {
    popTrailingAssistant(sessionId);
  } else {
    appendMessage(sessionId, "user", message);
  }

  sess = getSession(sessionId);

  const prompt = buildChatPrompt({
    lang,
    messages: sess.messages,
  });

  try {
    const ai = await runAI({
      mode: "chat",
      lang,
      prompt,
      requestId: req.requestId,
    });

    if (ai?.error) {
      return res.status(502).json({
        ok: false,
        error: { code: "AI_ERROR", message: ai.error },
        sessionId,
      });
    }

    const output = sanitizeMarkdown(ai.output || "");

    appendMessage(sessionId, "assistant", output);

    return res.json({
      ok: true,
      sessionId,
      markdown: output,
      sessionTTL: sessionTTLInfo(sessionId),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "SERVER_ERROR", message: e.message },
      sessionId,
    });
  }
});

export default router;

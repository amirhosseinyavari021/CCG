// server/routes/chatRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { createSession, getSession, appendMessage, updateProfile } from "../utils/chatStore.js";

const router = express.Router();

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

/* ===============================
   SCOPE FILTER (BEFORE AI CALL)
================================= */

function isTechnicalMessage(text = "") {
  const t = text.toLowerCase();

  const technicalKeywords = [
    "error",
    "exception",
    "stack",
    "trace",
    "permission",
    "denied",
    "failed",
    "build",
    "compile",
    "vite",
    "npm",
    "node",
    "docker",
    "kubernetes",
    "bash",
    "linux",
    "devops",
    "log",
    "warning",
    "timeout",
    "refused",
    "eacces",
    "unlink",
    "sudo",
    "chmod",
    "chown",
    "script",
    "code",
    "function",
    "class"
  ];

  if (t.includes("```")) return true;

  return technicalKeywords.some(k => t.includes(k));
}

/* =============================== */

router.post("/", async (req, res) => {
  const body = req.body || {};
  const message = s(body.message).trim();

  if (!message) {
    return res.status(400).json({ ok: false, error: "EMPTY_MESSAGE" });
  }

  if (!isTechnicalMessage(message)) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "OUT_OF_SCOPE",
        userMessage:
          "❌ این دستیار فقط برای تحلیل ارور، لاگ و کدهای فنی طراحی شده است.",
        hint:
          "یک خطای واقعی، لاگ، یا قطعه کد ارسال کن تا تحلیل شود."
      }
    });
  }

  // ====== SESSION ======
  let sessionId = body.sessionId;
  let sess = sessionId ? getSession(sessionId) : null;

  if (!sess) {
    const created = createSession({ lang: body.lang || "fa" });
    sessionId = created.sessionId;
    sess = getSession(sessionId);
  }

  appendMessage(sessionId, "user", message);

  const ai = await runAI({
    mode: "chat",
    lang: body.lang || "fa",
    user_request: message
  });

  if (ai?.error) {
    return res.status(502).json({ ok: false, error: "AI_ERROR" });
  }

  appendMessage(sessionId, "assistant", ai.output);

  return res.json({
    ok: true,
    sessionId,
    markdown: ai.output
  });
});

export default router;

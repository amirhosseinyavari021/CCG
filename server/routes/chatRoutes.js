// server/routes/chatRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { createSession, getSession, appendMessage, updateProfile } from "../utils/chatStore.js";
import { formatOutput } from "../utils/outputFormatter.js";

const router = express.Router();

/**
 * Match ccgRoutes context style: [context k=v | ...]
 * (Keeps prompt behavior consistent with existing system)
 */
function buildContext(profile = {}) {
  const b = (profile && typeof profile === "object") ? profile : {};
  const parts = [];
  if (b.outputType) parts.push(`outputType=${String(b.outputType)}`);
  if (b.knowledgeLevel) parts.push(`knowledgeLevel=${String(b.knowledgeLevel)}`);
  if (b.modeStyle) parts.push(`modeStyle=${String(b.modeStyle)}`);
  if (b.platform) parts.push(`platform=${String(b.platform)}`);
  if (b.os) parts.push(`os=${String(b.os)}`);
  if (b.cli) parts.push(`cli=${String(b.cli)}`);
  if (b.vendor) parts.push(`vendor=${String(b.vendor)}`);
  if (b.deviceType) parts.push(`deviceType=${String(b.deviceType)}`);
  return parts.length ? `[context ${parts.join(" | ")}]` : "";
}

function buildChatUserRequest({ profile, messages, userMessage }) {
  const contextLine = buildContext(profile);

  const turns = (messages || []).map((m) => {
    const role = m.role === "assistant" ? "Assistant" : "User";
    return `${role}: ${String(m.content || "").trim()}`;
  }).filter(Boolean);

  // Keep it short & controlled (MAX_TURNS already applied in store)
  const convo = turns.join("\n");

  return [
    contextLine,
    "You are CCG Chat Mode: a helpful technical assistant.",
    "Rules:",
    "- Keep answers practical and action-oriented.",
    "- If outputType is 'command' or 'script', return the final command/script in a single bash code block.",
    "",
    "Conversation:",
    convo,
    `User: ${String(userMessage || "").trim()}`,
  ].filter(Boolean).join("\n");
}

function fallbackPrompt(vars) {
  // minimal fallback that won't crash if stored prompt fails
  return [
    "You are a helpful technical assistant.",
    `Language: ${vars.lang || "fa"}`,
    `OS: ${vars.os || "linux"}`,
    `CLI: ${vars.cli || "bash"}`,
    "",
    `User request:\n${vars.user_request || ""}`,
    "",
    "Answer concisely and accurately.",
  ].join("\n");
}

router.get("/ping", (req, res) => {
  res.json({ ok: true, service: "ccg-chat", ts: Date.now() });
});

router.post("/session", (req, res) => {
  const profile = req.body?.profile || req.body || {};
  const s = createSession(profile);
  return res.json({ ok: true, sessionId: s.sessionId, profile: s.profile });
});

router.post("/:sessionId", async (req, res) => {
  const rid = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

  try {
    const sessionId = String(req.params.sessionId || "").trim();
    const s = getSession(sessionId);
    if (!s) return res.status(404).json({ ok: false, error: "SESSION_NOT_FOUND" });

    // optional: profile patch on each message
    if (req.body?.profile && typeof req.body.profile === "object") {
      updateProfile(sessionId, req.body.profile);
    }

    const message = String(req.body?.message ?? req.body?.user_request ?? "").trim();
    if (!message) return res.status(400).json({ ok: false, error: "message is required" });

    appendMessage(sessionId, "user", message);

    const fresh = getSession(sessionId);
    const profile = fresh.profile || {};
    const msgs = fresh.messages || [];

    const user_request = buildChatUserRequest({
      profile,
      messages: msgs,
      userMessage: message,
    });

    const vars = {
      mode: profile.mode || "generate",
      cli: profile.cli || "bash",
      os: profile.os || "linux",
      lang: profile.lang || "fa",
      knowledgeLevel: profile.knowledgeLevel || "",
      outputType: profile.outputType || "markdown",
      modeStyle: profile.modeStyle || "",
      platform: profile.platform || "",
      vendor: profile.vendor || "",
      deviceType: profile.deviceType || "",
      user_request,
      // compare inputs (optional if future)
      input_a: String(req.body?.input_a ?? req.body?.codeA ?? ""),
      input_b: String(req.body?.input_b ?? req.body?.codeB ?? ""),
      error_message: String(req.body?.error_message ?? ""),
    };

    const ai = await runAI({ variables: vars, fallbackPrompt: fallbackPrompt(vars) });
    if (!ai?.ok) {
      return res.status(200).json({ ok: false, error: "AI_ERROR", detail: ai?.error || null });
    }

    const rawOut = String(ai.output || "").trim();
    const out = formatOutput({ outputType: profile.outputType, text: rawOut, fenceLang: profile.cli === "powershell" ? "powershell" : "bash" });

    appendMessage(sessionId, "assistant", out);

    const ms = Date.now() - t0;
    return res.json({
      ok: true,
      sessionId,
      output: out,
      result: out, // compatibility
      rid,
      ms,
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    return res.status(500).json({ ok: false, error: "ROUTE_ERROR", detail: msg });
  }
});

export default router;

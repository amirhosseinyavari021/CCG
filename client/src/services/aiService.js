const API_BASE = (import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "");

// client/src/services/aiService.js
// ✅ Stable client API wrapper for CCG
// Normalizes backend response shapes so UI never shows [object Object].

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  let data = null;
  if (ct.includes("application/json")) data = await res.json();
  else data = { ok: false, error: await res.text() };

  if (!res.ok || data?.ok === false) {
    const msg = data?.error || data?.message || "API error";
    throw new Error(msg);
  }
  return normalizeCCGResponse(data);
}

function _tryParseToolJson(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (!(t.startsWith("{") && t.endsWith("}"))) return null;
  try {
    const obj = JSON.parse(t);
    const tool = (obj && typeof obj.tool === "object") ? obj.tool : obj;
    if (!tool || typeof tool !== "object") return null;
    if (!tool.primary || typeof tool.primary !== "object") return null;
    if (typeof tool.primary.command !== "string") return null;
    return tool;
  } catch {
    return null;
  }
}

function _toolToMarkdown(tool, variant = "tool") {
  const lang = String(tool?.primary?.lang || "bash").trim() || "bash";
  const cmd  = String(tool?.primary?.command || "").trim() || 'echo "No command produced"';

  const parts = [];
  parts.push("```" + lang + "\n" + cmd + "\n```");

  if (variant === "tool") {
    const exp = String(tool?.explanation || "").trim();
    if (exp) parts.push("\n## توضیح\n" + exp);
  }

  const warnings = Array.isArray(tool?.warnings)
    ? tool.warnings.map(x => String(x || "").trim()).filter(Boolean)
    : [];
  if (warnings.length) {
    parts.push("\n## هشدارها\n" + warnings.map(w => "- " + w).join("\n"));
  }

  const altsIn = Array.isArray(tool?.alternatives) ? tool.alternatives : [];
  const alts = [];
  for (const a of altsIn) {
    const c = String(a?.command || "").trim();
    if (!c) continue;
    const note = String(a?.note || "").trim();
    alts.push({ command: c, note });
  }
  if (alts.length) {
    const blocks = alts.map(a => {
      const head = a.note ? `- ${a.note}\n\n` : "";
      return `${head}\`\`\`${lang}\n${a.command}\n\`\`\``;
    }).join("\n\n");
    parts.push("\n## جایگزین‌ها\n" + blocks);
  }

  return parts.join("\n\n") + "\n";
}

function normalizeCCGResponse(data) {
  // Backend contract (expected):
  // - output: markdown string
  // - tool: object|null
  // But sometimes AI/tool JSON leaks into output as a JSON string.
  const rawOut =
    (typeof data?.output === "string" && data.output.trim()) ? data.output :
    (typeof data?.markdown === "string" && data.markdown.trim()) ? data.markdown :
    (typeof data?.result === "string" && data.result.trim()) ? data.result :
    "";

  let tool = (data && typeof data.tool === "object") ? data.tool : null;
  let md = rawOut;

  // ✅ If tool missing but output is actually tool-json => parse it
  if (!tool) {
    const parsedTool = _tryParseToolJson(rawOut);
    if (parsedTool) {
      tool = parsedTool;
      // default: render as "tool" style unless caller used command mode
      const variant = (String(data?.outputType || "").toLowerCase() === "command") ? "command" : "tool";
      md = _toolToMarkdown(tool, variant);
    }
  }

  // ✅ If tool exists but output accidentally equals JSON string, rebuild markdown
  
  if (tool && rawOut.trim().startsWith("{")) {
    const variant = (String(data?.outputType || "").toLowerCase() === "command") ? "command" : "tool";
    md = _toolToMarkdown(tool, variant);
  }

  return { ...data, tool, markdown: md, output: md };
}

export async function callCCG(payload) {
  const data = await postJSON("/api/ccg", payload);
  return normalizeCCGResponse(data);
}
// -------------------------------
// CCG_CHAT_SERVICE_V1
// - ChatPage.jsx expects these exports.
// - Will use /api/chat/* if present; otherwise fallback to /api/ccg.
// -------------------------------

async function _safeJson(resp) {
  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await resp.json();
  const t = await resp.text().catch(()=> "");
  return { ok: false, error: t?.slice(0, 500) || "Non-JSON response" };
}

async function _postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await _safeJson(resp);
  return { resp, data };
}

function _normalizeText(data) {
  // keep compatibility with different shapes
  const text =
    (typeof data?.markdown === "string" && data.markdown) ||
    (typeof data?.result === "string" && data.result) ||
    (typeof data?.output === "string" && data.output) ||
    "";
  return {
    ...data,
    markdown: text,
    result: text,
    output: text,
  };
}

/**
 * chatCreateSession(payload?)
 * Returns: { ok, sessionId, ... } (best-effort)
 */
export async function chatCreateSession(payload = {}) {
  // 1) Try dedicated chat endpoint (if exists)
  try {
    const { resp, data } = await _postJson("/api/chat/session", payload);
    if (resp.ok && data && (data.sessionId || data.id)) {
      return { ok: true, sessionId: data.sessionId || data.id, ...data };
    }
    // If endpoint exists but returns app-error, surface it
    if (resp.status !== 404 && data?.error) {
      throw new Error(data.error);
    }
    // else fall through to fallback
  } catch (e) {
    // if not 404 or network error -> fallback anyway (don’t break UI)
  }

  // 2) Fallback: generate a local-ish session id (ChatPage can store it)
  const sid = "local_" + Math.random().toString(36).slice(2, 10);
  return { ok: true, sessionId: sid, fallback: true };
}

/**
 * chatSendMessage({ sessionId, message, ...context })
 * Returns normalized { ok, markdown/result/output, tool? }
 */
export async function chatSendMessage(payload = {}) {
  const msg =
    payload?.message ??
    payload?.text ??
    payload?.user_request ??
    payload?.userRequest ??
    "";
  const sessionId = payload?.sessionId ?? payload?.sid ?? "";

  // 1) Try dedicated chat endpoint first
  try {
    const { resp, data } = await _postJson("/api/chat/message", { ...payload, message: msg, sessionId });
    if (resp.ok && data) return _normalizeText(data);
    if (resp.status !== 404) {
      const err = data?.error || data?.message || "Chat API error";
      throw new Error(err);
    }
  } catch (e) {
    // fallback below
  }

  // 2) Fallback to /api/ccg
  // Prefer mode:"chat" but if backend only knows generate, it will still work
  const ccgPayload = {
    mode: "chat",
    user_request: String(msg || "").trim(),
    lang: payload?.lang || "fa",
    platform: payload?.platform,
    os: payload?.os,
    cli: payload?.cli,
    outputType: payload?.outputType || "markdown",
    verbosity: payload?.verbosity || "normal",
    // keep sessionId in payload so backend can use it later if you add support
    sessionId,
  };

  const res = await callCCG(ccgPayload);
  return _normalizeText(res);
}

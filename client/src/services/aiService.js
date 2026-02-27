// client/src/services/aiService.js
import { withBase } from "../config/api";

/**
 * Small helper: create a consistent error object
 */
function toError(status, data) {
  const e = new Error(data?.error?.message || data?.message || "REQUEST_FAILED");
  e.status = status;
  e.data = data;
  return e;
}

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function asStr(x, d = "") {
  if (x === null || x === undefined) return d;
  if (typeof x === "string") return x;
  try {
    return String(x);
  } catch {
    return d;
  }
}

function pickFirstString(obj, keys, d = "") {
  if (!isPlainObject(obj)) return d;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return d;
}

/**
 * Fetch JSON with timeout + AbortSignal support.
 * - If caller passes `signal`, we respect it.
 * - We also enforce `timeoutMs` via an internal AbortController.
 */
async function fetchJSON(url, { method = "GET", body, timeoutMs = 60_000, signal, headers } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(new DOMException("Timeout", "AbortError")), timeoutMs);

  // If user passed an AbortSignal, abort our controller when user aborts
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason || new DOMException("Aborted", "AbortError"));
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // keep raw text if not JSON
      data = { raw: text };
    }

    if (!res.ok) throw toError(res.status, data);
    return data;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Normalize CCG response so UI always has something usable.
 * We try to support different server shapes:
 * - { ok:true, markdown:"...", commands:[...], moreCommands:[...] }
 * - { ok:true, result:{...} }
 * - { analysisText, mergeCode, mergeLang } for comparator-ish
 * - { primary_command:"...", alternatives:[...], notes:"..." }
 */
function normalizeCCGResponse(raw) {
  const top = isPlainObject(raw) ? raw : {};
  const data = isPlainObject(top.result) ? top.result : top; // support {result:{...}}

  // Common textual fields
  const markdown =
    pickFirstString(data, ["markdown", "output", "result", "text", "message"], "") ||
    pickFirstString(top, ["markdown", "output", "result"], "");

  // Commands can come in different shapes
  const primaryDirect =
    pickFirstString(data, ["primary_command", "primaryCommand", "command", "cmd", "script"], "") ||
    pickFirstString(top, ["primary_command", "primaryCommand", "command", "cmd", "script"], "");

  // If server already returns commands arrays
  const commandsArr = Array.isArray(data.commands) ? data.commands : Array.isArray(top.commands) ? top.commands : null;
  const moreArr = Array.isArray(data.moreCommands)
    ? data.moreCommands
    : Array.isArray(top.moreCommands)
      ? top.moreCommands
      : null;

  // If comparator returns mergeCode
  const mergeCode =
    pickFirstString(data, ["mergeCode", "merge_code", "merge"], "") || pickFirstString(top, ["mergeCode", "merge_code", "merge"], "");
  const mergeLang =
    pickFirstString(data, ["mergeLang", "merge_lang", "lang"], "") || pickFirstString(top, ["mergeLang", "merge_lang", "lang"], "");

  // Notes/explanation can be array or string in some client versions
  // We'll force them into strings to avoid UI printing `[]`.
  const notesMaybe = data.notes ?? top.notes;
  const notes =
    typeof notesMaybe === "string" ? notesMaybe : Array.isArray(notesMaybe) ? notesMaybe.filter(Boolean).join("\n") : "";

  const explanationMaybe = data.explanation ?? top.explanation;
  const explanation =
    typeof explanationMaybe === "string"
      ? explanationMaybe
      : Array.isArray(explanationMaybe)
        ? explanationMaybe.filter(Boolean).join("\n")
        : "";

  const warningsMaybe = data.warnings ?? top.warnings;
  const warnings =
    typeof warningsMaybe === "string" ? warningsMaybe : Array.isArray(warningsMaybe) ? warningsMaybe.filter(Boolean).join("\n") : "";

  // Build commands in a predictable way for GeneratorPage parsing:
  // Prefer array, otherwise create from primaryDirect / mergeCode
  const normalizedCommands = [];
  if (commandsArr && commandsArr.length) normalizedCommands.push(...commandsArr);
  else if (primaryDirect) normalizedCommands.push(primaryDirect);
  else if (mergeCode) normalizedCommands.push(mergeCode);

  const normalizedMore = [];
  if (moreArr && moreArr.length) normalizedMore.push(...moreArr);
  else if (Array.isArray(data.alternatives)) normalizedMore.push(...data.alternatives);
  else if (Array.isArray(top.alternatives)) normalizedMore.push(...top.alternatives);

  // Some pages check pythonScript / python_script
  const pythonScript =
    !!data.pythonScript || !!top.pythonScript || !!data.python_script || !!top.python_script || false;

  const python_script =
    pickFirstString(data, ["python_script", "pythonScript", "python"], "") ||
    pickFirstString(top, ["python_script", "pythonScript", "python"], "");

  return {
    ...top,
    ...data,
    ok: top.ok !== undefined ? top.ok : true,
    markdown: markdown || "",

    // generator-friendly
    commands: normalizedCommands,
    moreCommands: normalizedMore,

    // comparator-friendly
    mergeCode: mergeCode || "",
    mergeLang: mergeLang || "",

    // string-safe fields to avoid `[]` in UI
    notes: notes || "",
    explanation: explanation || "",
    warnings: warnings || "",

    pythonScript,
    python_script: python_script || "",
  };
}

/**
 * --------- Public API (exports) ----------
 */

export async function callCCG(payload, opts = {}) {
  // server route seen in logs: POST /api/ccg
  const url = withBase("/api/ccg");
  const raw = await fetchJSON(url, {
    method: "POST",
    body: payload || {},
    timeoutMs: opts.timeoutMs ?? 90_000,
    signal: opts.signal,
    headers: opts.headers,
  });
  return normalizeCCGResponse(raw);
}

/**
 * Chat endpoints (adjust if your server uses different routes)
 * Convention:
 * - GET    /api/chat/retention
 * - GET    /api/chat/threads
 * - POST   /api/chat/threads
 * - GET    /api/chat/threads/:threadId/messages
 * - PATCH  /api/chat/threads/:threadId
 * - DELETE /api/chat/threads/:threadId
 * - POST   /api/chat/threads/:threadId/messages
 */

export async function getChatRetention(opts = {}) {
  const url = withBase("/api/chat/retention");
  return fetchJSON(url, { method: "GET", timeoutMs: opts.timeoutMs ?? 30_000, signal: opts.signal });
}

export async function listChatThreads(opts = {}) {
  const url = withBase("/api/chat/threads");
  return fetchJSON(url, { method: "GET", timeoutMs: opts.timeoutMs ?? 30_000, signal: opts.signal });
}

export async function createChatThread(body = {}, opts = {}) {
  const url = withBase("/api/chat/threads");
  return fetchJSON(url, { method: "POST", body, timeoutMs: opts.timeoutMs ?? 30_000, signal: opts.signal });
}

export async function getChatMessages(threadId, opts = {}) {
  const id = encodeURIComponent(asStr(threadId));
  const url = withBase(`/api/chat/threads/${id}/messages`);
  return fetchJSON(url, { method: "GET", timeoutMs: opts.timeoutMs ?? 30_000, signal: opts.signal });
}

export async function renameChatThread(threadId, title, opts = {}) {
  const id = encodeURIComponent(asStr(threadId));
  const url = withBase(`/api/chat/threads/${id}`);
  return fetchJSON(url, {
    method: "PATCH",
    body: { title },
    timeoutMs: opts.timeoutMs ?? 30_000,
    signal: opts.signal,
  });
}

export async function deleteChatThread(threadId, opts = {}) {
  const id = encodeURIComponent(asStr(threadId));
  const url = withBase(`/api/chat/threads/${id}`);
  return fetchJSON(url, { method: "DELETE", timeoutMs: opts.timeoutMs ?? 30_000, signal: opts.signal });
}

export async function sendChatMessage(threadOrBody, bodyOrOpts = {}, maybeOpts = {}) {
  // Backward compatible signatures:
  // 1) sendChatMessage({ threadId, lang, message, regenerate }, opts)
  // 2) sendChatMessage(threadId, body, opts)
  const firstIsBody = isPlainObject(threadOrBody);

  const body = firstIsBody
    ? threadOrBody
    : {
        ...(isPlainObject(bodyOrOpts) ? bodyOrOpts : {}),
        threadId: asStr(threadOrBody),
      };

  const opts = firstIsBody ? (isPlainObject(bodyOrOpts) ? bodyOrOpts : {}) : maybeOpts;

  const url = withBase("/api/chat");
  const raw = await fetchJSON(url, {
    method: "POST",
    body,
    timeoutMs: opts.timeoutMs ?? 90_000,
    signal: opts.signal,
  });

  // Some UIs expect { markdown: "..."} at top-level
  if (isPlainObject(raw) && isPlainObject(raw.result) && raw.markdown === undefined && raw.result.markdown) {
    return { ...raw, markdown: raw.result.markdown };
  }
  return raw;
}

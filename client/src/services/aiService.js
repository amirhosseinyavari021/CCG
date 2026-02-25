// client/src/services/aiService.js
import { withBase } from "../config/api";

function toError(status, data) {
  const e = new Error(data?.error?.message || data?.message || "REQUEST_FAILED");
  e.status = status;
  e.data = data;
  return e;
}

async function fetchJSON(url, { method = "GET", body, timeoutMs = 60_000, signal } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort("timeout"), timeoutMs);

  const sig = signal
    ? (function mergeSignals(a, b) {
        // ساده‌ترین حالت: اگر یکی abort شد، اون یکی رو هم abort کنیم
        const c = new AbortController();
        const onAbort = () => c.abort();
        a.addEventListener("abort", onAbort, { once: true });
        b.addEventListener("abort", onAbort, { once: true });
        return c.signal;
      })(signal, controller.signal)
    : controller.signal;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: sig,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw toError(res.status, data);
    return data;
  } catch (err) {
    if (String(err?.name || "") === "AbortError" || String(err) === "timeout") {
      const e = new Error("REQUEST_TIMEOUT");
      e.status = 0;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/* =========================
   CCG (Generator / Compare)
========================= */

export async function callCCG(payload, opts = {}) {
  const data = await fetchJSON(withBase("/api/ccg"), {
    method: "POST",
    body: payload,
    timeoutMs: opts.timeoutMs || 60_000,
    signal: opts.signal,
  });

  // ✅ FIX: بعضی وقت‌ها بک‌اند با 200 جواب می‌دهد ولی ok:false می‌فرستد.
  // این حالت قبلاً “بی‌صدا” باعث خروجی خالی می‌شد. الان تبدیلش می‌کنیم به Error.
  if (data && typeof data === "object" && data.ok === false) {
    const msg =
      data?.error?.userMessage ||
      data?.error?.message ||
      (typeof data?.error === "string" ? data.error : "") ||
      data?.message ||
      "CCG_FAILED";

    const e = new Error(msg);
    e.status = Number(data?.status || 500) || 500;
    e.data = data;
    throw e;
  }

  return data;
}

/* =========================
   CHAT APIs
========================= */

export async function getChatRetention(opts = {}) {
  // چون سرور retention را همراه list threads هم می‌دهد، این را minimal نگه می‌داریم
  const r = await listChatThreads({ lang: "fa" }, opts).catch(() => null);
  return r?.retention || { retentionDays: 14 };
}

export async function listChatThreads({ lang } = {}, opts = {}) {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  return fetchJSON(withBase(`/api/chat/threads${q}`), { method: "GET", timeoutMs: opts.timeoutMs || 30_000, signal: opts.signal });
}

export async function createChatThread({ lang = "fa", title = "" } = {}, opts = {}) {
  return fetchJSON(withBase("/api/chat/threads"), { method: "POST", body: { lang, title }, timeoutMs: opts.timeoutMs || 30_000, signal: opts.signal });
}

export async function getChatMessages({ threadId } = {}, opts = {}) {
  if (!threadId) throw new Error("MISSING_THREAD_ID");
  return fetchJSON(withBase(`/api/chat/threads/${threadId}/messages`), { method: "GET", timeoutMs: opts.timeoutMs || 30_000, signal: opts.signal });
}

export async function renameChatThread({ threadId, title } = {}, opts = {}) {
  if (!threadId) throw new Error("MISSING_THREAD_ID");
  return fetchJSON(withBase(`/api/chat/threads/${threadId}`), {
    method: "PATCH",
    body: { title },
    timeoutMs: opts.timeoutMs || 30_000,
    signal: opts.signal,
  });
}

export async function pinChatThread({ threadId, pinned } = {}, opts = {}) {
  if (!threadId) throw new Error("MISSING_THREAD_ID");
  return fetchJSON(withBase(`/api/chat/threads/${threadId}`), {
    method: "PATCH",
    body: { pinned: Boolean(pinned) },
    timeoutMs: opts.timeoutMs || 30_000,
    signal: opts.signal,
  });
}

export async function deleteChatThread({ threadId } = {}, opts = {}) {
  if (!threadId) throw new Error("MISSING_THREAD_ID");
  return fetchJSON(withBase(`/api/chat/threads/${threadId}`), { method: "DELETE", timeoutMs: opts.timeoutMs || 30_000, signal: opts.signal });
}

export async function sendChatMessage(payload, opts = {}) {
  return fetchJSON(withBase("/api/chat"), { method: "POST", body: payload, timeoutMs: opts.timeoutMs || 120_000, signal: opts.signal });
}

export async function editChatMessage(payload, opts = {}) {
  return fetchJSON(withBase("/api/chat/edit"), { method: "POST", body: payload, timeoutMs: opts.timeoutMs || 120_000, signal: opts.signal });
}

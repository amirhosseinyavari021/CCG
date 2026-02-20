// client/src/services/aiService.js
import { withBase } from "../config/api";

function makeAbortable(opts = {}) {
  const externalSignal = opts?.signal;
  const timeoutMs = Number.isFinite(Number(opts?.timeoutMs)) ? Number(opts.timeoutMs) : 0;

  let controller = null;
  let timer = null;
  let abortCode = "";

  if (timeoutMs > 0) {
    controller = new AbortController();

    const abortWith = (code) => {
      abortCode = code;
      try {
        controller.abort(new Error(code));
      } catch {
        try {
          controller.abort();
        } catch {}
      }
    };

    const abortFromExternal = () => abortWith("REQUEST_ABORTED");

    if (externalSignal) {
      if (externalSignal.aborted) abortFromExternal();
      else externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }

    timer = setTimeout(() => abortWith("REQUEST_TIMEOUT"), timeoutMs);
  }

  return {
    signal: controller ? controller.signal : externalSignal,
    getAbortCode: () => abortCode,
    cleanup: () => {
      if (timer) clearTimeout(timer);
    },
  };
}

async function fetchJson(path, payload, opts = {}) {
  const { signal, cleanup, getAbortCode } = makeAbortable(opts);
  const url = withBase(path);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal,
    });

    if (res.status === 204) return {};

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let data = null;
    try {
      data = isJson ? await res.json() : await res.text();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const rawText = typeof data === "string" ? data.trim() : "";
      const isGatewayHtml =
        rawText.startsWith("<!DOCTYPE html") ||
        rawText.startsWith("<html") ||
        /<h1>\s*(502|504)\s+/i.test(rawText);

      const msg =
        (data &&
          typeof data === "object" &&
          (data?.error?.userMessage || data?.error?.message || data?.message || data?.error)) ||
        (isGatewayHtml
          ? "Gateway Timeout/Bad Gateway (Reverse Proxy)"
          : (typeof data === "string" && data.trim()) || `Request failed (${res.status})`);

      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    if (typeof data === "string") return { output: data };
    return data || {};
  } catch (e) {
    const name = e?.name || "";
    const msg = String(e?.message || "");
    const reason = getAbortCode?.() || "";

    const isAbort =
      name === "AbortError" ||
      msg.includes("REQUEST_TIMEOUT") ||
      msg.includes("REQUEST_ABORTED") ||
      msg.toLowerCase().includes("aborted");

    if (isAbort) {
      const code =
        msg.includes("REQUEST_ABORTED") || reason === "REQUEST_ABORTED"
          ? "REQUEST_ABORTED"
          : "REQUEST_TIMEOUT";
      const err = new Error(code);
      err.code = code;
      throw err;
    }

    throw e;
  } finally {
    cleanup();
  }
}

export async function callCCG(payload, opts = {}) {
  return fetchJson("/api/ccg", payload, opts);
}

export async function callChat(payload, opts = {}) {
  // ✅ chat may take longer on primary models
  const timeoutMs = Number.isFinite(Number(opts?.timeoutMs)) ? Number(opts.timeoutMs) : 180_000; // 3 min
  return fetchJson("/api/chat", payload, { ...opts, timeoutMs });
}

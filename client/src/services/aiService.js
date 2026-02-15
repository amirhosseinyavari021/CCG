// /home/cando/CCG/client/src/services/aiService.js

/**
 * callCCG(payload, { signal, timeoutMs })
 * - Supports AbortController via fetch signal (used for Cancel).
 * - Adds optional timeoutMs to prevent endless waits BUT configurable per mode.
 * - Returns parsed JSON on success.
 * - Throws Error with (status, data) on failure for richer UI messages.
 */
export async function callCCG(payload, opts = {}) {
  const externalSignal = opts?.signal;
  const timeoutMs = Number.isFinite(Number(opts?.timeoutMs)) ? Number(opts.timeoutMs) : 0;

  // Merge external abort signal + timeout into a single controller (if needed)
  let controller = null;
  let timer = null;

  if (timeoutMs > 0) {
    controller = new AbortController();

    const abortFromExternal = () => {
      try {
        controller.abort(new Error("REQUEST_ABORTED"));
      } catch {}
    };

    if (externalSignal) {
      if (externalSignal.aborted) abortFromExternal();
      else externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }

    timer = setTimeout(() => {
      try {
        controller.abort(new Error("REQUEST_TIMEOUT"));
      } catch {}
    }, timeoutMs);
  }

  const finalSignal = controller ? controller.signal : externalSignal;

  try {
    const res = await fetch("/api/ccg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: finalSignal,
    });

    // Some responses might be empty (e.g. 204)
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
      // If nginx returns HTML (504/502), keep it short but meaningful
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
    // Normalize abort/timeout errors for UI
    const name = e?.name || "";
    const msg = String(e?.message || "");

    const isAbort =
      name === "AbortError" ||
      msg.includes("REQUEST_TIMEOUT") ||
      msg.includes("REQUEST_ABORTED") ||
      msg.toLowerCase().includes("aborted");

    if (isAbort) {
      const err = new Error("REQUEST_TIMEOUT");
      err.code = "REQUEST_TIMEOUT";
      throw err;
    }

    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

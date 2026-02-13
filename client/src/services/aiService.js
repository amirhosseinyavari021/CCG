// /home/cando/CCG/client/src/services/aiService.js

/**
 * callCCG(payload, { signal })
 * - Supports AbortController via fetch signal (used for Cancel).
 * - Keeps a stable contract: returns parsed JSON on success.
 */
export async function callCCG(payload, opts = {}) {
  const signal = opts?.signal;

  const res = await fetch("/api/ccg", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
    signal,
  });

  // Try to parse response safely
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data = null;
  try {
    data = isJson ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" && data.trim()) ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // if server returns text, normalize to object
  if (typeof data === "string") {
    return { output: data };
  }
  return data || {};
}

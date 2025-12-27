import { withBase } from "../config/api";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * callCCG
 * Unified call for:
 * - intent: "generate" | "learn" | "error" | "compare"
 */
export async function callCCG(payload) {
  const url = withBase("/api/ccg");

  // Helpful debug (kept minimal)
  // eslint-disable-next-line no-console
  console.log("[CCG] POST /api/ccg", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await safeJson(res) : null;

  // eslint-disable-next-line no-console
  console.log("[CCG] status", res.status, "content-type", ct, "bodyKind", data ? "json" : "text");

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (res.status === 404 ? "API route not found" : "API request failed");
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data || { ok: true };
}

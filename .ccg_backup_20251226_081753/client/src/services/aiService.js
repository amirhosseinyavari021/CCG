// client/src/services/aiService.js
import { withBase } from "../config/api";

async function readBodySmart(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // try json if content-type says json
  if (ct.includes("application/json")) {
    try {
      const j = await res.json();
      return { kind: "json", json: j, text: null };
    } catch {
      // fall through to text
    }
  }

  // fallback: read as text
  try {
    const text = await res.text();
    return { kind: "text", json: null, text };
  } catch {
    return { kind: "none", json: null, text: null };
  }
}

/**
 * callCCG(payload)
 * POST /api/ccg
 * Accepts:
 *   - JSON response: { markdown: "..." } or { ok:true, markdown:"..." }
 *   - TEXT response: "..." (wrapped into {markdown})
 */
export async function callCCG(payload) {
  const url = withBase("/api/ccg");

  // Debug logs (very useful for production too)
  console.log("[CCG] POST", url, payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const body = await readBodySmart(res);

  console.log("[CCG] status", res.status, "content-type", res.headers.get("content-type"), "bodyKind", body.kind);

  // route not found
  if (res.status === 404) {
    const hint = body.text ? ` | ${body.text.slice(0, 180)}` : "";
    throw new Error("API route not found" + hint);
  }

  // any non-2xx
  if (!res.ok) {
    const msg =
      body?.json?.error ||
      body?.json?.message ||
      (body.text ? body.text.slice(0, 220) : null) ||
      "API request failed";
    throw new Error(msg);
  }

  // ok responses
  if (body.kind === "json" && body.json) return body.json;

  // text response: wrap into markdown
  if (body.text && body.text.trim()) return { markdown: body.text };

  // empty response: show a clear error
  throw new Error("Empty response from API (no JSON / no text).");
}

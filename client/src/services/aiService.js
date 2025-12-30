/**
 * client/src/services/aiService.js (or .ts)
 * CCG_AI_SERVICE_V2 (do not remove)
 *
 * Fixes:
 * - Always hit relative /api/ccg (works behind nginx proxy)
 * - If HTTP non-2xx OR JSON {ok:false} => throw Error so UI shows apiErr
 * - Normalize output from output/result/markdown/text
 */

export async function callCCG(payload = {}) {
  const resp = await fetch("/api/ccg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;

  // try JSON first, fallback to text
  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      data = await resp.json();
    } else {
      const t = await resp.text();
      // Sometimes nginx/html or plain text returns
      data = { ok: false, error: t?.slice(0, 500) || "Non-JSON response" };
    }
  } catch (e) {
    data = { ok: false, error: "Failed to parse API response" };
  }

  // HTTP error => throw
  if (!resp.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `API error (${resp.status})`;
    throw new Error(msg);
  }

  // App-level error => throw
  if (data && data.ok === false) {
    const msg = data.error || data.message || "API error";
    throw new Error(msg);
  }

  const text =
    (data && (data.markdown || data.result || data.output || data.text)) || "";

  return {
    ...data,
    // keep both keys so all pages work
    result: typeof text === "string" ? text : String(text || ""),
    markdown: typeof text === "string" ? text : String(text || ""),
  };
}

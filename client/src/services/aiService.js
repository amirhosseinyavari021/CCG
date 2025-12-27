// client/src/services/aiService.js
import { withBase } from "../config/api";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function callCCG(payload) {
  const url = withBase("/api/ccg");
  // Debug log (خاموش/روشن با نیاز خودت)
  console.log("[CCG] POST /api/ccg", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  const bodyKind = ct.includes("application/json") ? "json" : "text";
  console.log("[CCG] status", res.status, "content-type", ct, "bodyKind", bodyKind);

  if (!res.ok) {
    const data = await safeJson(res);
    const msg =
      data?.error ||
      data?.message ||
      (res.status === 404 ? "API route not found" : `API error (${res.status})`);
    throw new Error(msg);
  }

  const data = await safeJson(res);
  // قرارداد خروجی: backend می‌تواند markdown یا content یا result بدهد
  return {
    markdown: data?.markdown || data?.content || data?.result || "",
    raw: data,
  };
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

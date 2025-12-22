// client/src/services/aiService.js
import { API_TIMEOUT_MS, withBase } from "../config/api";

async function postJSON(path, body) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(withBase(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // بعضی بک‌اندها lang رو از header هم می‌گیرن
        "Accept-Language": body?.lang === "fa" ? "fa" : "en",
      },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");

    const data = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");
    if (!res.ok) {
      const msg =
        (typeof data === "object" && data && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

// ✅ Generate
export async function generateCommand(payload) {
  // Primary endpoint
  try {
    return await postJSON("/ai/generate", payload);
  } catch (e) {
    // Fallback (older backend pattern)
    return await postJSON("/ai", { ...payload, mode: payload?.mode || "generate" });
  }
}

// ✅ Compare
export async function compareCode(payload) {
  try {
    return await postJSON("/ai/compare", payload);
  } catch {
    // fallback: same /ai/generate with mode compare
    return await postJSON("/ai/generate", { ...payload, mode: "compare" });
  }
}

// ✅ Error Analyze
export async function analyzeError(payload) {
  try {
    return await postJSON("/ai/error-analyze", payload);
  } catch {
    // fallback: same /ai/generate with mode error_analyze
    return await postJSON("/ai/generate", { ...payload, mode: "error_analyze" });
  }
}

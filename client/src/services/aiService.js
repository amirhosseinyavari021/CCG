// client/src/services/aiService.js
import { withBase } from "../config/api";

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function pickFirstString(...vals) {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function normalizeCCGResponse(data, resOk = true) {
  const d = (data && typeof data === "object") ? data : {};

  // tool ممکنه اینجاها باشه:
  const tool =
    d.tool ??
    d.output?.tool ??
    d.result?.tool ??
    null;

  // markdown ممکنه string باشه یا داخل output/result object
  const text = pickFirstString(
    d.output,
    d.markdown,
    d.result,
    d.text,
    d.output?.markdown,
    d.result?.markdown,
    d.output?.output,
    d.result?.output
  );

  // اگر tool داریم ولی متن نداریم، یه fallback ساده بساز (برای رندر)
  const fallbackFromTool = (() => {
    if (!tool) return "";
    const lang = tool?.primary?.lang || "bash";
    const primary = tool?.primary?.command || "";
    const exp = tool?.explanation || "";
    const warns = Array.isArray(tool?.warnings) ? tool.warnings : [];
    const alts = Array.isArray(tool?.alternatives) ? tool.alternatives : [];
    let md = "";
    if (primary) md += "```" + lang + "\n" + primary + "\n```\n\n";
    md += "## توضیح\n" + (exp || "-") + "\n\n";
    md += "## هشدارها\n" + (warns.length ? warns.map(w => `- ${w}`).join("\n") : "- -") + "\n\n";
    md += "## جایگزین‌ها\n";
    for (const a of alts.slice(0, 3)) {
      md += `- ${a?.note || ""}\n\n\`\`\`${lang}\n${a?.command || ""}\n\`\`\`\n\n`;
    }
    return md.trim();
  })();

  const markdown = text || fallbackFromTool;

  return {
    ok: Boolean(d.ok ?? resOk),
    output: markdown,
    markdown,
    result: markdown,
    tool,
    raw: d,
    error: d.error || d.message || null,
  };
}

export async function callCCG(payload) {
  const url = withBase("/api/ccg");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    return { ok: false, output: "", markdown: "", result: "", tool: null, error: msg, raw: data };
  }

  return normalizeCCGResponse(data, true);
}

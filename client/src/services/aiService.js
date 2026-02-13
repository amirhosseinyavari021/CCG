// /home/cando/CCG/client/src/services/aiService.js
const API_BASE = (import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "");

// ✅ Stable client API wrapper for CCG
// Normalizes backend response shapes so UI never shows [object Object].
// Also: builds "tool" object from commands/moreCommands if backend tool is null.

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  let data = null;
  if (ct.includes("application/json")) data = await res.json();
  else data = { ok: false, error: await res.text() };

  if (!res.ok || data?.ok === false) {
    const msg = data?.error || data?.message || "API error";
    throw new Error(msg);
  }
  return normalizeCCGResponse(data);
}

function _tryParseToolJson(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (!(t.startsWith("{") && t.endsWith("}"))) return null;
  try {
    const obj = JSON.parse(t);
    const tool = obj && typeof obj.tool === "object" ? obj.tool : obj;
    if (!tool || typeof tool !== "object") return null;
    if (!tool.primary || typeof tool.primary !== "object") return null;
    if (typeof tool.primary.command !== "string") return null;
    return tool;
  } catch {
    return null;
  }
}

function _toolToMarkdown(tool, variant = "tool") {
  const lang = String(tool?.primary?.lang || "bash").trim() || "bash";
  const cmd = String(tool?.primary?.command || "").trim() || 'echo "No command produced"';

  const parts = [];
  parts.push("```" + lang + "\n" + cmd + "\n```");

  if (variant === "tool") {
    const exp = Array.isArray(tool?.explanation)
      ? tool.explanation.map((x) => String(x || "").trim()).filter(Boolean).join("\n")
      : String(tool?.explanation || "").trim();
    if (exp) parts.push("\n## توضیح\n" + exp);
  }

  const warnings = Array.isArray(tool?.warnings)
    ? tool.warnings.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (warnings.length) {
    parts.push("\n## هشدارها\n" + warnings.map((w) => "- " + w).join("\n"));
  }

  const altsIn = Array.isArray(tool?.alternatives) ? tool.alternatives : [];
  const alts = [];
  for (const a of altsIn) {
    const c = String(a?.command || "").trim();
    if (!c) continue;
    const note = String(a?.label || a?.note || "").trim();
    alts.push({ command: c, note });
  }
  if (alts.length) {
    const blocks = alts
      .map((a) => {
        const head = a.note ? `- ${a.note}\n\n` : "";
        return `${head}\`\`\`${lang}\n${a.command}\n\`\`\``;
      })
      .join("\n\n");
    parts.push("\n## جایگزین‌ها\n" + blocks);
  }

  return parts.join("\n\n") + "\n";
}

/**
 * استخراج بخش‌های مهم از Markdown تولیدشده توسط CCG
 * (برای ساخت ToolResult حتی وقتی backend tool=null است)
 */
function _extractSections(md) {
  const text = String(md || "");
  const lines = text.split("\n");

  // تیترهای رایج شما:
  // ### ✅ دستور اصلی
  // ### توضیح
  // ### ⚠️ هشدار
  // ### 🔁 دستورات جایگزین
  // ### 📌 توضیحات بیشتر

  const getTitle = (l) => {
    const t = l.trim();
    if (!t.startsWith("###")) return null;
    return t.replace(/^###\s*/, "").trim();
  };

  const sections = [];
  let cur = null;

  for (const line of lines) {
    const title = getTitle(line);
    if (title) {
      if (cur) sections.push(cur);
      cur = { title, body: [] };
      continue;
    }
    if (!cur) continue;
    cur.body.push(line);
  }
  if (cur) sections.push(cur);

  const by = (needle) =>
    sections.find((s) => String(s.title || "").includes(needle));

  const primary = by("دستور اصلی") || by("Command") || null;
  const explain = by("توضیح") || by("Explanation") || null;
  const warn = by("هشدار") || by("Warning") || null;
  const more = by("توضیحات بیشتر") || by("More Details") || null;

  const join = (s) =>
    (s?.body || []).join("\n").trim();

  return {
    primaryText: join(primary),
    explainText: join(explain),
    warnText: join(warn),
    moreText: join(more),
  };
}

function _stripCodeFences(s) {
  // ورودی داخل سِکشن "دستور اصلی" ممکنه شامل ```bash ... ```
  const t = String(s || "").trim();
  if (!t) return "";
  const m = t.match(/```(\w+)?\s*([\s\S]*?)```/);
  if (!m) return t;
  return String(m[2] || "").trim();
}

function _guessCodeLangFromFence(s, fallback = "bash") {
  const t = String(s || "").trim();
  const m = t.match(/```(\w+)?\s*[\s\S]*?```/);
  const lang = String(m?.[1] || "").trim().toLowerCase();
  return lang || fallback;
}

function _buildToolFromCCGFields(data) {
  const commands = Array.isArray(data?.commands) ? data.commands : [];
  const moreCommands = Array.isArray(data?.moreCommands) ? data.moreCommands : [];

  // اگر اصلاً command نداریم، tool نمی‌سازیم
  if (!commands.length) return null;

  const md =
    (typeof data?.markdown === "string" && data.markdown) ||
    (typeof data?.output === "string" && data.output) ||
    "";

  const sec = _extractSections(md);

  const primaryBlock = sec.primaryText || md;
  const primaryLang = _guessCodeLangFromFence(primaryBlock, String(data?.cli || "bash"));
  const primaryCmd = commands[0] || _stripCodeFences(primaryBlock);

  // توضیح‌ها را به صورت آرایه می‌خواهیم (ToolResult این را دوست دارد)
  const explainText = (sec.explainText || sec.moreText || "").trim();
  const explanation = explainText
    ? explainText
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => x && !x.startsWith("```"))
    : [];

  // هشدارها: خطوط bullet یا blockquote
  const warnRaw = (sec.warnText || "").trim();
  const warnings = warnRaw
    ? warnRaw
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => x.replace(/^[>\-\*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  // جایگزین‌ها
  const alternatives = moreCommands.map((c, i) => ({
    label: `ALT ${i + 1}`,
    command: String(c || "").trim(),
  })).filter(a => a.command);

  return {
    title: data?.lang === "fa" ? "خروجی" : "Output",
    primary: {
      label: data?.lang === "fa" ? "دستور اصلی" : "Primary",
      command: String(primaryCmd || "").trim(),
      lang: primaryLang || "bash",
    },
    alternatives,
    explanation,
    warnings,
    lang: primaryLang || "bash",
  };
}

function normalizeCCGResponse(data) {
  // Backend contract (expected):
  // - output: markdown string
  // - tool: object|null
  // But sometimes AI/tool JSON leaks into output as a JSON string.
  const rawOut =
    typeof data?.output === "string" && data.output.trim()
      ? data.output
      : typeof data?.markdown === "string" && data.markdown.trim()
      ? data.markdown
      : typeof data?.result === "string" && data.result.trim()
      ? data.result
      : "";

  let tool = data && typeof data.tool === "object" ? data.tool : null;
  let md = rawOut;

  // ✅ If tool missing but output is actually tool-json => parse it
  if (!tool) {
    const parsedTool = _tryParseToolJson(rawOut);
    if (parsedTool) {
      tool = parsedTool;
      const variant =
        String(data?.outputType || "").toLowerCase() === "command" ? "command" : "tool";
      md = _toolToMarkdown(tool, variant);
    }
  }

  // ✅ If tool exists but output accidentally equals JSON string, rebuild markdown
  if (tool && rawOut.trim().startsWith("{")) {
    const variant =
      String(data?.outputType || "").toLowerCase() === "command" ? "command" : "tool";
    md = _toolToMarkdown(tool, variant);
  }

  // ✅ اگر backend tool=null بود ولی commands داریم، خودمان tool بسازیم تا UI کارت‌ها را نشان دهد
  if (!tool) {
    const built = _buildToolFromCCGFields({ ...data, markdown: md, output: md });
    if (built) tool = built;
  }

  return { ...data, tool, markdown: md, output: md };
}

export async function callCCG(payload) {
  const data = await postJSON("/api/ccg", payload);
  return normalizeCCGResponse(data);
}

// -------------------------------
// CCG_CHAT_SERVICE_V1
// - ChatPage.jsx expects these exports.
// - Will use /api/chat/* if present; otherwise fallback to /api/ccg.
// -------------------------------

async function _safeJson(resp) {
  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await resp.json();
  const t = await resp.text().catch(() => "");
  return { ok: false, error: t?.slice(0, 500) || "Non-JSON response" };
}

async function _postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await _safeJson(resp);
  return { resp, data };
}

function _normalizeText(data) {
  const text =
    (typeof data?.markdown === "string" && data.markdown) ||
    (typeof data?.result === "string" && data.result) ||
    (typeof data?.output === "string" && data.output) ||
    "";
  return {
    ...data,
    markdown: text,
    result: text,
    output: text,
  };
}

export async function chatCreateSession(payload = {}) {
  try {
    const { resp, data } = await _postJson("/api/chat/session", payload);
    if (resp.ok && data && (data.sessionId || data.id)) {
      return { ok: true, sessionId: data.sessionId || data.id, ...data };
    }
    if (resp.status !== 404 && data?.error) {
      throw new Error(data.error);
    }
  } catch (e) {
    // fallback anyway
  }

  const sid = "local_" + Math.random().toString(36).slice(2, 10);
  return { ok: true, sessionId: sid, fallback: true };
}

export async function chatSendMessage(payload = {}) {
  const msg =
    payload?.message ??
    payload?.text ??
    payload?.user_request ??
    payload?.userRequest ??
    "";
  const sessionId = payload?.sessionId ?? payload?.sid ?? "";

  try {
    const { resp, data } = await _postJson("/api/chat/message", {
      ...payload,
      message: msg,
      sessionId,
    });
    if (resp.ok && data) return _normalizeText(data);
    if (resp.status !== 404) {
      const err = data?.error || data?.message || "Chat API error";
      throw new Error(err);
    }
  } catch (e) {
    // fallback below
  }

  const ccgPayload = {
    mode: "chat",
    user_request: String(msg || "").trim(),
    lang: payload?.lang || "fa",
    platform: payload?.platform,
    os: payload?.os,
    cli: payload?.cli,
    outputType: payload?.outputType || "markdown",
    verbosity: payload?.verbosity || "normal",
    sessionId,
  };

  const res = await callCCG(ccgPayload);
  return _normalizeText(res);
}

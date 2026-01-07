// server/utils/outputFormatter.js
// ✅ CCG Stable Tool Contract Normalizer (Generator + Explain)
//
// Returns:
//  - tool: { primary:{command,lang}, explanation, warnings[], alternatives[] }
//  - markdown: string (strict template)
//  - output: markdown (alias)
//
// Explain mode: if forcedCommand provided, primary.command MUST stay exactly that.
//
// Back-compat exports:
// - formatToolResponse (main)
// - formatOutput (alias)

function fenceLangFromCli(cli = "bash", outputType = "tool") {
  const c = String(cli || "").toLowerCase();
  const ot = String(outputType || "").toLowerCase();
  if (ot === "python") return "python";
  if (c.includes("powershell") || c === "pwsh" || c === "powershell") return "powershell";
  if (c.includes("cmd") || c === "cmd") return "cmd";
  return "bash";
}

function tryParseJSONMaybe(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (!(t.startsWith("{") && t.endsWith("}"))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function stripFences(s) {
  const t = String(s ?? "").trim();
  // ```lang\n...\n```
  const m = t.match(/^\s*```[^\n]*\n([\s\S]*?)\n?```\s*$/);
  return (m ? m[1] : t).trim();
}

function stripInlineBackticks(s) {
  return String(s ?? "").replace(/`+/g, "").trim();
}

function toOneLineCommand(s) {
  const t = stripInlineBackticks(stripFences(s));
  // take first non-empty line
  const line = t.split("\n").map(x=>x.trim()).find(Boolean) || "";
  return line;
}

function splitFirstCodeBlock(text) {
  const t = String(text ?? "").trim();
  const m = t.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!m) return { codeRaw: "", rest: t };
  return { codeRaw: String(m[1] ?? "").trim(), rest: t.replace(m[0], "").trim() };
}

function looksLikeCommand(line) {
  const s = String(line || "").trim();
  if (!s) return false;
  if (s.length > 220) return false;
  if (/[.،؛!?]$/.test(s)) return false;
  if (/^\{.*\}$/.test(s)) return false;
  // avoid headings
  if (/^#{1,6}\s/.test(s)) return false;
  return true;
}

function pickCommandFromText(rawText) {
  const t = String(rawText ?? "").trim();
  if (!t) return "";
  const { codeRaw } = splitFirstCodeBlock(t);
  if (codeRaw) {
    const first = codeRaw.split("\n").map(x=>x.trim()).find(Boolean) || "";
    if (looksLikeCommand(first)) return first;
  }
  const lines = t.split("\n").map(x=>x.trim()).filter(Boolean);
  const cand = lines.find(looksLikeCommand) || "";
  return cand;
}

function ensure3Alternatives(arr) {
  const a = Array.isArray(arr) ? arr.slice(0, 3) : [];
  while (a.length < 3) a.push({ command: "", note: "" });
  return a.map(x => ({
    command: toOneLineCommand(x?.command || ""),
    note: String(x?.note || "").trim()
  }));
}

function mdList(items) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return "- (none)";
  return arr.map(x => `- ${String(x).trim()}`).join("\n");
}

function altMarkdown(alts, lang) {
  const a = ensure3Alternatives(alts);
  return a.map((x) => {
    const note = x.note ? `- ${x.note}\n\n` : "";
    const cmd = x.command || "";
    return `${note}\`\`\`${lang}\n${cmd}\n\`\`\``.trim();
  }).join("\n\n");
}

export function formatToolResponse({
  rawText = "",
  text = "",
  cli = "bash",
  outputType = "tool",
  verbosity = "normal", // brief | normal | detailed
  forcedCommand = "",
} = {}) {
  const lang = fenceLangFromCli(cli, outputType);
  const src = (typeof rawText === "string" && rawText.trim()) ? rawText : String(text || "");

  // Unwrap JSON tool if model returned JSON
  const parsed = tryParseJSONMaybe(src);
  const toolFromJson = parsed?.tool && typeof parsed.tool === "object" ? parsed.tool : null;
  const markdownFromJson = typeof parsed?.markdown === "string" ? parsed.markdown : "";

  let primaryCmd = "";
  let explanation = "";
  let warnings = [];
  let alternatives = [];

  if (toolFromJson) {
    primaryCmd = toOneLineCommand(toolFromJson?.primary?.command || "");
    explanation = String(toolFromJson?.explanation || "").trim();
    warnings = Array.isArray(toolFromJson?.warnings) ? toolFromJson.warnings.map(x=>String(x).trim()).filter(Boolean) : [];
    alternatives = Array.isArray(toolFromJson?.alternatives) ? toolFromJson.alternatives : [];
  }

  // Forced command wins (Explain mode)
  if (forcedCommand) primaryCmd = toOneLineCommand(forcedCommand);

  // Fallback extraction
  if (!primaryCmd) primaryCmd = pickCommandFromText(markdownFromJson || src);
  primaryCmd = toOneLineCommand(primaryCmd);

  // Explanation fallback
  if (!explanation) {
    // remove any code fences and keep rest
    const rest = splitFirstCodeBlock(markdownFromJson || src).rest;
    explanation = String(rest || "").trim();
  }

  // Make verbosity behavior deterministic for explain UX
  if (verbosity === "brief") {
    // keep 1–2 sentences
    explanation = explanation.split("\n").join(" ").trim();
    explanation = explanation.split("。").join("."); // just normalize punctuation a bit
    if (explanation.length > 180) explanation = explanation.slice(0, 180).trim() + "…";
  } else if (verbosity === "detailed") {
    // if no obvious example section, add minimal example hint
    if (!/مثال|example/i.test(explanation)) {
      explanation = `${explanation}\n\nمثال:\n- اگر خواستی این عملیات را لغو کنی، از دستور/گزینه‌ی مربوطه استفاده کن.`;
    }
  }

  // Warnings fallback minimal safe set if empty
  if (!warnings.length) {
    warnings = [
      "قبل از اجرا فایل‌های ذخیره‌نشده را ذخیره کنید.",
      "اگر روی SSH/Remote هستید ممکن است اتصال شما قطع شود.",
      "در محیط Production قبل از اجرا، اثرات و Rollback را بررسی کنید."
    ];
  }

  alternatives = ensure3Alternatives(alternatives);

  const tool = {
    primary: { command: primaryCmd, lang },
    explanation,
    warnings,
    alternatives
  };

  const md =
`\`\`\`${lang}
${primaryCmd}
\`\`\`

## توضیح
${explanation}

## هشدارها
${mdList(warnings)}

## جایگزین‌ها
${altMarkdown(alternatives, lang)}
`.trim();

  return { tool, markdown: md, output: md };
}

export const formatOutput = formatToolResponse;

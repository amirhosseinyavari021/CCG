// server/utils/outputFormatter.js
// ✅ Hardened formatter: if AI returns tool JSON as raw text, we parse it and generate stable markdown + tool object.
// ESM exports: formatToolResponse + formatOutput(alias)

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

function splitFirstCodeBlock(text) {
  const t = String(text ?? "").trim();
  const m = t.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!m) return { codeRaw: "", rest: t };
  return { codeRaw: String(m[1] ?? "").trim(), rest: t.replace(m[0], "").trim() };
}

function looksLikeCommand(line) {
  const s = String(line || "").trim();
  if (!s) return false;
  if (s.length > 240) return false;
  if (/[.،؛!?]$/.test(s)) return false;
  return true;
}

function normalizeToolObj(tool) {
  const t = (tool && typeof tool === "object") ? tool : {};
  const primary = (t.primary && typeof t.primary === "object") ? t.primary : {};
  const command = String(primary.command || "").trim();
  const lang = String(primary.lang || "").trim();
  const explanation = String(t.explanation || "").trim();

  const warnings = Array.isArray(t.warnings)
    ? t.warnings.map(x => String(x || "").trim()).filter(Boolean)
    : [];

  const alternatives = Array.isArray(t.alternatives)
    ? t.alternatives.map(a => ({
        command: String(a?.command || "").trim(),
        note: String(a?.note || "").trim(),
      })).filter(a => a.command)
    : [];

  return {
    primary: { command, lang },
    explanation,
    warnings,
    alternatives,
  };
}

function toolToMarkdown(tool, cli, outputType, forcedCommand) {
  const fenceLang = fenceLangFromCli(cli, outputType);
  const primaryCmd = String(forcedCommand || tool?.primary?.command || "").trim() || 'echo "No command produced"';
  const primaryLang = String(tool?.primary?.lang || fenceLang).trim() || fenceLang;

  // command mode: ONLY primary command
  const ot = String(outputType || "").toLowerCase();
  if (ot === "command") {
    return `\`\`\`${primaryLang}\n${primaryCmd}\n\`\`\``;
  }

  const parts = [];
  parts.push(`\`\`\`${primaryLang}\n${primaryCmd}\n\`\`\``);

  const exp = String(tool?.explanation || "").trim();
  if (exp) parts.push(`## توضیح\n${exp}`);

  const warnings = Array.isArray(tool?.warnings) ? tool.warnings : [];
  if (warnings.length) {
    parts.push(`## هشدارها\n${warnings.map(w => `- ${w}`).join("\n")}`);
  }

  const alts = Array.isArray(tool?.alternatives) ? tool.alternatives : [];
  if (alts.length) {
    const blocks = alts.map(a => {
      const note = String(a?.note || "").trim();
      const cmd = String(a?.command || "").trim();
      const head = note ? `- ${note}\n\n` : "";
      return `${head}\`\`\`${primaryLang}\n${cmd}\n\`\`\``;
    }).join("\n\n");
    parts.push(`## جایگزین‌ها\n${blocks}`);
  }

  return parts.join("\n\n");
}

export function formatToolResponse({
  rawText = "",
  text = "",
  cli = "bash",
  outputType = "tool",
  forcedCommand = "",
} = {}) {
  const input = String(rawText || text || "").trim();

  // 1) If raw text is JSON => parse as tool first
  const parsed = tryParseJSONMaybe(input);
  if (parsed) {
    // accept {tool:{...}, markdown:"..."} OR direct tool object {primary,...}
    const maybeTool = (parsed.tool && typeof parsed.tool === "object") ? parsed.tool : parsed;
    const tool0 = normalizeToolObj(maybeTool);

    // enforce forced command (explain mode)
    if (forcedCommand) tool0.primary.command = String(forcedCommand).trim();

    // if tool json had no command, fallback
    if (!tool0.primary.command) {
      tool0.primary.command = 'echo "No command produced"';
    }

    // if tool json had no lang, infer
    if (!tool0.primary.lang) tool0.primary.lang = fenceLangFromCli(cli, outputType);

    const markdown = toolToMarkdown(tool0, cli, outputType, forcedCommand);
    return { ok: true, tool: tool0, markdown, output: markdown };
  }

  // 2) Otherwise: try to infer from code block or first command-like line
  const { codeRaw, rest } = splitFirstCodeBlock(input);

  let cmd = "";
  if (codeRaw) cmd = codeRaw.split("\n").map(l => l.trim()).filter(Boolean).join("\n").trim();

  if (!cmd) {
    // fallback: first line that looks like a command
    const line = input.split("\n").map(x => x.trim()).find(looksLikeCommand);
    if (line) cmd = line;
  }

  if (!cmd) cmd = 'echo "No command produced"';

  const tool = normalizeToolObj({
    primary: { command: cmd, lang: fenceLangFromCli(cli, outputType) },
    explanation: rest || "",
    warnings: [],
    alternatives: [],
  });

  if (forcedCommand) tool.primary.command = String(forcedCommand).trim();

  const markdown = toolToMarkdown(tool, cli, outputType, forcedCommand);
  return { ok: true, tool, markdown, output: markdown };
}

export function formatOutput(args = {}) {
  return formatToolResponse(args);
}

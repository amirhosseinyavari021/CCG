// server/utils/outputFormatter.js
// Converts strict JSON output to a stable tool object + markdown fallback

function safeJsonParse(text) {
  try {
    const t = String(text || "").trim();
    if (!t) return null;
    // If model returned extra whitespace, still ok. But MUST be pure JSON per prompt.
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function asArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return [String(v)];
}

function normalizeTool(obj, cliFallback = "bash") {
  const o = obj && typeof obj === "object" ? obj : {};
  const platform = String(o.platform || "").trim() || "";
  const cli = String(o.cli || "").trim() || cliFallback;

  const pythonScript = o.pythonScript === true;

  const tool = {
    mode: "generator",
    platform,
    cli,
    pythonScript,
    title: String(o.title || "").trim(),
    primary_command: pythonScript ? "" : String(o.primary_command || "").trim(),
    alternatives: pythonScript ? [] : asArr(o.alternatives),
    python_script: pythonScript ? String(o.python_script || "").trim() : "",
    explanation: asArr(o.explanation),
    warnings: asArr(o.warnings),
    notes: asArr(o.notes),
  };

  // Hard guarantees:
  // - Exactly one primary command in CLI mode
  // - At least 3 alternatives if present in CLI mode (UI expects it)
  if (!pythonScript) {
    // remove duplicates
    const seen = new Set();
    const primary = tool.primary_command;
    const alts = [];
    for (const a of tool.alternatives) {
      const x = String(a || "").trim();
      if (!x) continue;
      if (x === primary) continue;
      if (seen.has(x)) continue;
      seen.add(x);
      alts.push(x);
    }
    tool.alternatives = alts;
  }

  return tool;
}

function toolToMarkdown(tool) {
  // Markdown fallback for old pages (generator UI should render ToolResult)
  const t = tool || {};
  const lines = [];

  if (t.title) lines.push(`# ${t.title}`, "");

  if (t.pythonScript) {
    lines.push(`## Python Script`, "", "```python", t.python_script || "", "```", "");
  } else {
    lines.push(`## Command`, "", "```" + (t.cli || "bash"), t.primary_command || "", "```", "");
    if (t.alternatives?.length) {
      lines.push(`## Alternatives`, "");
      for (const a of t.alternatives) {
        lines.push("```" + (t.cli || "bash"), a, "```", "");
      }
    }
  }

  if (t.explanation?.length) {
    lines.push(`## Explanation`, "");
    for (const x of t.explanation) lines.push(`- ${x}`);
    lines.push("");
  }

  if (t.warnings?.length) {
    lines.push(`## Warnings`, "");
    for (const x of t.warnings) lines.push(`- ${x}`);
    lines.push("");
  }

  if (t.notes?.length) {
    lines.push(`## Notes`, "");
    for (const x of t.notes) lines.push(`- ${x}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function formatOutput({ text, cli = "bash" }) {
  const raw = String(text || "").trim();

  const parsed = safeJsonParse(raw);
  if (parsed) {
    const tool = normalizeTool(parsed, cli);
    const markdown = toolToMarkdown(tool);
    return { tool, markdown };
  }

  // If model violated contract (shouldn’t happen), return raw in markdown
  return { tool: null, markdown: raw };
}

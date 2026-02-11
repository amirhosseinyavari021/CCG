 // /home/cando/CCG/server/utils/outputFormatter.js

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function tryParseJSON(text) {
  const t = s(text).trim();
  if (!t) return null;

  // اگر مدل JSON را داخل ```json ...``` گذاشت
  const fenced = t.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : t;

  // اگر شبیه JSON نیست بیخیال
  if (!(raw.startsWith("{") && raw.endsWith("}"))) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normLine(line) {
  return s(line).replace(/\r/g, "").trim();
}

function splitLines(txt) {
  return s(txt)
    .split("\n")
    .map(normLine)
    .filter(Boolean);
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const v = s(x).trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function takeN(arr, n) {
  return arr.slice(0, Math.max(0, n));
}

function buildMarkdown({
  lang = "fa",
  cli = "bash",
  command = "",
  explanation = "",
  warning = "",
  alternatives = [],
  details = [],
  pythonScript = "",
  pythonNotes = "",
}) {
  const fa = lang === "fa";

  // Python mode
  if (pythonScript) {
    const title = fa ? "### اسکریپت پایتون" : "### Python Script";
    const notesTitle = fa ? "### توضیحات" : "### Notes";
    return [
      title,
      "",
      "```python",
      s(pythonScript).trim(),
      "```",
      "",
      pythonNotes ? `${notesTitle}\n\n${s(pythonNotes).trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const cmdTitle = fa ? "### ✅ دستور اصلی" : "### ✅ Main Command";
  const expTitle = fa ? "### توضیح" : "### Explanation";
  const warnTitle = fa ? "### ⚠️ هشدار" : "### ⚠️ Warning";
  const altTitle = fa ? "### 🔁 دستورات جایگزین" : "### 🔁 Alternative Commands";
  const detTitle = fa ? "### 📌 توضیحات بیشتر" : "### 📌 More Details";

  const out = [];

  // 1) Command first
  if (command) {
    out.push(cmdTitle, "", "```" + cli, s(command).trim(), "```", "");
  }

  // 2) Explanation
  if (explanation) {
    out.push(expTitle, "", s(explanation).trim(), "");
  }

  // 3) Warning (make it obvious)
  if (warning) {
    out.push(warnTitle, "", `> ${s(warning).trim()}`, "");
  }

  // 4) Alternatives
  if (alternatives && alternatives.length) {
    out.push(altTitle, "");
    for (const c of alternatives) {
      out.push("```" + cli, s(c).trim(), "```", "");
    }
  }

  // 5) More details
  if (details && details.length) {
    out.push(detTitle, "");
    for (const d of details) out.push(`- ${s(d).trim()}`);
    out.push("");
  }

  return out.join("\n").trim() + "\n";
}

/**
 * خروجی استاندارد برای فرانت:
 * {
 *   markdown,
 *   commands: [ ... ],
 *   moreCommands: [ ... ],
 *   pythonScript: "...",
 * }
 *
 * ورودی می‌تواند:
 * - string (markdown / JSON)
 * - object (اگر جایی اشتباه پاس داده شد)
 */
export function formatOutput(input, opts = {}) {
  // opts: { cli, lang, wantMoreCommands, pythonMode }
  const cli = s(opts.cli || "bash").toLowerCase();
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const wantMoreCommands = Number(opts.wantMoreCommands) > 0 ? Number(opts.wantMoreCommands) : 2;

  // اگر اشتباه آبجکت پاس داده شد، تلاش می‌کنیم text را ازش بکشیم بیرون
  let rawText = "";
  if (isObj(input)) {
    rawText =
      s(input.text) ||
      s(input.rawText) ||
      s(input.markdown) ||
      s(input.output) ||
      JSON.stringify(input);
  } else {
    rawText = s(input);
  }

  const parsed = tryParseJSON(rawText);

  // ---- Case A: JSON contract ----
  if (parsed && isObj(parsed)) {
    const mode = s(parsed.mode).toLowerCase(); // "cli" | "python"
    const command = s(parsed.command).trim();

    const alternatives = uniq(parsed.alternatives || parsed.moreCommands || []);
    const details = uniq(parsed.details || parsed.moreDetails || []);

    const warning = s(parsed.warning).trim();
    const explanation = s(parsed.explanation).trim();

    const pythonScript = s(parsed.pythonScript || parsed.script).trim();
    const pythonNotes = s(parsed.pythonNotes || parsed.notes).trim();

    if (mode === "python" || pythonScript) {
      return {
        markdown: buildMarkdown({
          lang,
          pythonScript,
          pythonNotes,
        }),
        commands: [],
        moreCommands: [],
        pythonScript,
      };
    }

    const finalAlternatives = takeN(alternatives, wantMoreCommands);

    const md = buildMarkdown({
      lang,
      cli,
      command,
      explanation,
      warning,
      alternatives: finalAlternatives,
      details,
    });

    return {
      markdown: md,
      commands: command ? [command] : [],
      moreCommands: finalAlternatives,
      pythonScript: "",
    };
  }

  // ---- Case B: fallback: parse code blocks from markdown ----
  // استخراج code block ها (```bash ...``` / ```python ...```)
  const re = /```(\w+)?\s*([\s\S]*?)```/g;
  const blocks = [];
  let m;
  while ((m = re.exec(rawText)) !== null) {
    blocks.push({
      lang: s(m[1]).trim().toLowerCase(),
      code: s(m[2]).trim(),
    });
  }

  const cliLangs = new Set(["bash", "zsh", "sh", "powershell", "ps1", "cmd", "bat"]);
  const cliBlocks = blocks.filter((b) => cliLangs.has(b.lang));
  const py = blocks.find((b) => b.lang === "python");

  const cmd = cliBlocks[0]?.code ? splitLines(cliBlocks[0].code)[0] : "";
  const more = cliBlocks[1]?.code ? splitLines(cliBlocks[1].code) : [];

  const pythonScript = py?.code ? py.code : "";

  // markdown را همون raw برمی‌گردونیم
  return {
    markdown: s(rawText).trim(),
    commands: cmd ? [cmd] : [],
    moreCommands: takeN(uniq(more), wantMoreCommands),
    pythonScript,
  };
}

export const formatAIOutput = formatOutput;


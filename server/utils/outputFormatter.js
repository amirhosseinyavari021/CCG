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

  const fenced = t.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : t;

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

  if (command) {
    out.push(cmdTitle, "", "```" + cli, s(command).trim(), "```", "");
  }

  if (explanation) {
    out.push(expTitle, "", s(explanation).trim(), "");
  }

  if (warning) {
    out.push(warnTitle, "", `> ${s(warning).trim()}`, "");
  }

  if (alternatives && alternatives.length) {
    out.push(altTitle, "");
    for (const c of alternatives) {
      out.push("```" + cli, s(c).trim(), "```", "");
    }
  }

  if (details && details.length) {
    out.push(detTitle, "");
    for (const d of details) out.push(`- ${s(d).trim()}`);
    out.push("");
  }

  return out.join("\n").trim() + "\n";
}

/**
 * formatOutput(input, opts)
 */
export function formatOutput(input, opts = {}) {
  const cli = s(opts.cli || "bash").toLowerCase();
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const wantMoreCommands = Number(opts.wantMoreCommands) > 0 ? Number(opts.wantMoreCommands) : 2;

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

  if (parsed && isObj(parsed)) {
    const mode = s(parsed.mode).toLowerCase();
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

  return {
    markdown: s(rawText).trim(),
    commands: cmd ? [cmd] : [],
    moreCommands: takeN(uniq(more), wantMoreCommands),
    pythonScript,
  };
}

export const formatAIOutput = formatOutput;

/* -------------------------------------------------------------------------- */
/*                   Comparator Normalizer (WEB Compare only)                  */
/* -------------------------------------------------------------------------- */

function collapseExtraBlankLines(md) {
  return s(md)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n");
}

function stripNoiseLines(md, { lang = "fa" } = {}) {
  const fa = lang !== "en";
  const lines = s(md).replace(/\r\n/g, "\n").split("\n");
  const out = [];

  const isJunk = (line) => {
    const t = s(line).trim();
    if (!t) return false;

    // UI labels leakage
    if (/^(CODE|Copy)$/i.test(t)) return true;
    if (fa && /^(کپی|کپي)$/u.test(t)) return true;

    // standalone language labels
    if (/^(auto|python|javascript|typescript|node|bash|zsh|sh|powershell|ps1|cmd|bat)$/i.test(t)) return true;
    if (/^(c\#|csharp|c\+\+|cpp|java|go|rust|php|ruby|kotlin|swift|scala|dart|txt)$/i.test(t)) return true;

    // prompt leakage
    if (fa && /(قرارکرد|قرارداد|مطابق.*قرارداد|سخت.?گیرانه)/u.test(t)) return true;
    if (!fa && /(contract|system prompt|strict contract|instructions)/i.test(t)) return true;

    return false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      out.push(rawLine);
      continue;
    }
    if (isJunk(line)) continue;
    out.push(rawLine);
  }
  return out.join("\n");
}

function toInlineCode(text) {
  const t = s(text).trim();
  if (!t) return "";
  const one = t.replace(/\s+/g, " ").trim();
  return "`" + one.replace(/`+/g, "") + "`";
}

function stripFencesToInline(md) {
  let t = s(md);

  t = t.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, inner) => {
    const body = s(inner).trim();
    if (!body) return "";
    const firstLine = body.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] || body;
    return toInlineCode(firstLine);
  });

  t = t.replace(/```([^`]+)```/g, (_, inner) => toInlineCode(inner));

  return t;
}

function stripIndentedBlocks(md) {
  const lines = s(md).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let buf = [];
  let inBlock = false;

  function flush() {
    if (!inBlock) return;
    const content = buf
      .map((x) => x.replace(/^( {4}|\t)/, ""))
      .join("\n")
      .trim();

    if (!content) {
      buf = [];
      inBlock = false;
      return;
    }

    const one = content.replace(/\s+/g, " ").trim();
    const isShort = one.length <= 90 && content.split("\n").filter(Boolean).length <= 2;

    if (isShort) out.push(toInlineCode(one));
    else out.push(one);

    buf = [];
    inBlock = false;
  }

  for (const line of lines) {
    const isIndented = /^( {4}|\t)/.test(line);

    if (isIndented) {
      inBlock = true;
      buf.push(line);
      continue;
    }

    if (inBlock) flush();
    out.push(line);
  }

  if (inBlock) flush();
  return out.join("\n");
}

function ensureHeadings(md, { lang = "fa", mode = "merge" } = {}) {
  const fa = lang !== "en";

  const hDiff = fa ? "## تفاوت‌های فنی" : "## Technical Differences";

  if (String(mode).toLowerCase() === "advice") {
    const hA = fa ? "## پیشنهادهای بهبود برای کد A" : "## Improvement Suggestions for Code A";
    const hB = fa ? "## پیشنهادهای بهبود برای کد B" : "## Improvement Suggestions for Code B";

    let t = s(md);

    t = t.replace(/^#{1,6}\s*(تفاوت ها|تفاوت‌ها|تفاوت)\s*$/gmu, hDiff);
    t = t.replace(/^#{1,6}\s*(پیشنهاد.*A|پیشنهاد.*کد\s*A)\s*$/gmu, hA);
    t = t.replace(/^#{1,6}\s*(پیشنهاد.*B|پیشنهاد.*کد\s*B)\s*$/gmu, hB);

    t = t.replace(/^#{1,6}\s*(differences|diff)\s*$/gmu, hDiff);
    t = t.replace(/^#{1,6}\s*(improvement\s*suggestions\s*for\s*code\s*a)\s*$/gmu, hA);
    t = t.replace(/^#{1,6}\s*(improvement\s*suggestions\s*for\s*code\s*b)\s*$/gmu, hB);

    const hasDiff = t.includes(hDiff);
    const hasA = t.includes(hA);
    const hasB = t.includes(hB);

    if (hasDiff && hasA && hasB) return t;

    const body = t.trim();
    return [
      hDiff,
      "",
      body || (fa ? "تحلیل ارائه نشد." : "No analysis provided."),
      "",
      hA,
      "",
      fa ? "- (پیشنهادی ارائه نشد)" : "- (No suggestions provided)",
      "",
      hB,
      "",
      fa ? "- (پیشنهادی ارائه نشد)" : "- (No suggestions provided)",
    ].join("\n");
  }

  const hMerge = fa ? "## کد Merge نهایی" : "## Final Merged Code";

  let t = s(md);

  t = t.replace(/^#{1,6}\s*(تفاوت ها|تفاوت‌ها|تفاوت)\s*$/gmu, hDiff);
  t = t.replace(/^#{1,6}\s*(کد\s*نهایی|کد\s*مرج\s*نهایی|کد\s*Merged\s*نهایی|کد\s*Merge\s*نهایی)\s*$/gmu, hMerge);

  t = t.replace(/^#{1,6}\s*(differences|diff)\s*$/gmu, hDiff);
  t = t.replace(/^#{1,6}\s*(final\s*merged\s*code|merged\s*code|final\s*code)\s*$/gmu, hMerge);

  const hasDiff = t.includes(hDiff);
  const hasMerge = t.includes(hMerge);

  if (!hasDiff && !hasMerge) {
    return [
      hDiff,
      "",
      t.trim(),
      "",
      hMerge,
      "",
      "```txt\n" + (fa ? "کد نهایی ارائه نشد." : "Final code not provided.") + "\n```",
    ].join("\n");
  }

  if (!hasDiff && hasMerge) {
    t = [hDiff, "", fa ? "تحلیل تفاوت‌ها در این بخش ارائه می‌شود." : "Differences analysis goes here.", "", t.trim()].join("\n");
  }

  if (hasDiff && !hasMerge) {
    t = [t.trim(), "", hMerge, "", "```txt\n" + (fa ? "کد نهایی ارائه نشد." : "Final code not provided.") + "\n```"].join("\n");
  }

  return t;
}

function enforceNoBlocks(md) {
  let t = s(md);
  t = stripFencesToInline(t);
  t = stripIndentedBlocks(t);
  return t;
}

function normalizeInlineFences(md) {
  let t = s(md);
  // ```python import x ...``` => ```python\nimport x ...\n```
  t = t.replace(/```(\w+)([ \t]+)([^\n][\s\S]*?)```/g, (_full, lang, _sp, body) => {
    const l = s(lang).trim();
    const b = s(body).trim();
    return "```" + (l || "") + "\n" + b + "\n```";
  });
  return t;
}

function normalizeLangToken(lang) {
  const l = String(lang || "").toLowerCase().trim();
  const map = {
    auto: "",
    py: "python",
    python3: "python",
    js: "javascript",
    node: "javascript",
    ts: "typescript",
    "c#": "csharp",
    "c-sharp": "csharp",
    cs: "csharp",
    "c++": "cpp",
    hpp: "cpp",
    cc: "cpp",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    ps1: "powershell",
    psm1: "powershell",
    yml: "yaml",
  };
  return map[l] || l;
}

function chooseFenceLang(opts = {}) {
  const c = s(opts.fenceLang || opts.detectedLang || opts.detectedLangA || opts.codeLangA || opts.codeLang || "")
    .toLowerCase()
    .trim();
  if (!c) return "txt";

  if (c === "csharp" || c === "cs") return "csharp";
  if (c === "js") return "javascript";
  if (c === "ts") return "typescript";
  if (c === "py") return "python";
  if (c === "shell") return "bash";
  if (c === "c++") return "cpp";
  if (c === "auto") return "txt";
  return c;
}

function sanitizeLeadingLangLabel(code, fenceLang) {
  let c = s(code).replace(/\r/g, "").trim();
  if (!c) return c;

  const fl = normalizeLangToken(fenceLang);

  const candidates = new Set([
    fl,
    "auto",
    "python",
    "javascript",
    "typescript",
    "java",
    "go",
    "rust",
    "cpp",
    "c",
    "csharp",
    "php",
    "ruby",
    "kotlin",
    "swift",
    "scala",
    "dart",
    "bash",
    "powershell",
    "sql",
    "json",
    "yaml",
    "xml",
    "html",
    "css",
    "txt",
  ]);

  const escaped = Array.from(candidates)
    .filter(Boolean)
    .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  // "<lang> " OR "<lang>:" at start
  const re = new RegExp(`^\\s*(?:${escaped})\\s*(?::)?\\s+`, "i");
  c = c.replace(re, "").trim();

  return c;
}

/* ---------------------- formatters (optional deps) ---------------------- */

async function tryPrettierFormat(code, fenceLang) {
  const lang = normalizeLangToken(fenceLang);
  let parser = "";

  if (lang === "javascript") parser = "babel";
  else if (lang === "typescript") parser = "typescript";
  else if (lang === "json") parser = "json";
  else if (lang === "yaml") parser = "yaml";
  else return null;

  try {
    const prettier = await import("prettier");
    const formatted = await prettier.format(s(code), { parser });
    return s(formatted).trimEnd();
  } catch {
    return null;
  }
}

async function trySqlFormat(code) {
  try {
    const mod = await import("sql-formatter");
    const format = mod?.format || mod?.default?.format;
    if (typeof format !== "function") return null;
    return s(format(s(code), { language: "sql" })).trimEnd();
  } catch {
    return null;
  }
}

function tryJsonFormat(code) {
  const t = s(code).trim();
  if (!t) return null;
  try {
    const obj = JSON.parse(t);
    return JSON.stringify(obj, null, 2);
  } catch {
    return null;
  }
}

/* ---------------------- fallback: brace-based pretty ---------------------- */

function bracePretty(code) {
  const src = s(code).replace(/\r/g, "").trim();
  if (!src) return src;

  const lines = src.split("\n").filter((x) => x.trim());
  if (lines.length >= 6) return src;

  let t = src.replace(/\s+/g, " ");

  t = t.replace(/;/g, ";\n");
  t = t.replace(/{/g, "{\n");
  t = t.replace(/}/g, "\n}\n");

  const out = [];
  let indent = 0;
  for (const raw of t.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("}")) indent = Math.max(0, indent - 1);
    out.push("  ".repeat(indent) + line);
    if (line.endsWith("{")) indent += 1;
  }

  const result = out.join("\n").trim();
  return result.split("\n").length >= 4 ? result : src;
}

/* ---------------------- Python deterministic formatter (STRONGER) ---------------------- */

/**
 * هدف: اگر کد python "minified / one-line-ish" باشد، آن را multi-line + قابل اجرا کنیم.
 * محدودیت: formatter کامل نیست، اما باید:
 * - try/with/for/if/def/class و ... را multiline کند
 * - indentation deterministic بدهد
 * - حداقل برای خروجی‌های LLM که یک‌خطی می‌آیند، قابل کپی و اجرا شود
 */
function pythonForceMultiline(code) {
  let t = s(code).replace(/\r/g, " ").trim();
  if (!t) return t;

  // unwrap whole-body inline ticks
  if (/^`[\s\S]*`$/.test(t) && t.length >= 2) {
    t = t.slice(1, -1).trim();
  }

  t = sanitizeLeadingLangLabel(t, "python");

  // اگر همین الان multi-line و indent دارد، دست نزن (برای حفظ کیفیت)
  const hasNewline = t.includes("\n");
  const hasIndent = t.split("\n").some((x) => /^\s{2,}\S/.test(x));
  if (hasNewline && hasIndent) return t.replace(/\n{3,}/g, "\n\n").trim();

  // Normalize spaces
  t = t.replace(/[ \t]+/g, " ").trim();

  // 1) New line before major starters
  const starters = [
    "from __future__ import",
    "from ",
    "import ",
    "class ",
    "def ",
    "if __name__ ==",
    "try:",
    "except ",
    "finally:",
    "with ",
    "for ",
    "while ",
    "return ",
    "raise ",
    "break",
    "continue",
    "pass",
  ];

  for (const st of starters) {
    const re = new RegExp(`\\s+(${st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g");
    t = t.replace(re, "\n$1");
  }

  // 2) Split *real* block headers "X: <body>" into "X:\n<body>"
  // Only for keywords that create blocks to avoid type hints like "path: Path | str"
  t = t.replace(
    /((?:def|class|if|elif|else|for|while|with|try|except|finally)\b[^\n]*?):\s+(?=\S)/g,
    "$1:\n"
  );

  // 3) Also split chained blocks like "try:\nwith ...:\nfor ...:\n"
  t = t.replace(/\n(try:)\s*(with\b)/g, "\n$1\n$2");
  t = t.replace(/\n(with\b[^\n]*?):\s*(for\b)/g, "\n$1:\n$2");
  t = t.replace(/\n(for\b[^\n]*?):\s*(if\b)/g, "\n$1:\n$2");
  t = t.replace(/\n(except\b[^\n]*?):\s*(return\b|raise\b|pass\b|continue\b|break\b)/g, "\n$1:\n$2");

  // 4) Turn "a b c d" long lines into multiple statements heuristically:
  // we split before assignments and before common keywords when line is too long
  const rawLines = t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const lines2 = [];
  for (const ln of rawLines) {
    if (ln.length <= 120) {
      lines2.push(ln);
      continue;
    }

    // break before "name =" (simple)
    let cur = ln;
    // prevent infinite loops
    for (let i = 0; i < 40; i++) {
      const m = cur.match(/(.+?)(\s+[A-Za-z_]\w*\s*=\s+)([\s\S]+)/);
      if (!m) break;
      const left = m[1].trim();
      const assign = (m[2] || "").trim();
      const rest = (m[3] || "").trim();
      if (left) lines2.push(left);
      cur = (assign + rest).trim();
      if (cur.length <= 120) break;
    }
    if (cur) lines2.push(cur);
  }

  // 5) Indent pass based on ":" blocks
  const out = [];
  let indent = 0;

  const isDedentStarter = (line) => /^(elif\b|else:|except\b|finally:)/.test(line);
  const isBlockStarter = (line) =>
    /^(def\b|class\b|if\b|elif\b|else:|for\b|while\b|with\b|try:|except\b|finally:)/.test(line) && line.endsWith(":");

  const isHardTopLevel = (line) => /^(def\b|class\b|if\s+__name__\b)/.test(line);

  for (let i = 0; i < lines2.length; i++) {
    let line = lines2[i].trim();
    if (!line) continue;

    // ensure block headers end with ":" when they should
    if (/^(try|finally|else)\b/.test(line) && !line.endsWith(":")) line += ":";

    if (isDedentStarter(line)) indent = Math.max(0, indent - 1);

    out.push("    ".repeat(indent) + line);

    if (isBlockStarter(line)) {
      indent += 1;
      continue;
    }

    const next = (lines2[i + 1] || "").trim();
    if (isHardTopLevel(next)) indent = 0;
  }

  // 6) blank line after imports cluster
  let lastImport = -1;
  for (let i = 0; i < out.length; i++) {
    if (/^\s*(from|import)\b/.test(out[i])) lastImport = i;
  }
  if (lastImport >= 0 && out[lastImport + 1] !== "") out.splice(lastImport + 1, 0, "");

  // 7) Final cleanup: if still one-line-ish, do a very safe split on " ; " (rare in py) and on " ) " etc not safe
  const result = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  // Guarantee multi-line if it looks minified
  if (result.split("\n").filter(Boolean).length < 4 && result.length > 140) {
    // last resort: split on " def ", " if ", " for ", " with ", " try:" to make copyable
    return result
      .replace(/\s+(def\s+)/g, "\n\n$1")
      .replace(/\s+(if\s+__name__\s*==)/g, "\n\n$1")
      .replace(/\s+(try:)/g, "\n$1")
      .replace(/\s+(with\s+)/g, "\n$1")
      .replace(/\s+(for\s+)/g, "\n$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return result;
}

/* ---------------------- detect minified-ish ---------------------- */

function isMinifiedOrOneLine(code) {
  const c = s(code).replace(/\r/g, "").trim();
  if (!c) return false;
  const lines = c.split("\n").map((x) => x.trim()).filter(Boolean);

  if (lines.length === 1 && c.length >= 120) return true;

  const longLines = lines.filter((x) => x.length >= 160).length;
  const hasIndent = lines.some((x) => /^\s{2,}\S/.test(x));

  if (lines.length <= 3 && (longLines >= 1 || c.length >= 260) && !hasIndent) return true;

  return false;
}

/* ---------------------- FORCE fence from plain/inline merge code ---------------------- */

function forceMergeFenceFromInline(md, { lang = "fa", fenceLang = "txt" } = {}) {
  const fa = lang !== "en";
  const hMerge = fa ? "## کد Merge نهایی" : "## Final Merged Code";

  const t = s(md);
  const idx = t.indexOf(hMerge);
  if (idx < 0) return t;

  const before = t.slice(0, idx + hMerge.length);
  const after0 = t.slice(idx + hMerge.length);

  // If there is already any fence after the heading, do nothing.
  if (/```/.test(after0)) return t;

  const after = after0.replace(/^\s*\n+/, "");
  if (!after.trim()) return t;

  // Collect merge body lines (until next "## " heading, if any)
  const lines = after.split("\n");
  const bodyLines = [];
  let restLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*##\s+/.test(line)) {
      restLines = lines.slice(i);
      break;
    }
    bodyLines.push(line);
  }

  let body = bodyLines.join("\n").trim();
  if (!body) return t;

  // unwrap whole-body inline backticks
  if (/^`[\s\S]*`$/.test(body) && body.length >= 2) {
    body = body.slice(1, -1).trim();
  }

  body = sanitizeLeadingLangLabel(body, fenceLang);
  if (!body.trim()) return t;

  const fenced =
    "\n\n```" +
    (fenceLang || "txt") +
    "\n" +
    body.trimEnd() +
    "\n```\n" +
    (restLines.length ? restLines.join("\n") : "");

  return before + fenced;
}

function forceInlineBacktickMergeToFence(md, opts = {}) {
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const fa = lang !== "en";
  const hMerge = fa ? "## کد Merge نهایی" : "## Final Merged Code";
  const fenceLang = chooseFenceLang(opts) || "txt";

  let t = s(md || "");
  const idx = t.indexOf(hMerge);
  if (idx < 0) return t;

  const before = t.slice(0, idx + hMerge.length);
  const after0 = t.slice(idx + hMerge.length);

  if (/```/.test(after0)) return t;

  const after = after0.replace(/^\s*\n+/, "");
  if (!after.trim()) return t;

  const lines = after.split("\n");

  const bodyLines = [];
  let restLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*##\s+/.test(lines[i])) {
      restLines = lines.slice(i);
      break;
    }
    bodyLines.push(lines[i]);
  }

  let body = bodyLines.join("\n").trim();
  if (!body) return t;

  if (!(body.startsWith("`") && body.endsWith("`") && body.length >= 2)) return t;

  body = body.slice(1, -1).trim();
  body = sanitizeLeadingLangLabel(body, fenceLang);

  const normLang = normalizeLangToken(fenceLang);
  if (normLang === "python") {
    body = pythonForceMultiline(body);
  } else if (isMinifiedOrOneLine(body)) {
    body = bracePretty(body);
  }

  const fenced = `\n\n\`\`\`${fenceLang}\n${s(body).trimEnd()}\n\`\`\`\n`;
  return before + fenced + (restLines.length ? restLines.join("\n") : "");
}

/* ---------------------- merge fence prettifier (all langs) ---------------------- */

/**
 * IMPORTANT:
 * We only prettify the FIRST fenced block that exists AFTER merge rules have been applied,
 * which (by design) is the merge final code fence.
 */
async function prettifyMergedFence(md, { fenceLang = "txt" } = {}) {
  const lang = normalizeLangToken(fenceLang);

  // only first fenced block (after enforceMergeRulesSyncPart, this is merge fence)
  const match = s(md).match(/```([^\n]*)\n([\s\S]*?)```/m);
  if (!match) return md;

  const full = match[0];
  const fenceHeader = s(match[1]).trim() || lang || "txt";
  let inner = s(match[2]).trimEnd();

  inner = sanitizeLeadingLangLabel(inner, lang);

  // ✅ PYTHON: ALWAYS enforce multiline if code looks minified OR if it contains block-ish keywords
  if (lang === "python") {
    const triggers =
      isMinifiedOrOneLine(inner) ||
      /\b(def|class|try:|except\b|with\b|for\b|while\b|if\s+__name__\b)\b/.test(inner) ||
      inner.startsWith("from ") ||
      inner.startsWith("import ");

    if (triggers) {
      const py = pythonForceMultiline(inner);
      const replaced = "```" + (fenceHeader || "python") + "\n" + s(py).trimEnd() + "\n```";
      return s(md).replace(full, replaced);
    }
  }

  let formatted = inner;

  // Non-python: prettify if minified
  if (isMinifiedOrOneLine(inner)) {
    if (lang === "json") {
      const jf = tryJsonFormat(inner);
      if (jf) formatted = jf;
    }

    if (formatted === inner) {
      const p = await tryPrettierFormat(inner, lang);
      if (p) formatted = p;
    }

    if (formatted === inner && lang === "sql") {
      const sf = await trySqlFormat(inner);
      if (sf) formatted = sf;
    }

    if (formatted === inner) {
      formatted = bracePretty(inner);
    }
  }

  if (isMinifiedOrOneLine(formatted)) {
    formatted = bracePretty(formatted);
  }

  const replaced = "```" + fenceHeader + "\n" + s(formatted).trimEnd() + "\n```";
  return s(md).replace(full, replaced);
}

/* ---------------------- merge rules (keep exactly one fence) ---------------------- */

function enforceMergeRulesSyncPart(md, opts = {}) {
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const fa = lang !== "en";
  const hMerge = fa ? "## کد Merge نهایی" : "## Final Merged Code";

  let t = s(md);
  const fenceLang = chooseFenceLang(opts);

  t = normalizeInlineFences(t);

  // 1) If merge has plain/inline, force it into a fence
  t = forceMergeFenceFromInline(t, { lang, fenceLang });

  // 2) Guarantee: if still inline-backtick, force to fence
  t = forceInlineBacktickMergeToFence(t, { ...opts, lang });

  const idx = t.indexOf(hMerge);
  if (idx < 0) {
    t = stripFencesToInline(t);
    t = stripIndentedBlocks(t);
    return { text: t, fenceLang };
  }

  let before = t.slice(0, idx);
  let after = t.slice(idx);

  // before merge heading: no fences, no indented blocks
  before = stripFencesToInline(before);
  before = stripIndentedBlocks(before);

  // after merge heading: keep ONLY the first fenced block, convert other fences to inline
  let kept = 0;
  after = after.replace(/```[^\n]*\n([\s\S]*?)```/g, (full) => {
    if (kept < 1) {
      kept += 1;
      return full;
    }
    const inner = full.replace(/```[^\n]*\n([\s\S]*?)```/m, "$1");
    const firstLine =
      s(inner)
        .trim()
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter(Boolean)[0] || s(inner).trim();
    return toInlineCode(firstLine);
  });

  after = after.replace(/```([^`]+)```/g, (_m, inner2) => toInlineCode(inner2));
  after = stripIndentedBlocks(after);
  after = normalizeInlineFences(after);

  return { text: (before + after).trim(), fenceLang };
}

async function enforceMergeRules(md, opts = {}) {
  const { text, fenceLang } = enforceMergeRulesSyncPart(md, opts);
  return await prettifyMergedFence(text, { fenceLang });
}

/* ---------------------- FINAL normalizer ---------------------- */

export async function normalizeCompareMarkdown(md, opts = {}) {
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const mode = s(opts.mode || opts.compareOutputMode || "merge").toLowerCase() === "advice" ? "advice" : "merge";

  let t = s(md || "");
  t = stripNoiseLines(t, { lang });
  t = ensureHeadings(t, { lang, mode });

  if (mode === "advice") {
    t = enforceNoBlocks(t);
    t = collapseExtraBlankLines(t).trim() + "\n";
    return t;
  }

  // merge: allow exactly one fenced block under final heading only
  t = await enforceMergeRules(t, { ...opts, lang });

  // ✅ FINAL GUARANTEE: if still inline-backtick, force to fence
  t = forceInlineBacktickMergeToFence(t, { ...opts, lang });

  // ✅ HARD STRIP for "auto " leakage
  t = t.replace(/```([^\n]*)\n[ \t]*auto[ \t]+/gi, "```$1\n");
  t = t.replace(/`[ \t]*auto[ \t]+/gi, "`");
  t = t.replace(/(##\s+(?:کد\s+Merge\s+نهایی|Final\s+Merged\s+Code)\s*\n\s*\n)[ \t]*auto[ \t]+/gi, "$1");

  t = collapseExtraBlankLines(t).trim() + "\n";
  return t;
}

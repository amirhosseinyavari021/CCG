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

function pickCommandValue(x) {
  if (typeof x === "string") return x.trim();
  if (x && typeof x === "object") {
    const v = x.command || x.cmd || x.code || x.text || x.value;
    if (typeof v === "string") return v.trim();
  }
  return "";
}

function normalizeAlternatives(arr) {
  const list = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const command = pickCommandValue(item);
    if (!command || seen.has(command)) continue;
    seen.add(command);
    if (item && typeof item === "object") {
      out.push({
        label: typeof item.label === "string" ? item.label : "alternative",
        command,
        lang: typeof item.lang === "string" ? item.lang : undefined,
      });
    } else {
      out.push(command);
    }
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

  if (command) out.push(cmdTitle, "", "```" + cli, s(command).trim(), "```", "");
  if (explanation) out.push(expTitle, "", s(explanation).trim(), "");
  if (warning) out.push(warnTitle, "", `> ${s(warning).trim()}`, "");

  if (alternatives && alternatives.length) {
    out.push(altTitle, "");
    for (const c of alternatives) out.push("```" + cli, s(pickCommandValue(c) || c).trim(), "```", "");
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
    rawText = s(input.text) || s(input.rawText) || s(input.markdown) || s(input.output) || JSON.stringify(input);
  } else {
    rawText = s(input);
  }

  const parsed = tryParseJSON(rawText);

  if (parsed && isObj(parsed)) {
    const tool = isObj(parsed.tool) ? parsed.tool : null;
    const src = tool || parsed;

    const mode = s(parsed.mode || src.mode).toLowerCase();
    const command = s(src.command || src?.primary?.command || src?.primary_command).trim();

    const alternatives = normalizeAlternatives(src.alternatives || src.moreCommands || []);
    const details = uniq(src.details || src.moreDetails || src.notes || []);

    const warning = s(src.warning || (Array.isArray(src.warnings) ? src.warnings.join("\n") : src.warnings)).trim();
    const explanation = s(
      src.explanation || (Array.isArray(src.explanations) ? src.explanations.join("\n") : src.explanations)
    ).trim();

    const rawLang = s(src.lang || src.language).toLowerCase();
    const isPythonMode = mode === "python" || rawLang === "python" || rawLang === "py";
    const pythonScript = s(
      isPythonMode
        ? (src.pythonScript || src.python_script || src.script || src?.primary?.command || src.command)
        : (src.pythonScript || src.python_script)
    ).trim();
    const pythonNotes = s(src.pythonNotes || src.notes).trim();

    if (isPythonMode || pythonScript) {
      return {
        markdown: buildMarkdown({ lang, pythonScript, pythonNotes }),
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
      warnings: warning ? splitLines(warning) : [],
      explanation: explanation ? splitLines(explanation) : [],
      notes: details,
      pythonScript: "",
    };
  }

  // raw markdown passthrough for generate path
  return {
    markdown: s(rawText).trim(),
    commands: [],
    moreCommands: [],
    pythonScript: "",
  };
}

export const formatAIOutput = formatOutput;

/* -------------------------------------------------------------------------- */
/*                   Comparator Normalizer (WEB Compare only)                  */
/* -------------------------------------------------------------------------- */

function collapseExtraBlankLines(md) {
  return s(md).replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n");
}

function stripNoiseLines(md, { lang = "fa" } = {}) {
  const fa = lang !== "en";
  const lines = s(md).replace(/\r\n/g, "\n").split("\n");
  const out = [];

  const isJunk = (line) => {
    const t = s(line).trim();
    if (!t) return false;

    if (/^(CODE|Copy)$/i.test(t)) return true;
    if (fa && /^(کپی|کپي)$/u.test(t)) return true;

    if (/^(auto|python|javascript|typescript|node|bash|zsh|sh|powershell|ps1|cmd|bat)$/i.test(t)) return true;
    if (/^(c\#|csharp|c\+\+|cpp|java|go|rust|php|ruby|kotlin|swift|scala|dart|txt)$/i.test(t)) return true;

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

/* ---------------------- helpers: extract fenced code ---------------------- */

export function extractFirstFencedCode(md = "") {
  const t = s(md);
  const m = t.match(/```([^\n]*)\n([\s\S]*?)```/m);
  if (!m) return null;
  return { fenceLang: s(m[1]).trim() || "txt", code: s(m[2]).replace(/\r\n/g, "\n") };
}

/* ---------------------- language normalize ---------------------- */

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

function sniffLangFromCode(code = "") {
  const t = s(code);

  // python signals
  if (/\basync\s+def\b/.test(t)) return "python";
  if (/\bdef\s+\w+\s*\(/.test(t) && /^\s*(from|import)\s+/m.test(t)) return "python";
  if (/\bif\s+__name__\s*==\s*["']__main__["']/.test(t)) return "python";
  if (/\bfrom\s+typing\s+import\b/.test(t)) return "python";
  if (/\bimport\s+asyncio\b/.test(t)) return "python";

  // js/ts signals
  if (/\bfunction\b|\bconst\b|\blet\b|\b=>\b/.test(t)) return "javascript";
  if (/\binterface\b|\btype\b\s+\w+\s*=/.test(t)) return "typescript";

  return "txt";
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

/* ---------------------- JS/TS fallback pretty ---------------------- */

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

/* -------------------------------------------------------------------------- */
/*                           PYTHON: SAFE FORMATTER                            */
/* -------------------------------------------------------------------------- */

function pythonProtectStrings(src) {
  const t = s(src).replace(/\r\n/g, "\n");
  const parts = [];
  const literals = [];

  let i = 0;

  const isPrefixChar = (ch) => /[fFrRuUbB]/.test(ch);

  function pushLiteral(lit) {
    const key = `__CCG_STR_${literals.length}__`;
    literals.push(lit);
    parts.push(key);
  }

  while (i < t.length) {
    const ch = t[i];

    let j = i;
    let prefix = "";
    while (j < t.length && isPrefixChar(t[j]) && prefix.length < 3) {
      prefix += t[j];
      j++;
    }

    const q = t[j];
    const q2 = t[j + 1];
    const q3 = t[j + 2];

    const isQuote = q === "'" || q === '"';
    const isTriple = isQuote && q2 === q && q3 === q;

    if (isQuote) {
      const start = i;
      const quoteChar = q;
      const triple = isTriple;
      let k = triple ? j + 3 : j + 1;

      while (k < t.length) {
        if (!triple) {
          if (t[k] === "\\" && k + 1 < t.length) {
            k += 2;
            continue;
          }
          if (t[k] === quoteChar) {
            k += 1;
            break;
          }
          k += 1;
        } else {
          if (t[k] === quoteChar && t[k + 1] === quoteChar && t[k + 2] === quoteChar) {
            k += 3;
            break;
          }
          k += 1;
        }
      }

      const lit = t.slice(start, k);
      pushLiteral(lit);
      i = k;
      continue;
    }

    parts.push(ch);
    i += 1;
  }

  return { text: parts.join(""), literals };
}

function pythonRestoreStrings(protectedText, literals) {
  let out = s(protectedText);
  for (let idx = 0; idx < literals.length; idx++) {
    const key = `__CCG_STR_${idx}__`;
    out = out.split(key).join(literals[idx]);
  }
  return out;
}

function repairPythonBraceBlocks(code = "") {
  let t = s(code);

  // { \n expr \n } => {expr} (expr can be complex; normalize whitespace)
  t = t.replace(/\{\s*\n\s*([\s\S]*?)\s*\n\s*\}/g, (_m, inner) => {
    const x = s(inner).replace(/\s+/g, " ").trim();
    return "{" + x + "}";
  });

  // {   expr   } => {expr}
  t = t.replace(/\{\s*([\s\S]*?)\s*\}/g, (_m, inner) => {
    const x = s(inner).replace(/\s+/g, " ").trim();
    return "{" + x + "}";
  });

  return t;
}

function pythonForceMultilineSafe(code) {
  let src = s(code).replace(/\r/g, " ").trim();
  if (!src) return src;

  const pack = pythonProtectStrings(src);
  let t = pack.text;

  const hasNewline = t.includes("\n");
  const hasIndent = t.split("\n").some((x) => /^\s{2,}\S/.test(x));
  if (hasNewline && hasIndent) {
    const restored = pythonRestoreStrings(t, pack.literals);
    return repairPythonBraceBlocks(restored).replace(/\n{3,}/g, "\n\n").trim();
  }

  t = t.replace(/[ \t]+/g, " ").trim();

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

  t = t.replace(/((?:def|class|if|elif|else|for|while|with|try|except|finally)\b[^\n]*?):\s+(?=\S)/g, "$1:\n");

  const rawLines = t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const lines2 = [];
  for (const ln of rawLines) {
    if (ln.length <= 140) {
      lines2.push(ln);
      continue;
    }
    let cur = ln;
    for (let i = 0; i < 40; i++) {
      const m = cur.match(/(.+?)(\s+[A-Za-z_]\w*\s*=\s+)([\s\S]+)/);
      if (!m) break;
      const left = m[1].trim();
      const assign = (m[2] || "").trim();
      const rest = (m[3] || "").trim();
      if (left) lines2.push(left);
      cur = (assign + rest).trim();
      if (cur.length <= 140) break;
    }
    if (cur) lines2.push(cur);
  }

  const out = [];
  let indent = 0;

  const isDedentStarter = (line) => /^(elif\b|else:|except\b|finally:)/.test(line);
  const isBlockStarter = (line) =>
    /^(def\b|class\b|if\b|elif\b|else:|for\b|while\b|with\b|try:|except\b|finally:)/.test(line) && line.endsWith(":");

  for (let i = 0; i < lines2.length; i++) {
    let line = lines2[i].trim();
    if (!line) continue;

    if (isDedentStarter(line)) indent = Math.max(0, indent - 1);
    out.push("    ".repeat(indent) + line);

    if (isBlockStarter(line)) {
      indent += 1;
      continue;
    }

    const next = (lines2[i + 1] || "").trim();
    if (/^(def\b|class\b|if\s+__name__\b)/.test(next)) indent = 0;
  }

  let lastImport = -1;
  for (let i = 0; i < out.length; i++) {
    if (/^\s*(from|import)\b/.test(out[i])) lastImport = i;
  }
  if (lastImport >= 0 && out[lastImport + 1] !== "") out.splice(lastImport + 1, 0, "");

  let restored = pythonRestoreStrings(out.join("\n"), pack.literals);
  restored = repairPythonBraceBlocks(restored);

  return restored.replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------------------- POST-PROCESS MERGE (main) ---------------------- */

export async function postProcessMergeCode(rawCode = "", hintedLang = "txt") {
  let code = s(rawCode).replace(/\r\n/g, "\n").trim();
  if (!code) return "";

  let lang = normalizeLangToken(hintedLang || "txt");
  if (!lang || lang === "txt" || lang === "auto") lang = sniffLangFromCode(code);

  if (lang === "python") {
    const fixed = pythonForceMultilineSafe(code);
    return fixed.trimEnd() + "\n";
  }

  const p = await tryPrettierFormat(code, lang);
  if (p) return s(p).trimEnd() + "\n";

  if (isMinifiedOrOneLine(code)) code = bracePretty(code);
  return s(code).trimEnd() + "\n";
}

/* ---------------------- FINAL normalizer (kept safe) ---------------------- */

export async function normalizeCompareMarkdown(md, opts = {}) {
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";

  let t = s(md || "");
  t = stripNoiseLines(t, { lang });

  // Keep markdown stable; merge code is handled by routes via extract + postProcess
  t = collapseExtraBlankLines(t).trim() + "\n";
  return t;
}
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

  // Lines that are UI labels / junk that should NEVER be inside markdown
  const isJunk = (line) => {
    const t = s(line).trim();
    if (!t) return false;

    if (/^(CODE|Copy)$/i.test(t)) return true;
    if (fa && /^(کپی|کپي)$/u.test(t)) return true;

    // Model sometimes prints language labels alone
    if (/^(python|javascript|typescript|node|bash|zsh|sh|powershell|ps1|cmd|bat)$/i.test(t)) return true;
    if (/^(c\#|csharp|c\+\+|cpp|java|go|rust|php|ruby|kotlin|swift|scala|dart)$/i.test(t)) return true;

    // Very common "instruction leakage" words in fa/en
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

function looksLikeCode(line) {
  const t = s(line);
  if (!t.trim()) return false;

  // high-signal tokens across many languages
  if (/[;{}]/.test(t)) return true;
  if (/^\s*(using|namespace|class|public|private|static|void|int|string|var)\b/i.test(t)) return true; // C#/Java-ish
  if (/^\s*(def|class|import|from|if\s+__name__)\b/i.test(t)) return true; // Python
  if (/^\s*(function|const|let|var|import|export)\b/i.test(t)) return true; // JS/TS
  if (/^\s*#include\b/.test(t)) return true; // C/C++
  if (/^\s*(package|func)\b/i.test(t)) return true; // Go
  if (/^\s*(fn|let|use|impl)\b/i.test(t)) return true; // Rust

  // indentation with operators typical for code
  if (/^\s{2,}\S/.test(t)) return true;

  return false;
}

function chooseFenceLang(opts = {}) {
  // prefer explicit opts, then detected language (passed from route), else "txt"
  const c = s(opts.fenceLang || opts.detectedLang || opts.detectedLangA || opts.codeLangA || opts.codeLang || "").toLowerCase().trim();
  if (!c) return "txt";

  // normalize some common names
  if (c === "csharp") return "csharp";
  if (c === "cs") return "csharp";
  if (c === "js") return "javascript";
  if (c === "ts") return "typescript";
  if (c === "py") return "python";
  if (c === "shell") return "bash";

  return c;
}

function wrapMergeSectionIfMissingFence(md, { lang = "fa", fenceLang = "txt" } = {}) {
  const fa = lang !== "en";
  const hMerge = fa ? "## کد Merge نهایی" : "## Final Merged Code";

  const t = s(md);
  const idx = t.indexOf(hMerge);
  if (idx < 0) return t;

  const before = t.slice(0, idx + hMerge.length);
  let after = t.slice(idx + hMerge.length);

  // If there is already any fence after the heading, do nothing.
  if (/```/.test(after)) return t;

  // Collect merge body lines (until next "## " heading, if any)
  const lines = after.replace(/^\s*\n+/, "").split("\n");
  const bodyLines = [];
  let restLines = [];
  let hitNextHeading = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*##\s+/.test(line)) {
      hitNextHeading = true;
      restLines = lines.slice(i);
      break;
    }
    bodyLines.push(line);
  }
  if (!hitNextHeading) restLines = [];

  // Clean body from junk empty headers
  const cleaned = bodyLines
    .map((x) => s(x).replace(/\r/g, ""))
    .filter((x) => !/^\s*(CODE|Copy|کپی|کپي)\s*$/i.test(s(x).trim()))
    .filter((x) => !/^\s*(python|javascript|typescript|c\#|csharp|java|go|rust|cpp|c\+\+)\s*$/i.test(s(x).trim()));

  const hasAny = cleaned.some((x) => s(x).trim());
  if (!hasAny) {
    const msg = fa ? "کد نهایی ارائه نشد." : "Final code not provided.";
    const rebuilt = "\n\n```txt\n" + msg + "\n```\n" + restLines.join("\n");
    return before + rebuilt;
  }

  // Wrap only if it looks like code OR if it's multi-line content (better UX)
  const codey = cleaned.some((x) => looksLikeCode(x));
  const multiline = cleaned.filter((x) => s(x).trim()).length >= 2;

  if (!codey && !multiline) {
    // keep as text, but STILL wrap to guarantee Copy UX (your requirement)
    // (this avoids the UI not providing copy)
  }

  const fenced =
    "\n\n```" +
    fenceLang +
    "\n" +
    cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() +
    "\n```\n" +
    (restLines.length ? restLines.join("\n") : "");

  return before + fenced;
}

function enforceMergeRules(md, opts = {}) {
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const fa = lang !== "en";
  const hMerge = fa ? "## کد Merge نهایی" : "## Final Merged Code";

  let t = s(md);

  // First: ensure merge section ALWAYS ends up with exactly one fenced block
  const fenceLang = chooseFenceLang(opts);
  t = wrapMergeSectionIfMissingFence(t, { lang, fenceLang });

  const idx = t.indexOf(hMerge);
  if (idx < 0) {
    // if for some reason merge heading missing, just sanitize
    t = stripFencesToInline(t);
    t = stripIndentedBlocks(t);
    return t;
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

  after = after.replace(/```([^`]+)```/g, (_, inner) => toInlineCode(inner));
  after = stripIndentedBlocks(after);

  return (before + after).trim();
}

export function normalizeCompareMarkdown(md, opts = {}) {
  const lang = s(opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
  const mode = s(opts.mode || opts.compareOutputMode || "merge").toLowerCase() === "advice" ? "advice" : "merge";

  let t = s(md || "");
  t = stripNoiseLines(t, { lang });

  t = ensureHeadings(t, { lang, mode });

  if (mode === "advice") {
    // absolutely no code blocks anywhere
    t = enforceNoBlocks(t);
  } else {
    // merge: allow exactly one fenced block under final heading only
    t = enforceMergeRules(t, { ...opts, lang });
  }

  t = collapseExtraBlankLines(t).trim() + "\n";
  return t;
}

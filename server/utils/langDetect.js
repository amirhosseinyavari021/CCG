// /home/cando/CCG/server/utils/langDetect.js
// Lightweight but strong heuristic language detector (no AI).
// Goal: extremely low false positives, merge ONLY when confident.

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function normLang(x) {
  const t = s(x).toLowerCase().trim();
  if (!t) return "auto";
  if (t === "c#" || t === "csharp" || t === "cs") return "csharp";
  if (t === "js" || t === "javascript") return "javascript";
  if (t === "ts" || t === "typescript") return "typescript";
  if (t === "py" || t === "python") return "python";
  if (t === "sh" || t === "bash" || t === "zsh") return "bash";
  if (t === "ps" || t === "ps1" || t === "powershell") return "powershell";
  if (t === "yml" || t === "yaml") return "yaml";
  if (t === "json") return "json";
  if (t === "xml") return "xml";
  if (t === "html") return "html";
  if (t === "css") return "css";
  if (t === "c++" || t === "cpp") return "cpp";
  if (t === "c") return "c";
  if (t === "java") return "java";
  if (t === "go" || t === "golang") return "go";
  if (t === "rs" || t === "rust") return "rust";
  if (t === "php") return "php";
  if (t === "rb" || t === "ruby") return "ruby";
  if (t === "kt" || t === "kotlin") return "kotlin";
  if (t === "swift") return "swift";
  if (t === "scala") return "scala";
  if (t === "r") return "r";
  if (t === "lua") return "lua";
  if (t === "sql") return "sql";
  return t;
}

function stripStringsAndComments(code) {
  let t = s(code);
  // remove block comments
  t = t.replace(/\/\*[\s\S]*?\*\//g, " ");
  // remove line comments (//, #)
  t = t.replace(/(^|\s)\/\/.*$/gm, " ");
  t = t.replace(/(^|\s)#.*$/gm, " ");
  // remove single/double/backtick strings (best-effort)
  t = t.replace(/'([^'\\]|\\.)*'/g, "''");
  t = t.replace(/"([^"\\]|\\.)*"/g, '""');
  t = t.replace(/`([^`\\]|\\.)*`/g, "``");
  return t;
}

function countMatches(text, patterns) {
  let c = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) c += m.length;
  }
  return c;
}

function looksLikeJSON(raw) {
  const t = s(raw).trim();
  if (!t) return false;
  if (!(t.startsWith("{") || t.startsWith("["))) return false;
  // must contain ":" pairs (avoid confusing with JS object literal too)
  if (!/:\s*/.test(t)) return false;
  // no obvious code keywords
  if (/\b(function|def|class|using|namespace|public|private|console\.log)\b/i.test(t)) return false;
  return true;
}

function looksLikeYAML(raw) {
  const t = s(raw).trim();
  if (!t) return false;
  // common yaml patterns: key: value lines, list with "- "
  const lines = t.split(/\r?\n/).slice(0, 20);
  const hit = lines.filter((l) => /^\s*[\w.-]+\s*:\s*.+/.test(l) || /^\s*-\s+.+/.test(l)).length;
  // avoid python dict / js object confusion
  if (/[{};]/.test(t)) return false;
  return hit >= 3;
}

function looksLikeXML(raw) {
  const t = s(raw).trim();
  return /^<\?xml\b/i.test(t) || (t.startsWith("<") && /<\/[A-Za-z][\w:-]*>/.test(t));
}

function looksLikeHTML(raw) {
  const t = s(raw).trim();
  return /<!doctype html>/i.test(t) || /<html\b/i.test(t) || /<div\b|<span\b|<body\b/i.test(t);
}

function scoreLang(clean, raw) {
  const scores = new Map();

  // config / markup first (high precision)
  if (looksLikeJSON(raw)) scores.set("json", 10);
  if (looksLikeYAML(raw)) scores.set("yaml", 9);
  if (looksLikeXML(raw)) scores.set("xml", 9);
  if (looksLikeHTML(raw)) scores.set("html", 8);
  if (/^\s*[.#]?\w[\w-]*\s*{\s*[^}]*}\s*$/m.test(raw) && /:\s*[^;]+;/.test(raw)) scores.set("css", 7);

  // programming languages
  const add = (lang, n) => scores.set(lang, (scores.get(lang) || 0) + n);

  // Python
  add(
    "python",
    countMatches(clean, [
      /\bdef\s+\w+\s*\(/g,
      /\bimport\s+\w+/g,
      /\bfrom\s+\w+\s+import\s+/g,
      /\belif\b/g,
      /\bNone\b/g,
      /\bTrue\b|\bFalse\b/g,
      /^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/gm,
      /:\s*$/gm, // line-ending colon (weak)
    ])
  );

  // JavaScript
  add(
    "javascript",
    countMatches(clean, [
      /\bconsole\.log\s*\(/g,
      /\bfunction\s+\w*\s*\(/g,
      /\bconst\s+\w+/g,
      /\blet\s+\w+/g,
      /\bvar\s+\w+/g,
      /=>/g,
      /\brequire\s*\(/g,
      /\bmodule\.exports\b/g,
    ])
  );

  // TypeScript
  add(
    "typescript",
    countMatches(clean, [
      /\binterface\s+\w+/g,
      /\btype\s+\w+\s*=/g,
      /:\s*(string|number|boolean|any|unknown|never|void)\b/g,
      /\bas\s+\w+/g,
      /\bimplements\s+\w+/g,
      /\benum\s+\w+/g,
    ])
  );

  // C#
  add(
    "csharp",
    countMatches(clean, [
      /^\s*using\s+[A-Za-z0-9_.]+;\s*$/gm,
      /\bnamespace\s+[A-Za-z0-9_.]+\s*{/g,
      /\bpublic\s+(class|struct|interface|enum)\b/g,
      /\bConsole\.Write(Line)?\s*\(/g,
      /\bvar\s+\w+\s*=/g,
      /\basync\s+Task\b/g,
      /\bList<[^>]+>/g,
      /\bDictionary<[^>]+>/g,
      /\bget;\s*set;\b/g,
    ])
  );

  // Java
  add(
    "java",
    countMatches(clean, [
      /^\s*package\s+[A-Za-z0-9_.]+;\s*$/gm,
      /^\s*import\s+java\./gm,
      /\bpublic\s+class\s+\w+/g,
      /\bSystem\.out\.print(ln)?\s*\(/g,
      /\bstatic\s+void\s+main\s*\(/g,
      /\bnew\s+\w+\s*\(/g,
    ])
  );

  // C / C++
  add("cpp", countMatches(clean, [/#include\s*<[^>]+>/g, /\bstd::\w+/g, /\busing\s+namespace\s+std\b/g, /\bcout\s*<</g]));
  add("c", countMatches(clean, [/#include\s*<[^>]+>/g, /\bprintf\s*\(/g, /\bscanf\s*\(/g, /\bmalloc\s*\(/g]));

  // Go
  add(
    "go",
    countMatches(clean, [
      /^\s*package\s+\w+/gm,
      /^\s*import\s+\(/gm,
      /\bfunc\s+\w+\s*\(/g,
      /\b:=/g,
      /\bdefer\b/g,
      /\bgo\s+\w+\s*\(/g,
    ])
  );

  // Rust
  add(
    "rust",
    countMatches(clean, [
      /\bfn\s+\w+\s*\(/g,
      /\blet\s+mut\s+\w+/g,
      /\buse\s+\w+::/g,
      /\bmatch\s+\w+/g,
      /\bprintln!\s*\(/g,
      /->\s*\w+/g,
    ])
  );

  // PHP
  add(
    "php",
    countMatches(clean, [
      /<\?php/g,
      /\becho\s+/g,
      /\bfunction\s+\w+\s*\(/g,
      /\$\w+/g,
      /->/g,
      /\bnamespace\s+[\w\\]+;/g,
    ])
  );

  // Ruby
  add("ruby", countMatches(clean, [/\bdef\s+\w+/g, /\bend\b/g, /\bputs\s+/g, /@\w+/g, /:\w+\s*=>/g]));

  // Bash
  add("bash", countMatches(clean, [/^\s*#!\/bin\/(ba)?sh\b/gm, /\becho\b/g, /\bexport\s+\w+=/g, /\bgrep\b|\bsed\b|\bawk\b/g]));

  // PowerShell
  add("powershell", countMatches(clean, [/\bWrite-Host\b/g, /\bGet-\w+\b/g, /\bSet-\w+\b/g, /^\s*\$\w+\s*=/gm]));

  // SQL
  add("sql", countMatches(clean.toUpperCase(), [/\bSELECT\b/g, /\bFROM\b/g, /\bWHERE\b/g, /\bINSERT\b/g, /\bUPDATE\b/g, /\bJOIN\b/g]));

  // compute best
  let best = { language: "unknown", score: 0 };
  for (const [lang, sc] of scores.entries()) {
    if (sc > best.score) best = { language: lang, score: sc };
  }

  // confidence: ratio based on top2 gap and absolute score
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top1 = sorted[0]?.[1] || 0;
  const top2 = sorted[1]?.[1] || 0;

  // If nothing meaningful detected
  if (top1 <= 1) return { language: "unknown", confidence: 0.2, reason: "low-signal" };

  // gap-based confidence
  const gap = top1 - top2;
  let conf = 0.45 + Math.min(0.45, gap * 0.08) + Math.min(0.1, top1 * 0.02);
  conf = Math.max(0.35, Math.min(0.98, conf));

  return { language: best.language, confidence: conf, reason: `top=${top1},top2=${top2},gap=${gap}` };
}

/**
 * detectLanguage(code, forcedLang?)
 * - forcedLang: if user selected a language (not auto), we accept it but still verify minimally.
 */
export function detectLanguage(code, forcedLang = "auto") {
  const raw = s(code);
  const forced = normLang(forcedLang);

  if (!raw.trim()) return { language: "unknown", confidence: 0.0, reason: "empty" };

  // If forced and not auto, do a light sanity check:
  if (forced !== "auto" && forced !== "unknown") {
    // if forced is json/xml/yaml/html/css we can check high precision
    if (forced === "json" && looksLikeJSON(raw)) return { language: "json", confidence: 0.99, reason: "forced+valid" };
    if (forced === "yaml" && looksLikeYAML(raw)) return { language: "yaml", confidence: 0.95, reason: "forced+valid" };
    if (forced === "xml" && looksLikeXML(raw)) return { language: "xml", confidence: 0.95, reason: "forced+valid" };
    if (forced === "html" && looksLikeHTML(raw)) return { language: "html", confidence: 0.92, reason: "forced+valid" };

    // for code langs: accept forced with medium confidence (we'll still compute heuristic and reconcile)
    const clean = stripStringsAndComments(raw);
    const auto = scoreLang(clean, raw);
    // if heuristic strongly disagrees, downgrade confidence (don’t hard fail)
    if (auto.language !== "unknown" && auto.language !== forced && auto.confidence >= 0.75) {
      return { language: forced, confidence: 0.55, reason: `forced but heuristic=${auto.language}` };
    }
    return { language: forced, confidence: 0.8, reason: "forced" };
  }

  const clean = stripStringsAndComments(raw);
  return scoreLang(clean, raw);
}

/**
 * shouldMerge(langA, confA, langB, confB)
 * - Merge ONLY when we are confident both are the same language.
 */
export function shouldMerge(langA, confA, langB, confB) {
  const a = normLang(langA);
  const b = normLang(langB);

  if (!a || !b) return false;
  if (a === "unknown" || b === "unknown") return false;

  // EXACT match only (stable behavior)
  if (a !== b) return false;

  const minConf = Math.min(Number(confA || 0), Number(confB || 0));
  // conservative threshold to avoid wrong merges
  return minConf >= 0.6;
}

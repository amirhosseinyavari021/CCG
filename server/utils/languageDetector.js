// /home/cando/CCG/server/utils/languageDetector.js
import hljs from "highlight.js";

function s(v) {
  return v == null ? "" : String(v);
}

/* -------------------------------------------------- */
/*                Heuristic Booster                   */
/* -------------------------------------------------- */

function scoreBoost(code, lang) {
  const c = s(code);

  const rules = {
    csharp: [
      /\busing\s+System\b/,
      /\bnamespace\b/,
      /\bConsole\.WriteLine\b/,
      /\bget;\s*set;/,
      /\bpublic\s+class\b/,
    ],
    java: [
      /\bpackage\s+/,
      /\bSystem\.out\.println\b/,
      /\bpublic\s+static\s+void\s+main\b/,
      /\bimport\s+java\./,
    ],
    python: [
      /\bdef\s+\w+\(/,
      /\bimport\s+\w+/,
      /:\s*$/,
      /\bself\b/,
    ],
    javascript: [
      /\bconsole\.log\b/,
      /\bfunction\s+\w+/,
      /\b=>\s*{/,
      /\bimport\s+.*\s+from\b/,
    ],
    typescript: [
      /:\s*\w+/,
      /\binterface\s+\w+/,
      /\bimplements\b/,
      /\benum\s+\w+/,
    ],
    go: [
      /\bpackage\s+main\b/,
      /\bfunc\s+\w+\(/,
      /\bfmt\.Println\b/,
    ],
    rust: [
      /\bfn\s+\w+\(/,
      /\blet\s+mut\b/,
      /\bprintln!\b/,
    ],
  };

  const list = rules[lang];
  if (!list) return 0;

  let score = 0;
  for (const r of list) {
    if (r.test(c)) score += 1;
  }
  return score;
}

/* -------------------------------------------------- */
/*                Main Detector                       */
/* -------------------------------------------------- */

export function detectLanguage(code = "") {
  const text = s(code);
  if (!text.trim()) {
    return { language: "unknown", confidence: 0 };
  }

  // highlight.js statistical detection
  const auto = hljs.highlightAuto(text);
  const baseLang = auto.language || "unknown";
  const relevance = auto.relevance || 0;

  // candidate languages (top 3)
  const candidates = auto.secondBest
    ? [
        { lang: auto.language, relevance: auto.relevance },
        { lang: auto.secondBest.language, relevance: auto.secondBest.relevance },
      ]
    : [{ lang: auto.language, relevance: auto.relevance }];

  let best = { language: baseLang, score: relevance };

  for (const c of candidates) {
    const boost = scoreBoost(text, c.lang);
    const finalScore = c.relevance + boost * 2;

    if (finalScore > best.score) {
      best = { language: c.lang, score: finalScore };
    }
  }

  const normalizedConfidence = Math.min(1, best.score / 20);

  return {
    language: best.language || "unknown",
    confidence: Number(normalizedConfidence.toFixed(2)),
  };
}

/* -------------------------------------------------- */
/*          Merge Safety Decision Logic               */
/* -------------------------------------------------- */

export function shouldMerge(langA, confA, langB, confB) {
  if (!langA || !langB) return false;
  if (langA !== langB) return false;
  if (confA < 0.7 || confB < 0.7) return false;
  return true;
}

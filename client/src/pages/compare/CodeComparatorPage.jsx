// client/src/pages/compare/CodeComparatorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import MarkdownView from "../../components/ui/MarkdownView";

import FastCodeEditor from "../../components/ui/FastCodeEditor";
import FastDiffViewer from "../../components/ui/FastDiffViewer";

const LANGS = [
  { value: "auto", label: "Auto" },
  { value: "bash", label: "Bash/Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "sql", label: "SQL" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "rust", label: "Rust" },
];

const LS_CODE_A = "ccg_compare_code_a";
const LS_CODE_B = "ccg_compare_code_b";

function useDebouncedLocalStorage(key, value, delayMs = 250) {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, String(value ?? ""));
      } catch {}
    }, delayMs);
    return () => clearTimeout(t);
  }, [key, value, delayMs]);
}

// ---- language heuristics when user keeps "auto"
function sniffLang(code) {
  const t = String(code || "");
  const s = t.slice(0, 8000);

  if (/^\s*#!/.test(s) && /(bash|sh)/i.test(s)) return "bash";
  if (/^\s*#!/.test(s) && /python/i.test(s)) return "python";
  if (/^\s*#!/.test(s) && /(node|deno)/i.test(s)) return "javascript";

  if (/\bimport\s+React\b|\bexport\s+default\b|\buseState\b/.test(s)) return "javascript";
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*\w+(\[\])?;/.test(s)) return "typescript";
  if (/\bconst\b|\blet\b|\b=>\b|\bmodule\.exports\b|\brequire\(/.test(s)) return "javascript";

  if (/\bdef\s+\w+\s*\(|\bfrom\s+\w+\s+import\b|\bprint\s*\(/.test(s)) return "python";

  if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(s) && /":\s*"/.test(s)) return "json";
  if (/^\s*---\s*$|^\s*\w+:\s+.+/m.test(s) && !/[;{}()]/.test(s)) return "yaml";

  if (/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bFROM\b|\bWHERE\b/i.test(s)) return "sql";

  if (/\bpackage\s+main\b|\bfmt\./.test(s)) return "go";
  if (/\bpublic\s+class\b|\bstatic\s+void\s+main\b/.test(s)) return "java";
  if (/#include\s+<\w+>|\bprintf\s*\(|\bint\s+main\s*\(/.test(s)) return "c";
  if (/#include\s+<\w+>|\bstd::\w+|\bcout\b/.test(s)) return "cpp";
  if (/\busing\s+System;|\bnamespace\b|\bpublic\s+class\b/.test(s)) return "csharp";
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\buse\s+\w+::/.test(s)) return "rust";

  if (/[{}()[\];]/.test(s) && /function\s+\w+/.test(s)) return "javascript";

  return "";
}

function looksLikeCode(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (t.length < 12) return false;

  const hasSyntax =
    /[\n{}()[\];=<>]/.test(t) ||
    /\b(function|class|def|import|from|return|if|else|for|while|try|catch|const|let)\b/i.test(t);

  const hasEnoughLines = t.split("\n").filter(Boolean).length >= 2;
  return hasSyntax || hasEnoughLines;
}

function pickApiUserMessage(errObj, lang) {
  if (!errObj) return lang === "fa" ? "خطای نامشخص" : "Unknown error";
  if (typeof errObj === "string") return errObj;

  const um = errObj?.userMessage || errObj?.message || errObj?.error;
  const hint = errObj?.hint;

  if (um && hint) return `${um}\n${lang === "fa" ? "راهنما:" : "Hint:"} ${hint}`;
  if (um) return String(um);

  try {
    return JSON.stringify(errObj);
  } catch {
    return lang === "fa" ? "خطای نامشخص" : "Unknown error";
  }
}

export default function CodeComparatorPage() {
  const { lang } = useLanguage();
  const dirClass = lang === "fa" ? "rtl" : "ltr";

  const [codeA, setCodeA] = useState(() => {
    try {
      return localStorage.getItem(LS_CODE_A) || "";
    } catch {
      return "";
    }
  });
  const [codeB, setCodeB] = useState(() => {
    try {
      return localStorage.getItem(LS_CODE_B) || "";
    } catch {
      return "";
    }
  });
  useDebouncedLocalStorage(LS_CODE_A, codeA, 250);
  useDebouncedLocalStorage(LS_CODE_B, codeB, 250);

  const [langA, setLangA] = usePersistState("compare_lang_a", "auto");
  const [langB, setLangB] = usePersistState("compare_lang_b", "auto");
  const [showDiff, setShowDiff] = usePersistState("compare_show_diff", true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outMd, setOutMd] = useState("");

  const abortRef = useRef(null);

  // always sniff, even if user chose a language (used for warnings + safe mode)
  const detectedA = useMemo(() => sniffLang(codeA), [codeA]);
  const detectedB = useMemo(() => sniffLang(codeB), [codeB]);

  // inferred = what UI shows as "effective" language
  const inferredA = useMemo(() => (langA === "auto" ? detectedA : String(langA)), [langA, detectedA]);
  const inferredB = useMemo(() => (langB === "auto" ? detectedB : String(langB)), [langB, detectedB]);

  // mismatch warnings (user selected explicit lang but sniff says otherwise)
  const mismatchA = useMemo(() => {
    if (langA === "auto") return false;
    if (!detectedA) return false;
    return String(langA) !== detectedA;
  }, [langA, detectedA]);

  const mismatchB = useMemo(() => {
    if (langB === "auto") return false;
    if (!detectedB) return false;
    return String(langB) !== detectedB;
  }, [langB, detectedB]);

  const sameLang = useMemo(() => {
    const a = String(inferredA || "").trim();
    const b = String(inferredB || "").trim();
    if (!a || !b) return false;
    return a === b;
  }, [inferredA, inferredB]);

  // ✅ Canonical output mode for comparator (frontend)
  // safe default => advice if uncertain or mismatch detected
  const effectiveCompareOutputMode = useMemo(() => {
    if (mismatchA || mismatchB) return "advice";
    return sameLang ? "merge" : "advice";
  }, [sameLang, mismatchA, mismatchB]);

  const labels = useMemo(() => {
    const fa = lang === "fa";
    return {
      title: fa ? "🔍 مقایسه‌گر کد" : "🔍 Code Comparator",
      sub: fa
        ? "کد A و B را وارد کن؛ حالت Merge (برای هم‌زبان) یا Advice (برای غیرهم‌زبان) می‌گیری."
        : "Paste A & B; get Merge (same-language) or Advice (different-language).",
      codeA: fa ? "کد A" : "Code A",
      codeB: fa ? "کد B" : "Code B",
      language: fa ? "زبان" : "Language",
      diff: fa ? "نمایش Diff" : "Diff View",
      compare: fa ? "مقایسه" : "Compare",
      cancel: fa ? "لغو" : "Cancel",
      swap: fa ? "جابجایی A/B" : "Swap A/B",
      clearOut: fa ? "پاک کردن خروجی" : "Clear Output",
      clearAll: fa ? "پاک کردن همه" : "Clear All",
      cancelled: fa ? "⛔ درخواست لغو شد." : "⛔ Cancelled.",
      missing: fa ? "هر دو کد را وارد کنید." : "Please provide both code snippets.",
      badInput: fa ? "ورودی شبیه کد معتبر نیست. چند خط کد واقعی وارد کن." : "Input doesn't look like code. Paste real code (multiple lines).",
      emptyOut: fa ? "خروجی اینجا نمایش داده می‌شود." : "Results will appear here.",
      loading: fa ? "در حال پردازش..." : "Processing...",
      detectedA: fa ? "زبان تشخیص‌داده‌شده A" : "Detected language A",
      detectedB: fa ? "زبان تشخیص‌داده‌شده B" : "Detected language B",
      diffHint: fa ? "Diff فقط وقتی فعال است که زبان A و B یکی باشد." : "Diff is enabled only when languages match.",
      modeHintMerge: fa ? "حالت خروجی: Merge ✅" : "Output mode: Merge ✅",
      modeHintAdvice: fa ? "حالت خروجی: Advice ✅" : "Output mode: Advice ✅",
      mismatchWarn: fa
        ? "⚠️ زبان انتخابی با تشخیص سیستم هم‌خوان نیست؛ برای جلوگیری از خروجی غلط، حالت Advice فعال شد."
        : "⚠️ Selected language differs from detected language; Advice mode activated to prevent wrong output.",
      on: fa ? "فعال ✅" : "On ✅",
      off: fa ? "خاموش" : "Off",
    };
  }, [lang]);

  function clearOutput() {
    setOutMd("");
    setError("");
  }

  function clearAll() {
    setCodeA("");
    setCodeB("");
    clearOutput();
  }

  function swap() {
    setCodeA(codeB);
    setCodeB(codeA);
    setLangA(langB);
    setLangB(langA);
  }

  function cancel() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  async function runCompare() {
    setError("");
    setOutMd("");

    const a = String(codeA || "").trim();
    const b = String(codeB || "").trim();

    if (!a || !b) {
      setError(labels.missing);
      return;
    }
    if (!looksLikeCode(a) || !looksLikeCode(b)) {
      setError(labels.badInput);
      return;
    }

    cancel();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    const payload = {
      mode: "compare",
      modeStyle: "comparator",
      lang,

      input_a: a,
      input_b: b,

      // user selection (hints)
      codeLangA: String(langA || "auto"),
      codeLangB: String(langB || "auto"),

      // ✅ canonical contract mode for backend + prompt + normalizer
      compareOutputMode: effectiveCompareOutputMode,

      timestamp: new Date().toISOString(),
    };

    try {
      const res = await callCCG(payload, { signal: ac.signal });

      if (res && typeof res === "object" && res.ok === false) {
        setError(pickApiUserMessage(res.error, lang));
        return;
      }

      const md = String(res?.markdown || res?.output || res?.result || "").trim();
      if (!md) {
        setError(lang === "fa" ? "سرور خروجی قابل‌نمایش برنگرداند." : "Server returned no output.");
        return;
      }

      setOutMd(md);
    } catch (e) {
      if (e?.name === "AbortError") setError(labels.cancelled);
      else setError(e?.message || (lang === "fa" ? "❌ خطای سرور" : "❌ Server error"));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  // Diff allowed ONLY in merge mode
  const diffEnabled = Boolean(showDiff && effectiveCompareOutputMode === "merge" && sameLang);

  return (
    <div className={`space-y-4 md:space-y-6 ${dirClass}`}>
      {/* Header */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass p-4 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-bold">{labels.title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{labels.sub}</div>

              <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
                <div>
                  {labels.detectedA}: <b>{detectedA || "unknown"}</b> — {lang === "fa" ? "انتخاب/موثر:" : "selected/effective:"}{" "}
                  <b>{inferredA || "auto"}</b>
                </div>
                <div>
                  {labels.detectedB}: <b>{detectedB || "unknown"}</b> — {lang === "fa" ? "انتخاب/موثر:" : "selected/effective:"}{" "}
                  <b>{inferredB || "auto"}</b>
                </div>

                {(mismatchA || mismatchB) ? (
                  <div className="opacity-95">{labels.mismatchWarn}</div>
                ) : null}

                <div className="opacity-95">
                  {effectiveCompareOutputMode === "merge" ? labels.modeHintMerge : labels.modeHintAdvice}
                </div>

                {effectiveCompareOutputMode !== "merge" ? (
                  <div className="opacity-90">{labels.diffHint}</div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
              <button
                type="button"
                onClick={swap}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 transition"
                disabled={loading}
              >
                🔁 {labels.swap}
              </button>

              <button
                type="button"
                onClick={clearOutput}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 transition"
                disabled={loading}
              >
                🧹 {labels.clearOut}
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 transition"
                disabled={loading}
              >
                🗑️ {labels.clearAll}
              </button>

              <button
                type="button"
                onClick={loading ? cancel : runCompare}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  loading ? "bg-rose-600 text-white hover:opacity-90" : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90"
                }`}
              >
                {loading ? `⛔ ${labels.cancel}` : `🚀 ${labels.compare}`}
              </button>
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-700/40 bg-rose-50 dark:bg-rose-900/20 p-3">
              <div className="flex items-start gap-2">
                <div className="text-rose-600 dark:text-rose-300 text-lg">⚠️</div>
                <div className="text-sm font-medium text-rose-700 dark:text-rose-200 whitespace-pre-wrap">{error}</div>
              </div>
            </div>
          ) : null}

          {/* Loading */}
          {loading ? (
            <div className="mt-3 rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span className="opacity-90">{labels.loading}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Editors */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="ccg-card ccg-glass p-4 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold">{labels.codeA}</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70">{labels.language}</span>
                <select
                  value={langA}
                  onChange={(e) => setLangA(e.target.value)}
                  className="p-2 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black/30"
                  disabled={loading}
                >
                  {LANGS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FastCodeEditor
              value={codeA}
              onChange={setCodeA}
              disabled={loading}
              placeholder={lang === "fa" ? "کد A را اینجا وارد کن..." : "Paste Code A here..."}
              minRows={16}
            />
          </div>

          <div className="ccg-card ccg-glass p-4 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold">{labels.codeB}</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70">{labels.language}</span>
                <select
                  value={langB}
                  onChange={(e) => setLangB(e.target.value)}
                  className="p-2 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black/30"
                  disabled={loading}
                >
                  {LANGS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FastCodeEditor
              value={codeB}
              onChange={setCodeB}
              disabled={loading}
              placeholder={lang === "fa" ? "کد B را اینجا وارد کن..." : "Paste Code B here..."}
              minRows={16}
            />
          </div>
        </div>
      </div>

      {/* Diff Toggle */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass p-4 rounded-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{labels.diff}</div>

            <button
              type="button"
              onClick={() => setShowDiff((v) => !v)}
              disabled={loading}
              className={`px-3 py-2 rounded-xl text-sm transition border border-gray-200/60 dark:border-white/10 ${
                showDiff ? "bg-emerald-500 text-white hover:opacity-90" : "bg-white/70 dark:bg-white/[0.06]"
              }`}
              title={effectiveCompareOutputMode !== "merge" ? labels.diffHint : ""}
            >
              {showDiff ? labels.on : labels.off}
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
            {effectiveCompareOutputMode === "merge"
              ? lang === "fa"
                ? `Diff فعال است (زبان: ${inferredA || "auto"})`
                : `Diff enabled (lang: ${inferredA || "auto"})`
              : lang === "fa"
              ? "حالت Advice فعال است؛ Diff نمایش داده نمی‌شود."
              : "Advice mode active; Diff is hidden."}
          </div>
        </div>
      </div>

      {/* Diff */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Diff</div>
            <div className="text-[11px] opacity-70">
              {effectiveCompareOutputMode === "merge" ? inferredA || "" : lang === "fa" ? "Advice Mode" : "Advice Mode"}
            </div>
          </div>

          {diffEnabled ? (
            <FastDiffViewer a={codeA} b={codeB} lang={lang} maxHeight={420} />
          ) : (
            <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] p-4 text-sm text-gray-700 dark:text-gray-200">
              {showDiff
                ? lang === "fa"
                  ? "Diff فقط در حالت Merge فعال می‌شود (وقتی زبان‌ها یکی باشند)."
                  : "Diff works only in Merge mode (when languages match)."
                : lang === "fa"
                ? "Diff خاموش است."
                : "Diff is Off."}
            </div>
          )}
        </div>
      </div>

      {/* AI Output */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-bold">{lang === "fa" ? "📌 خروجی AI" : "📌 AI Output"}</div>
          </div>

          {outMd ? (
            <div className="ccg-card ccg-glass-soft p-3 rounded-2xl">
              <MarkdownView markdown={outMd} content={outMd} lang={lang} />
            </div>
          ) : (
            <div className="text-center py-10 text-gray-600 dark:text-gray-300">
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm">{labels.emptyOut}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

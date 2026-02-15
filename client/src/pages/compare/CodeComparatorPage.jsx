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

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

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

function sniffLang(code) {
  const t = String(code || "");
  const s = t.slice(0, 6000);

  if (/^\s*#!/.test(s) && /(bash|sh)/i.test(s)) return "bash";
  if (/^\s*#!/.test(s) && /python/i.test(s)) return "python";

  if (/\bimport\s+React\b|\bexport\s+default\b|\buseState\b/.test(s)) return "javascript";
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*\w+(\[\])?;/.test(s)) return "typescript";

  if (/\bdef\s+\w+\s*\(|\bfrom\s+\w+\s+import\b|\bprint\s*\(/.test(s)) return "python";
  if (/\bfunction\s+\w+\s*\(|\bconst\b|\blet\b|\bmodule\.exports\b|\brequire\(/.test(s)) return "javascript";

  if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(s) && /":\s*"/.test(s)) return "json";
  if (/^\s*---\s*$|^\s*\w+:\s+.+/m.test(s)) return "yaml";

  if (/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bFROM\b|\bWHERE\b/i.test(s)) return "sql";
  if (/\bpackage\s+main\b|\bfmt\./.test(s)) return "go";
  if (/\bpublic\s+class\b|\bstatic\s+void\s+main\b/.test(s)) return "java";
  if (/#include\s+<\w+>|\bprintf\s*\(|\bint\s+main\s*\(/.test(s)) return "c";
  if (/#include\s+<\w+>|\bstd::\w+|\bcout\b/.test(s)) return "cpp";
  if (/\busing\s+System;|\bnamespace\b|\bpublic\s+class\b/.test(s)) return "csharp";
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\buse\s+\w+::/.test(s)) return "rust";

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
  const fa = lang === "fa";

  if (!errObj) return fa ? "خطای نامشخص" : "Unknown error";
  if (typeof errObj === "string") return errObj;

  const um = errObj?.userMessage || errObj?.message || errObj?.error;
  const hint = errObj?.hint;

  if (um && hint) return `${um}\n${fa ? "راهنما:" : "Hint:"} ${hint}`;
  if (um) return String(um);

  try {
    return JSON.stringify(errObj);
  } catch {
    return fa ? "خطای نامشخص" : "Unknown error";
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
  const [goal, setGoal] = usePersistState("compare_goal", "");
  const [showDiff, setShowDiff] = usePersistState("compare_show_diff", true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outMd, setOutMd] = useState("");

  const abortRef = useRef(null);

  const inferredA = useMemo(() => (langA === "auto" ? sniffLang(codeA) : String(langA)), [langA, codeA]);
  const inferredB = useMemo(() => (langB === "auto" ? sniffLang(codeB) : String(langB)), [langB, codeB]);

  const sameLang = useMemo(() => {
    const a = String(inferredA || "").trim();
    const b = String(inferredB || "").trim();
    if (!a || !b) return false;
    return a === b;
  }, [inferredA, inferredB]);

  const labels = useMemo(() => {
    const fa = lang === "fa";
    return {
      title: fa ? "🔍 مقایسه‌گر کد" : "🔍 Code Comparator",
      sub: fa
        ? "کد A و B را وارد کن؛ Diff + تحلیل AI + خروجی نهایی (Merge/Improved) می‌گیری."
        : "Paste A & B; get Diff + AI analysis + final merged/improved output.",
      codeA: fa ? "کد A" : "Code A",
      codeB: fa ? "کد B" : "Code B",
      language: fa ? "زبان" : "Language",
      goal: fa ? "هدف/کانتکست (اختیاری)" : "Goal/Context (optional)",
      goalPh: fa ? "مثال: امن‌ترش کن، سریع‌ترش کن، merge حرفه‌ای بده" : "e.g., make it safer/faster, produce a professional merge",
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
      detected: fa ? "زبان تشخیص‌داده‌شده" : "Detected language",
      diffHint: fa ? "برای Diff دقیق، زبان A و B یکی باشد (یا Auto درست تشخیص بدهد)." : "For accurate Diff, languages should match (or Auto should detect).",
      on: fa ? "فعال ✅" : "On ✅",
      off: fa ? "خاموش" : "Off",
      timeout: fa ? "⏳ پاسخ‌گویی بیش از حد طول کشید (Timeout)." : "⏳ Request timed out.",
      gateway: fa ? "⛔ تایم‌اوت/قطع ارتباط در پروکسی (Nginx)." : "⛔ Gateway timeout/bad gateway (proxy).",
    };
  }, [lang]);

  function clearOutput() {
    setOutMd("");
    setError("");
  }

  function clearAll() {
    setCodeA("");
    setCodeB("");
    setGoal("");
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

    const userGoal = normalizeSpaces(goal);

    const fallbackRequest =
      lang === "fa"
        ? "کد A و B را مقایسه کن، تفاوت‌ها را کوتاه و دقیق بگو، کیفیت/امنیت را بررسی کن، و در آخر یک نسخه نهایی merge/improved بده. کد نهایی حتما داخل ``` قرار بگیرد."
        : "Compare A and B, explain differences briefly and clearly, review quality/security, and finally provide a merged/improved final version. Final code must be inside ```.";

    const payload = {
      mode: "compare",
      modeStyle: "comparator",
      lang,

      input_a: a,
      input_b: b,
      codeLangA: String(langA || "auto"),
      codeLangB: String(langB || "auto"),

      user_request: userGoal || fallbackRequest,
      timestamp: new Date().toISOString(),
    };

    try {
      // ✅ IMPORTANT: allow longer wait in browser for compare
      // (nginx still must be configured, but this prevents client-side early abort)
      const res = await callCCG(payload, { signal: ac.signal, timeoutMs: 90000 });

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
      // ✅ better timeout/gateway messages
      if (e?.name === "AbortError" || e?.code === "REQUEST_TIMEOUT" || String(e?.message || "") === "REQUEST_TIMEOUT") {
        setError(labels.timeout);
      } else if (String(e?.message || "").includes("Gateway Timeout/Bad Gateway")) {
        setError(labels.gateway);
      } else if (e?.name === "AbortError") {
        setError(labels.cancelled);
      } else {
        setError(e?.message || (lang === "fa" ? "❌ خطای سرور" : "❌ Server error"));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  const diffEnabled = Boolean(showDiff && sameLang);

  return (
    <div className={`space-y-4 md:space-y-6 ${dirClass}`}>
      {/* Header */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass p-4 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-bold">{labels.title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{labels.sub}</div>

              <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                {sameLang ? (
                  <>
                    {labels.detected}: <b>{inferredA || "auto"}</b>
                  </>
                ) : (
                  <span className="opacity-90">{labels.diffHint}</span>
                )}
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

          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-700/40 bg-rose-50 dark:bg-rose-900/20 p-3">
              <div className="flex items-start gap-2">
                <div className="text-rose-600 dark:text-rose-300 text-lg">⚠️</div>
                <div className="text-sm font-medium text-rose-700 dark:text-rose-200 whitespace-pre-wrap">{error}</div>
              </div>
            </div>
          ) : null}

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

      {/* Goal + Diff Toggle */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="ccg-card ccg-glass p-4 rounded-2xl lg:col-span-2">
            <div className="text-xs font-medium mb-2">{labels.goal}</div>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={labels.goalPh}
              className="w-full p-3 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black/30 rtl-text"
              disabled={loading}
            />
            <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
              {lang === "fa"
                ? "اگر زبان‌ها متفاوت باشند هم باز خروجی AI می‌تواند نسخه بهتر برای هرکدام بدهد."
                : "If languages differ, AI can still provide improved versions per language."}
            </div>
          </div>

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
                title={!sameLang ? labels.diffHint : ""}
              >
                {showDiff ? labels.on : labels.off}
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
              {sameLang
                ? lang === "fa"
                  ? `Diff فعال است (زبان: ${inferredA || "auto"})`
                  : `Diff enabled (lang: ${inferredA || "auto"})`
                : lang === "fa"
                ? "زبان‌ها متفاوت/نامشخص است؛ Diff ممکن است دقیق نباشد."
                : "Languages differ/unknown; Diff may be less accurate."}
            </div>
          </div>
        </div>
      </div>

      {/* Diff */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Diff</div>
            <div className="text-[11px] opacity-70">
              {sameLang ? inferredA || "" : lang === "fa" ? "زبان‌های متفاوت/نامشخص" : "Different/unknown"}
            </div>
          </div>

          {diffEnabled ? (
            <FastDiffViewer a={codeA} b={codeB} lang={lang} maxHeight={420} />
          ) : (
            <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] p-4 text-sm text-gray-700 dark:text-gray-200">
              {showDiff
                ? lang === "fa"
                  ? "Diff روشن است اما زبان‌ها یکی تشخیص داده نشد. زبان‌ها را دستی یکی کن یا کد را واضح‌تر وارد کن."
                  : "Diff is ON but languages don't match. Set both languages to the same value or paste clearer code."
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

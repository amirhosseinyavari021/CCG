// client/src/components/ui/ToolResult.jsx
import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function asText(x) {
  if (x === null || x === undefined) return "";
  if (typeof x === "string") return x;
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

function pickAltCommand(alt) {
  if (!alt) return "";
  if (typeof alt === "string") return alt;
  // common shapes:
  // { command, lang, title } OR { code } OR { text }
  return alt.command || alt.code || alt.text || alt.value || "";
}

function CopyButton({ text, label = "کپی" }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10"
    >
      {label}
    </button>
  );
}

function CodeCard({ title, lang, code, badge, dir }) {
  const safeCode = code || "";
  return (
    <div className="ccg-card p-0 overflow-hidden">
      <div className="ccg-codeblock-head">
        <div className="flex items-center gap-2">
          <div className="ccg-codeblock-title">{title}</div>
          {lang ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
              {String(lang).toUpperCase()}
            </span>
          ) : null}
          {badge ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-200">
              {badge}
            </span>
          ) : null}
        </div>
        <CopyButton text={safeCode} />
      </div>
      <pre className="ccg-pre" dir={dir}>
        <code>{safeCode}</code>
      </pre>
    </div>
  );
}

function MdCard({ title, icon, children, danger = false }) {
  return (
    <div className={`ccg-card p-4 sm:p-5 ${danger ? "border-red-500/35 bg-red-500/5" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <span className="opacity-90">{icon}</span>
          <span>{title}</span>
        </div>
      </div>
      <div className={`prose dark:prose-invert max-w-none ${danger ? "text-red-100" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export default function ToolResult({ tool, uiLang = "fa" }) {
  const dir = uiLang === "fa" ? "rtl" : "ltr";

  const normalized = useMemo(() => {
    const t = tool || {};
    const primary = t.primary || t.primaryCommand || t.command || null;

    const primaryCommand =
      typeof primary === "string"
        ? primary
        : primary?.command || primary?.code || primary?.text || "";

    const primaryLang =
      (typeof primary === "object" ? primary?.lang : null) || t.primaryLang || t.lang || "";

    const explanations = t.explanations || t.explanation || t.description || "";
    const warnings = Array.isArray(t.warnings) ? t.warnings : t.warnings ? [t.warnings] : [];
    const alternatives = Array.isArray(t.alternatives) ? t.alternatives : [];
    const script = t.script || t.pythonScript || "";

    return {
      title: t.title || (uiLang === "fa" ? "نتیجه" : "Result"),
      primaryCommand,
      primaryLang,
      explanations: asText(explanations).trim(),
      warnings: warnings.map((w) => asText(w).trim()).filter(Boolean),
      alternatives,
      script: asText(script).trim(),
    };
  }, [tool, uiLang]);

  if (!tool) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 border-2 border-dashed rounded-2xl">
        {uiLang === "fa" ? "نتیجه اینجا نمایش داده می‌شود…" : "Results will appear here…"}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Primary command */}
      {normalized.primaryCommand ? (
        <CodeCard
          title={uiLang === "fa" ? "کامند اصلی" : "Primary Command"}
          lang={normalized.primaryLang || "bash"}
          code={normalized.primaryCommand}
          badge="✓"
          dir="ltr"
        />
      ) : null}

      {/* Explanations */}
      {normalized.explanations ? (
        <MdCard title={uiLang === "fa" ? "توضیحات" : "Explanation"} icon="🧾">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized.explanations}</ReactMarkdown>
        </MdCard>
      ) : null}

      {/* Warnings */}
      {normalized.warnings.length ? (
        <MdCard title={uiLang === "fa" ? "هشدارها" : "Warnings"} icon="⚠️" danger>
          <ul>
            {normalized.warnings.map((w, i) => (
              <li key={i}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{w}</ReactMarkdown>
              </li>
            ))}
          </ul>
        </MdCard>
      ) : null}

      {/* Alternatives */}
      {normalized.alternatives.length ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold opacity-90">
            {uiLang === "fa" ? "جایگزین‌ها" : "Alternatives"}
          </div>
          {normalized.alternatives.map((alt, idx) => {
            const cmd = pickAltCommand(alt);
            const lang = (typeof alt === "object" && alt?.lang) || "bash";
            return (
              <CodeCard
                key={idx}
                title={(uiLang === "fa" ? "جایگزین" : "Alternative") + ` #${idx + 1}`}
                lang={lang}
                code={cmd}
                dir="ltr"
              />
            );
          })}
        </div>
      ) : null}

      {/* Script (if any) */}
      {normalized.script ? (
        <CodeCard
          title={uiLang === "fa" ? "اسکریپت" : "Script"}
          lang="python"
          code={normalized.script}
          dir="ltr"
        />
      ) : null}
    </div>
  );
}

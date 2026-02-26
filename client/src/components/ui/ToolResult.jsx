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

function toLines(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => asText(v).trim())
      .filter(Boolean)
      .flatMap((v) => v.split("\n").map((l) => l.trim()).filter(Boolean));
  }
  const t = asText(value).trim();
  if (!t || t === "[]") return [];
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function pickAltCommand(alt) {
  if (!alt) return "";
  if (typeof alt === "string") return alt;
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
    <div className={`ccg-card p-4 sm:p-5 ${danger ? "border-red-500/50 bg-red-500/10 ring-1 ring-red-500/25" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <span className="opacity-90">{icon}</span>
          <span>{title}</span>
        </div>
      </div>
      <div className={`prose dark:prose-invert max-w-none ${danger ? "text-red-100" : ""}`}>{children}</div>
    </div>
  );
}

function LinesList({ lines = [], dense = false }) {
  if (!Array.isArray(lines) || !lines.length) return null;
  return (
    <ul className={`list-disc ${dense ? "space-y-1" : "space-y-2"} pe-5`}>
      {lines.map((line, idx) => (
        <li key={idx} className="leading-7">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(line || "")}</ReactMarkdown>
        </li>
      ))}
    </ul>
  );
}

export default function ToolResult({ tool, uiLang = "fa" }) {
  const dir = uiLang === "fa" ? "rtl" : "ltr";

  const normalized = useMemo(() => {
    const t = tool || {};
    const primary = t.primary || t.primaryCommand || t.primary_command || t.command || null;

    const primaryCommand =
      typeof primary === "string" ? primary : primary?.command || primary?.code || primary?.text || "";

    const primaryLang = (typeof primary === "object" ? primary?.lang : null) || t.primaryLang || t.lang || "";

    const explanations = toLines(t.explanations || t.explanation || t.description || "");

    // robust warning + notes sources
    const warnings = toLines(t.warnings || t.warning || t.alert || t.alerts || "");
    const notes = toLines(t.notes || t.note || t.moreDetails || t.details || "");

    const alternatives = Array.isArray(t.alternatives)
      ? t.alternatives
      : Array.isArray(t.moreCommands)
      ? t.moreCommands
      : [];

    const script =
      asText(t.script || t.python_script || "").trim() || (typeof t.pythonScript === "string" ? t.pythonScript.trim() : "");

    const isScriptLike =
      Boolean(script) ||
      Boolean(t.python_script) ||
      Boolean(t.isScript) ||
      (typeof primaryCommand === "string" && primaryCommand.includes("\n") && !alternatives.length);

    return {
      title: t.title || (uiLang === "fa" ? "نتیجه" : "Result"),
      primaryCommand,
      primaryLang,
      explanations,
      warnings,
      notes,
      alternatives,
      script,
      isScriptLike,
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
      {normalized.primaryCommand && !normalized.isScriptLike ? (
        <CodeCard
          title={uiLang === "fa" ? "کامند اصلی" : "Primary Command"}
          lang={normalized.primaryLang || "bash"}
          code={normalized.primaryCommand}
          badge="✓"
          dir="ltr"
        />
      ) : null}

      {/* Script (if any) */}
      {normalized.script || normalized.isScriptLike ? (
        <CodeCard
          title={uiLang === "fa" ? "اسکریپت" : "Script"}
          lang={normalized.primaryLang || "bash"}
          code={normalized.script || normalized.primaryCommand}
          dir="ltr"
        />
      ) : null}

      {/* Explanations */}
      {normalized.explanations.length ? (
        <MdCard title={uiLang === "fa" ? "توضیحات" : "Explanation"} icon="🧾">
          <LinesList lines={normalized.explanations} />
        </MdCard>
      ) : null}

      {/* Warnings */}
      {normalized.warnings.length ? (
        <MdCard title={uiLang === "fa" ? "هشدارها" : "Warnings"} icon="⚠️" danger>
          <LinesList lines={normalized.warnings} />
        </MdCard>
      ) : null}

      {/* Notes */}
      {normalized.notes.length ? (
        <MdCard title={uiLang === "fa" ? "نکات" : "Notes"} icon="📌">
          <LinesList lines={normalized.notes} />
        </MdCard>
      ) : null}

      {/* Alternatives */}
      {normalized.alternatives.length ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold opacity-90">{uiLang === "fa" ? "جایگزین‌ها" : "Alternatives"}</div>
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
    </div>
  );
}

import React from "react";

function CopyBtn({ text }) {
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text || ""); } catch {}
  };
  return (
    <button
      onClick={onCopy}
      className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
      type="button"
    >
      کپی
    </button>
  );
}

function CodeCard({ title, lang = "bash", code }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        <CopyBtn text={code} />
      </div>
      <pre className="text-sm overflow-auto rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
        <code>{code}</code>
      </pre>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{lang}</div>
    </div>
  );
}

export default function ToolResult({ tool }) {
  const t = tool || {};
  const lang = t?.primary?.lang || "bash";
  const primary = t?.primary?.command || "";
  const explanation = t?.explanation || "";
  const warnings = Array.isArray(t?.warnings) ? t.warnings : [];
  const alternatives = Array.isArray(t?.alternatives) ? t.alternatives.slice(0, 3) : [];

  return (
    <div className="space-y-3">
      <CodeCard title="کامند اصلی" lang={lang} code={primary} />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
        <div className="text-sm font-bold mb-2">توضیح</div>
        <div className="text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
          {explanation || "-"}
        </div>
      </div>

      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 p-3">
        <div className="text-sm font-bold mb-2 text-red-700 dark:text-red-300">هشدارها</div>
        <ul className="text-sm leading-7 text-red-800 dark:text-red-200 list-disc pr-5">
          {(warnings.length ? warnings : ["-"]).map((w, i) => (
            <li key={i} className="whitespace-pre-wrap">{w}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-bold">جایگزین‌ها</div>
        {alternatives.length ? alternatives.map((a, i) => (
          <div key={i} className="space-y-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">{a?.note || ""}</div>
            <CodeCard title={`جایگزین ${i + 1}`} lang={lang} code={a?.command || ""} />
          </div>
        )) : (
          <div className="text-sm text-slate-500">-</div>
        )}
      </div>
    </div>
  );
}

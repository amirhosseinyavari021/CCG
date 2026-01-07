import React, { useMemo, useState } from "react";

function CopyBtn({ value }) {
  const [ok, setOk] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setOk(true);
      setTimeout(() => setOk(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ccg-btn px-3 py-1 text-xs"
      disabled={!value}
      title={value ? "Copy" : "Nothing to copy"}
    >
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function oneLineCommand(s) {
  const t = String(s || "").trim();
  const m = t.match(/^\s*```[^\n]*\n([\s\S]*?)\n?```\s*$/);
  const un = (m ? m[1] : t).trim();
  const first = un.split("\n").map(x=>x.trim()).find(Boolean) || "";
  return first;
}

export default function ToolResult({ tool }) {
  const t = tool || {};
  const primary = t.primary || {};
  const cmd = useMemo(() => oneLineCommand(primary.command || ""), [primary.command]);
  const lang = String(primary.lang || "bash");

  const warnings = Array.isArray(t.warnings) ? t.warnings : [];
  const alts = Array.isArray(t.alternatives) ? t.alternatives : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold mb-2">Command</div>
          <div className="rounded-xl border border-[var(--border)] bg-white/60 dark:bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <pre className="text-sm overflow-auto m-0 leading-6"><code>{cmd}</code></pre>
              <CopyBtn value={cmd} />
            </div>
            <div className="text-xs text-slate-500 mt-2">lang: {lang}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Explanation</div>
        <div className="text-sm text-slate-700 dark:text-slate-200/80 whitespace-pre-wrap">
          {String(t.explanation || "").trim()}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Warnings</div>
        <ul className="list-disc pr-5 text-sm text-slate-700 dark:text-slate-200/80 space-y-1">
          {warnings.map((w, i) => (
            <li key={i}>{String(w)}</li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Alternatives</div>
        <div className="space-y-3">
          {alts.map((a, i) => {
            const c = oneLineCommand(a?.command || "");
            const note = String(a?.note || "").trim();
            return (
              <div key={i} className="rounded-xl border border-[var(--border)] p-3">
                {note ? <div className="text-xs text-slate-500 mb-2">{note}</div> : null}
                <div className="flex items-start justify-between gap-3">
                  <pre className="text-sm overflow-auto m-0 leading-6"><code>{c}</code></pre>
                  <CopyBtn value={c} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

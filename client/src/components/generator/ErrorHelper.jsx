// client/src/components/generator/ErrorHelper.jsx
import { useState } from "react";

export default function ErrorHelper({ onAnalyze, labels }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState("");

  const t = labels || {
    title: "Error Analyzer",
    hint: "Paste the error/log. Optionally add context (command, environment).",
    errLabel: "Error / Log",
    ctxLabel: "Context (optional)",
    analyze: "Analyze",
    close: "Close",
  };

  return (
    <div className="ccg-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 700 }}>{t.title}</div>
        <button type="button" className="ccg-btn ccg-btn-xs" onClick={() => setOpen((v) => !v)}>
          {open ? t.close : "Open"}
        </button>
      </div>

      <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>{t.hint}</div>

      {open && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{t.errLabel}</div>
            <textarea
              className="ccg-textarea"
              style={{ minHeight: 120 }}
              value={error}
              onChange={(e) => setError(e.target.value)}
              placeholder="e.g. command output / stack trace / nginx error..."
            />
          </div>

          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{t.ctxLabel}</div>
            <textarea
              className="ccg-textarea"
              style={{ minHeight: 90 }}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. the command you ran, OS, version, what changed..."
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="ccg-btn ccg-btn-primary"
              onClick={() => onAnalyze?.({ error, context })}
              disabled={!error.trim()}
              style={{ opacity: error.trim() ? 1 : 0.6 }}
            >
              {t.analyze}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

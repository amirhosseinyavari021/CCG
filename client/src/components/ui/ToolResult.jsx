// client/src/components/ui/ToolResult.jsx
import { useMemo, useState } from "react";

function asArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return [String(v)];
}

function CopyMini({ value, lang }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  const label = useMemo(() => {
    if (lang === "fa") return copied ? "کپی شد ✅" : "کپی";
    return copied ? "Copied ✅" : "Copy";
  }, [copied, lang]);

  return (
    <button type="button" onClick={onCopy} className="ccg-btn ccg-btn-ghost ccg-btn-xs">
      {label}
    </button>
  );
}

function SectionCard({ title, icon, children, right }) {
  return (
    <div className="ccg-card">
      <div className="ccg-card__head">
        <div className="ccg-card__title flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <div className="ccg-card__right">{right}</div>
      </div>
      <div className="ccg-card__body">{children}</div>
    </div>
  );
}

export default function ToolResult({ tool, lang = "fa" }) {
  const t = tool && typeof tool === "object" ? tool : null;
  if (!t) return null;

  const title = String(t.title || "").trim();
  const cli = String(t.cli || "bash").trim() || "bash";
  const pythonScript = t.pythonScript === true;

  const primary = String(t.primary_command || "").trim();
  const alternatives = asArr(t.alternatives);
  const explanation = asArr(t.explanation);
  const warnings = asArr(t.warnings);
  const notes = asArr(t.notes);

  const py = String(t.python_script || "").trim();

  return (
    <div className={`space-y-3 ${lang === "fa" ? "rtl" : "ltr"}`}>
      {title ? (
        <div className="text-base font-bold text-slate-100">{title}</div>
      ) : null}

      {pythonScript ? (
        <SectionCard
          title={lang === "fa" ? "اسکریپت پایتون" : "Python Script"}
          icon="🐍"
          right={<CopyMini value={py} lang={lang} />}
        >
          <div className="ccg-codeblock">
            <div className="ccg-codeblock-head">
              <div className="ccg-codeblock-title">PYTHON</div>
            </div>
            <pre className="ccg-pre">
              <code dir="ltr">{py}</code>
            </pre>
          </div>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title={lang === "fa" ? "کامند اصلی" : "Primary Command"}
            icon="✅"
            right={<CopyMini value={primary} lang={lang} />}
          >
            <div className="ccg-codeblock">
              <div className="ccg-codeblock-head">
                <div className="ccg-codeblock-title">{cli.toUpperCase()}</div>
              </div>
              <pre className="ccg-pre">
                <code dir="ltr">{primary}</code>
              </pre>
            </div>
          </SectionCard>

          {alternatives.length ? (
            <SectionCard
              title={lang === "fa" ? "جایگزین‌ها" : "Alternatives"}
              icon="🔁"
              right={<CopyMini value={alternatives.join("\n")} lang={lang} />}
            >
              <div className="space-y-2">
                {alternatives.map((cmd, idx) => (
                  <div key={`${cmd}-${idx}`} className="ccg-codeblock">
                    <div className="ccg-codeblock-head">
                      <div className="ccg-codeblock-title">
                        {cli.toUpperCase()} • {lang === "fa" ? "جایگزین" : "Alt"} #{idx + 1}
                      </div>
                      <CopyMini value={cmd} lang={lang} />
                    </div>
                    <pre className="ccg-pre">
                      <code dir="ltr">{cmd}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </>
      )}

      {explanation.length ? (
        <SectionCard title={lang === "fa" ? "توضیحات" : "Explanation"} icon="📘">
          <ul className="list-disc pr-5 space-y-1 text-sm text-slate-200/90">
            {explanation.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {warnings.length ? (
        <SectionCard title={lang === "fa" ? "هشدارها" : "Warnings"} icon="⚠️">
          <ul className="list-disc pr-5 space-y-1 text-sm text-rose-200">
            {warnings.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {notes.length ? (
        <SectionCard title={lang === "fa" ? "نکات" : "Notes"} icon="💡">
          <ul className="list-disc pr-5 space-y-1 text-sm text-slate-200/80">
            {notes.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

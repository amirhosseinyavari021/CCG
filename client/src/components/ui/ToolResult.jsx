// /home/cando/CCG/client/src/components/ui/ToolResult.jsx
import { useMemo, useState } from "react";

function asArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return [String(v)];
}

function downloadTextFile(filename, content) {
  const text = String(content || "");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
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
    <button
      type="button"
      onClick={onCopy}
      className="px-2 py-1 rounded-lg text-xs border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 transition ccg-press"
    >
      {label}
    </button>
  );
}

function DownloadMini({ filename, content, lang }) {
  const label = lang === "fa" ? "دانلود" : "Download";
  return (
    <button
      type="button"
      onClick={() => downloadTextFile(filename, content)}
      className="px-2 py-1 rounded-lg text-xs border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 transition ccg-press"
      title={filename}
    >
      {label} ⬇️
    </button>
  );
}

function Badge({ text }) {
  if (!text) return null;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.06]">
      {text}
    </span>
  );
}

function SectionCard({ title, icon, children, right, tone = "base" }) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200/70 dark:border-rose-700/40 bg-rose-50/70 dark:bg-rose-900/20"
      : tone === "warn"
      ? "border-amber-200/70 dark:border-amber-700/40 bg-amber-50/70 dark:bg-amber-900/20"
      : "border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.06]";

  return (
    <div className={`rounded-2xl border ${toneClass} backdrop-blur`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="p-3">{children}</div>
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

  const hasPrimary = Boolean(primary);
  const hasAnyMeta = explanation.length || warnings.length || notes.length;

  return (
    <div className={`space-y-3 ${lang === "fa" ? "rtl" : "ltr"}`}>
      {title ? <div className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</div> : null}

      {pythonScript ? (
        <SectionCard
          title={lang === "fa" ? "اسکریپت پایتون" : "Python Script"}
          icon="🐍"
          tone="base"
          right={
            <>
              <Badge text="PYTHON" />
              <CopyMini value={py} lang={lang} />
              <DownloadMini filename="ccg_task.py" content={py} lang={lang} />
            </>
          }
        >
          <div className="ccg-codeblock">
            <pre className="ccg-pre">
              <code dir="ltr">{py}</code>
            </pre>
          </div>

          {notes.length ? (
            <div className="mt-3">
              <div className="text-xs font-semibold mb-2 opacity-90">{lang === "fa" ? "نکات" : "Notes"}</div>
              <ul className="list-disc list-inside ps-5 space-y-1 text-sm text-slate-700 dark:text-slate-200/90">
                {notes.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {warnings.length ? (
            <div className="mt-3">
              <div className="text-xs font-semibold mb-2 text-rose-700 dark:text-rose-200">{lang === "fa" ? "هشدارها" : "Warnings"}</div>
              <ul className="list-disc list-inside ps-5 space-y-1 text-sm text-rose-700 dark:text-rose-200">
                {warnings.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <>
          {/* اگر primary خالی بود، این کارت رو نمایش نمی‌دیم (برای خروجی‌های Script که ممکنه فقط توضیح/نکات داشته باشن) */}
          {hasPrimary ? (
            <SectionCard
              title={lang === "fa" ? "کامند اصلی" : "Primary Command"}
              icon="✅"
              tone="base"
              right={
                <>
                  <Badge text={cli.toUpperCase()} />
                  <CopyMini value={primary} lang={lang} />
                </>
              }
            >
              <div className="ccg-codeblock">
                <pre className="ccg-pre">
                  <code dir="ltr">{primary}</code>
                </pre>
              </div>
            </SectionCard>
          ) : null}

          {alternatives.length ? (
            <SectionCard
              title={lang === "fa" ? "جایگزین‌ها" : "Alternatives"}
              icon="🔁"
              tone="base"
              right={<CopyMini value={alternatives.join("\n")} lang={lang} />}
            >
              <div className="space-y-2">
                {alternatives.map((cmd, idx) => (
                  <div key={`${cmd}-${idx}`} className="ccg-codeblock">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge text={cli.toUpperCase()} />
                        <span className="text-xs opacity-80">{lang === "fa" ? "جایگزین" : "Alt"} #{idx + 1}</span>
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

          {/* اگر primary خالی بود ولی توضیحات/نکات داشتیم، هیچ مشکلی نیست و پایین نمایش داده می‌شود */}
          {!hasPrimary && !alternatives.length && !hasAnyMeta ? null : null}
        </>
      )}

      {explanation.length ? (
        <SectionCard title={lang === "fa" ? "توضیحات" : "Explanation"} icon="📘" tone="base">
          <ul className="list-disc list-inside ps-5 space-y-1 text-sm text-slate-700 dark:text-slate-200/90">
            {explanation.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {warnings.length ? (
        <SectionCard title={lang === "fa" ? "هشدارها" : "Warnings"} icon="⚠️" tone="danger">
          <ul className="list-disc list-inside ps-5 space-y-1 text-sm text-rose-700 dark:text-rose-200">
            {warnings.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {notes.length ? (
        <SectionCard title={lang === "fa" ? "نکات" : "Notes"} icon="💡" tone="warn">
          <ul className="list-disc list-inside ps-5 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {notes.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

// Minimal + TDZ-safe MarkdownBox:
// - NO local `const t = ...`
// - Use `t()` only from LanguageContext
export default function MarkdownBox({ value = "", title = "" }) {
  const { lang, t } = useLanguage();
  const isRTL = lang === "fa";
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => String(value || ""), [value]);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  // Very lightweight sectioning: keep raw markdown, let parent renderer handle if needed.
  return (
    <div className="ccg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200/80">
          {title || (isRTL ? "خروجی" : "Output")}
        </div>
        <button type="button" onClick={copyAll} className="ccg-btn text-sm">
          {copied ? (t("copied") || (isRTL ? "کپی شد" : "Copied")) : (t("copy") || (isRTL ? "کپی" : "Copy"))}
        </button>
      </div>

      <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100/90">
{text}
      </pre>
    </div>
  );
}

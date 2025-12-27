import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../context/LanguageContext";

export default function ErrorAnalyzerDrawer({ open, onClose, initial = {} }) {
  const { t, lang } = useLanguage();

  const [command, setCommand] = useState(initial.command || "");
  const [context, setContext] = useState(initial.context || "");

  // اگر از Generator با دیتای جدید باز شد
  useEffect(() => {
    if (!open) return;
    setCommand(initial.command || "");
    setContext(initial.context || "");
  }, [open, initial.command, initial.context]);

  // ESC برای بستن
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // قفل اسکرول
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dir = useMemo(() => (lang === "fa" ? "rtl" : "ltr"), [lang]);
  const side = dir === "rtl" ? "left-0" : "right-0";

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={[
          "absolute top-0 bottom-0",
          side,
          "w-full sm:w-[480px]",
          "ccg-card",
          "rounded-none sm:rounded-2xl",
          "m-0 sm:m-4",
          "p-4 sm:p-6",
          "overflow-y-auto",
        ].join(" ")}
        style={{
          // روی موبایل: بهتره از پایین بیاد (اختیاری)
          // ولی الان ساده و پایدار نگه داشتیم: تمام قد کنار صفحه
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-lg font-semibold">
              {t?.("errorAnalyzer") ?? "Error Analyzer"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300/70">
              {t?.("errorAnalyzerHint") ??
                "Paste error/log and (optional) context, then analyze."}
            </div>
          </div>

          <button onClick={onClose} className="ccg-btn-ghost px-3 py-2" type="button">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-slate-700 dark:text-slate-200/80">
            {t?.("errorInput") ?? "Error / Log / Command output"}
          </label>
          <textarea
            className="ccg-textarea w-full h-40"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={
              t?.("errorPlaceholder") ??
              "e.g. permission denied / command not found / stack trace / nginx error ..."
            }
          />

          <label className="block text-sm text-slate-700 dark:text-slate-200/80">
            {t?.("contextOptional") ?? "Extra context (optional)"}
          </label>
          <textarea
            className="ccg-textarea w-full h-28"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t?.("contextPlaceholder") ?? "What were you trying to do? environment? steps?"}
          />

          <button
            className="ccg-btn-primary w-full"
            type="button"
            disabled={!command.trim()}
            onClick={() => {
              // اینجا بعداً API/Wiring میاد
              // فعلاً فقط نمونه:
              console.log("Analyze:", { command, context });
            }}
          >
            {t?.("analyze") ?? "Analyze"}
          </button>
        </div>

        {/* (اختیاری) جای خروجی */}
        <div className="mt-6">
          <div className="text-sm font-semibold mb-2">
            {t?.("analysisOutput") ?? "Analysis Output"}
          </div>
          <div className="ccg-panel p-4 text-sm text-slate-700 dark:text-slate-200/90">
            {t?.("analysisPlaceholder") ?? "Result will appear here."}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

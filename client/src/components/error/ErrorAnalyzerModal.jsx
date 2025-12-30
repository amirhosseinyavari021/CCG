// client/src/components/error/ErrorAnalyzerModal.jsx
import { useEffect, useMemo, useState } from "react";
import { callCCG } from "../../services/aiService";
import MarkdownBox from "../ui/MarkdownBox";
import { useLanguage } from "../../context/LanguageContext";

export default function ErrorAnalyzerModal({ open, onClose, seed }) {
  const { lang, t } = useLanguage();

  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!open) return;
    setCommand(seed?.command || "");
    setContext(seed?.context || "");
    setErr("");
    setOutput("");
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const canSubmit = useMemo(() => command.trim().length > 0, [command]);

  async function analyze() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");

    try {
      const payload = {
        lang: lang || "en",
        user_request: command.trim(),
        error_message: context.trim() || "",
        // unify fields (backend normalize middleware هم اینا رو می‌فهمه)
        os: "unknown",
        platform: "unknown",
        cli: "cli",
        deviceType: "general",
        outputType: "command",
        output_style: "detailed",
        knowledgeLevel: "beginner",
      };

      const res = await callCCG(payload);
      setOutput(res.markdown || "");
    } catch (e) {
      setErr(e?.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[96%] max-w-3xl ccg-card p-4 sm:p-6 max-h-[86vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold">{t("ea_title")}</h2>
          <button onClick={onClose} className="ccg-btn-ghost px-3 text-xl leading-none" type="button">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-slate-200/80">{t("ea_command")}</label>
          <textarea
            className="ccg-textarea w-full h-28 sm:h-32"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={lang === "fa" ? "خروجی خطا/لاگ را قرار بده..." : "Paste your error/log/output..."}
          />

          <label className="text-sm text-slate-200/80">{t("ea_context")}</label>
          <textarea
            className="ccg-textarea w-full h-24"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={lang === "fa" ? "اختیاری: چه کاری انجام می‌دادی؟" : "Optional: what were you doing?"}
          />

          <button
            className="ccg-btn-primary w-full"
            disabled={!canSubmit || loading}
            onClick={analyze}
            type="button"
          >
            {loading ? (lang === "fa" ? "در حال تحلیل..." : "Analyzing...") : t("ea_analyze")}
          </button>

          {err ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {err}
            </div>
          ) : null}

          {output ? <MarkdownBox content={output} lang={lang} /> : null}
        </div>
      </div>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

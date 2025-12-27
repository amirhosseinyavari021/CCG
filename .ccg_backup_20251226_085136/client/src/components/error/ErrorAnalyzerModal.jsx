import { useEffect, useMemo, useState } from "react";
import { callCCG } from "../../services/aiService";
import MarkdownBox from "../ui/MarkdownBox";
import { useLanguage } from "../../context/LanguageContext";

export default function ErrorAnalyzerModal({ open, onClose, seed }) {
  const { lang, t } = useLanguage();

  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");

  const [knowledgeLevel, setKnowledgeLevel] = useState("beginner");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!open) return;
    setCommand(seed?.command || "");
    setContext(seed?.context || "");
    setKnowledgeLevel("beginner");
    setErr("");
    setOutput("");
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const canSubmit = useMemo(() => command.trim().length > 0, [command]);

  async function analyze() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");

    try {
      const payload = {
        intent: "error",
        lang: lang || "en",
        platform: "unknown",
        shell: "cli",
        vendor: "",
        deviceType: "",
        outputType: "command",
        knowledgeLevel,
        input: command.trim(),
        context: context.trim() || "",
      };

      const res = await callCCG(payload);

      // If backend returns markdown
      setOutput(res?.markdown || res?.result || "");
    } catch (e) {
      setErr(e?.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-[96vw] max-w-3xl ccg-card p-4 sm:p-6 max-h-[86vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("ea_title")}
          </h2>
          <button onClick={onClose} className="ccg-btn-ghost px-3" type="button">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="ccg-card p-3">
            <div className="text-xs text-slate-500 dark:text-slate-300/70 mb-1">
              {t("knowledge")}
            </div>
            <select
              className="ccg-select w-full"
              value={knowledgeLevel}
              onChange={(e) => setKnowledgeLevel(e.target.value)}
            >
              <option value="beginner">{t("beginner")}</option>
              <option value="intermediate">{t("intermediate")}</option>
              <option value="expert">{t("expert")}</option>
            </select>
          </div>

          <div className="ccg-card p-3 sm:col-span-2">
            <div className="text-xs text-slate-500 dark:text-slate-300/70 mb-1">
              {lang === "fa"
                ? "راهنما"
                : "Tip"}
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200/80">
              {lang === "fa"
                ? "لاگ/خروجی خطا را وارد کن؛ اگر دوست داشتی کانتکست هم اضافه کن."
                : "Paste your error/log output. Add optional context if you can."}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-slate-700 dark:text-slate-200/80">
            {t("ea_command")}
          </label>
          <textarea
            className="ccg-textarea w-full h-28 sm:h-32"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={t("ea_tip_command")}
          />

          <label className="text-sm text-slate-700 dark:text-slate-200/80">
            {t("ea_context")}
          </label>
          <textarea
            className="ccg-textarea w-full h-24"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t("ea_tip_context")}
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
            <div className="ccg-error">
              <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
              <div className="text-sm">{err}</div>
            </div>
          ) : null}

          {output ? (
            <div className="mt-2">
              <MarkdownBox content={output} />
            </div>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-300/70">
              {t("ea_result")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

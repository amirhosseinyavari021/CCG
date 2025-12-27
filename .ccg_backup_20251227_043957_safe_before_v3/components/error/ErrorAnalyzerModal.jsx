import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";
import Modal from "../ui/Modal";
import SectionedMarkdown from "../ui/SectionedMarkdown";

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

  const canSubmit = useMemo(() => command.trim().length > 0, [command]);

  async function analyze() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");

    try {
      const payload = {
        mode: "error",
        lang: lang || "fa",
        user_request: command.trim(),
        error_message: context.trim() || "",
        os: "unknown",
        cli: "cli",
        deviceType: "general",
        knowledgeLevel: "beginner",
      };

      const res = await callCCG(payload);
      setOutput(res?.markdown || res?.result || "");
    } catch (e) {
      setErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("ea_title")}>
      <div className="space-y-3">
        <label className="text-sm text-slate-700 dark:text-slate-200/80">
          {t("ea_command")}
        </label>
        <textarea
          className="ccg-textarea w-full h-28 sm:h-32"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={lang === "fa" ? "خروجی خطا/لاگ/کامند..." : "Error/log/command output..."}
        />

        <label className="text-sm text-slate-700 dark:text-slate-200/80">
          {t("ea_context")}
        </label>
        <textarea
          className="ccg-textarea w-full h-24"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={
            lang === "fa"
              ? "چه کاری انجام دادی؟ روی چه سیستمی؟ چه چیزی انتظار داشتی؟"
              : "What did you do? Which OS? What did you expect?"
          }
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
            <SectionedMarkdown markdown={output} lang={lang} />
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-300/70">
            {t("ea_result")}
          </div>
        )}
      </div>
    </Modal>
  );
}

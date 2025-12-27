// client/src/components/modals/ErrorAnalyzerModal.jsx
import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import MarkdownBox from "../ui/MarkdownBox";
import { analyzeError } from "../../services/aiService";
import { useLanguage } from "../../context/LanguageContext";

function s(v) {
  return typeof v === "string" ? v : JSON.stringify(v, null, 2);
}

export default function ErrorAnalyzerModal({
  open,
  onClose,
  initialError = "",
  contextHint = {},
}) {
  const { lang } = useLanguage();

  const t = useMemo(() => {
    if (lang === "fa") {
      return {
        title: "Error Analyzer",
        input1: "خطا / لاگ / خروجی / کامند",
        input2: "توضیحات تکمیلی (اختیاری)",
        ph1: "مثال: permission denied / command not found / stack trace / nginx error ...",
        ph2: "مثال: روی Ubuntu 22.04، بعد از آپدیت این اتفاق افتاد...",
        run: "تحلیل کن",
        close: "بستن",
        apiError: "خطا در ارتباط با API",
        outTitle: "خروجی تحلیل",
        empty: "اینجا خروجی نمایش داده می‌شود.",
      };
    }
    return {
      title: "Error Analyzer",
      input1: "Command / Error / Logs",
      input2: "Extra context (optional)",
      ph1: "Example: permission denied / command not found / stack trace / nginx error ...",
      ph2: "Example: On Ubuntu 22.04 after update, this happened...",
      run: "Analyze",
      close: "Close",
      apiError: "API error",
      outTitle: "Analysis Output",
      empty: "Output will appear here.",
    };
  }, [lang]);

  const [text, setText] = useState(initialError || "");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [out, setOut] = useState("");

  // reset when opened
  useEffect(() => {
    if (!open) return;
    setText(initialError || "");
    setExtra("");
    setApiErr("");
    setOut("");
  }, [open, initialError]);

  async function run() {
    setApiErr("");
    setOut("");
    const input = text.trim();
    if (!input) return;

    setLoading(true);
    try {
      const payload = {
        // backend-compat
        error: input,
        error_message: input,

        // optional extra context
        context: extra.trim() || undefined,

        // hints (safe extra fields)
        lang,
        ...contextHint,
      };

      const res = await analyzeError(payload);
      const md = s(res?.outputMarkdown || res?.output || res);
      setOut(md);
    } catch (e) {
      setApiErr(e?.message || t.apiError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.title} maxWidth={980}>
      <div className="ccg-grid" style={{ gap: 14 }}>
        <div className="ccg-panel">
          <div className="ccg-row" style={{ justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>{t.input1}</div>
            <button
              type="button"
              className="ccg-btn ccg-btn-primary"
              onClick={run}
              disabled={loading || !text.trim()}
            >
              {loading ? "..." : t.run}
            </button>
          </div>

          <textarea
            className="ccg-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.ph1}
            rows={7}
            style={{ marginTop: 10 }}
          />

          <div style={{ marginTop: 12, fontWeight: 600, color: "var(--text)" }}>{t.input2}</div>
          <textarea
            className="ccg-textarea"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={t.ph2}
            rows={4}
            style={{ marginTop: 8 }}
          />

          {apiErr ? <div className="ccg-error" style={{ marginTop: 12 }}>{apiErr}</div> : null}
        </div>

        <div className="ccg-panel">
          <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>{t.outTitle}</div>
          <MarkdownBox content={out || t.empty} lang={lang} />
        </div>
      </div>
    </Modal>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

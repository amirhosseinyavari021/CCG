import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";
import { callCCG } from "../../services/aiService";

export default function CodeComparatorPage() {
  const { t, lang } = useLanguage();

  const [inputs, setInputs] = useState({ a: "", b: "" });
  const [output, setOutput] = useState("");
  const [swapLayout, setSwapLayout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const compare = async () => {
    if (loading) return;
    const a = inputs.a.trim();
    const b = inputs.b.trim();
    if (!a && !b) return;

    setLoading(true);
    setApiErr("");
    setOutput("");

    try {
      const payload = {
        mode: "compare",
        lang: lang || "fa",
        codeA: a,
        codeB: b,
      };
      const res = await callCCG(payload);
      setOutput(res?.markdown || res?.result || "");
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ccg-container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        <div className={`ccg-card p-5 sm:p-8 ${swapLayout ? "order-2" : "order-1"}`}>
          <div className="flex justify-between items-center mb-4 gap-3">
            <h2 className="font-semibold text-lg">{t("inputs")}</h2>
            <button
              onClick={() => setSwapLayout((v) => !v)}
              className="ccg-btn"
              type="button"
            >
              ↔ {t("swapIO")}
            </button>
          </div>

          <textarea
            className="ccg-textarea w-full h-44 sm:h-52 p-3 mb-4"
            placeholder="Code A"
            value={inputs.a}
            onChange={(e) => setInputs({ ...inputs, a: e.target.value })}
          />

          <textarea
            className="ccg-textarea w-full h-44 sm:h-52 p-3"
            placeholder="Code B"
            value={inputs.b}
            onChange={(e) => setInputs({ ...inputs, b: e.target.value })}
          />

          <button
            className="mt-5 w-full ccg-btn-primary py-3"
            disabled={(!inputs.a.trim() && !inputs.b.trim()) || loading}
            onClick={compare}
            type="button"
          >
            {loading ? (lang === "fa" ? "در حال مقایسه..." : "Comparing...") : "Compare & Analyze"}
          </button>
        </div>

        <div className={`ccg-card p-5 sm:p-8 ${swapLayout ? "order-1" : "order-2"}`}>
          <h2 className="font-semibold text-lg mb-4">{t("output")}</h2>

          {apiErr ? (
            <div className="ccg-error mb-4">
              <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
              <div className="text-sm">{apiErr}</div>
            </div>
          ) : null}

          {output ? (
            <SectionedMarkdown markdown={output} lang={lang} />
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-300/70">
              {t("outputPlaceholder")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

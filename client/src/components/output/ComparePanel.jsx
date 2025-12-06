// client/src/components/output/ComparePanel.jsx
import { useState } from "react";

export default function ComparePanel({ lang, t, data }) {
  const [tab, setTab] = useState("sideBySide");

  const {
    codeA,
    codeB,
    logicalDiff,
    qualityReview,
    mergeSuggestion,
  } = data || {};

  const tabs = [
    { id: "sideBySide", label: t.tabSideBySide || "Side by Side" },
    { id: "diff", label: t.tabDifferences || "Differences" },
    { id: "analysis", label: t.tabAIAnalysis || "AI Analysis" },
    { id: "merge", label: t.tabSuggestedMerge || "Suggested Merge" },
  ];

  return (
    <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm md:text-base font-semibold text-gray-100">
          {t.analysisTitle || "AI Code Compare"}
        </h2>
      </div>

      <div className="inline-flex rounded-full bg-gray-900/80 border border-gray-800 p-1 mb-4">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`px-3 md:px-4 py-1.5 text-[11px] md:text-xs rounded-full transition ${
              tab === tb.id
                ? "bg-purple-500 text-black shadow"
                : "text-gray-300"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "sideBySide" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-gray-400 mb-1">
              {t.pasteCodeA || "Code A"}
            </p>
            <pre className="text-[11px] md:text-xs bg-black/80 border border-gray-800 rounded-xl p-3 overflow-x-auto text-gray-100 font-mono">
{codeA || data.input_a || ""}
            </pre>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">
              {t.pasteCodeB || "Code B"}
            </p>
            <pre className="text-[11px] md:text-xs bg-black/80 border border-gray-800 rounded-xl p-3 overflow-x-auto text-gray-100 font-mono">
{codeB || data.input_b || ""}
            </pre>
          </div>
        </div>
      )}

      {tab === "diff" && (
        <div className="mt-2 text-xs md:text-sm text-gray-200 whitespace-pre-wrap">
          {logicalDiff ||
            data.logicalDifferences ||
            (lang === "fa"
              ? "گزارش تفاوت‌ها از سمت AI در این بخش نمایش داده می‌شود."
              : "AI differences report will be shown here.")}
        </div>
      )}

      {tab === "analysis" && (
        <div className="mt-2 text-xs md:text-sm text-gray-200 whitespace-pre-wrap">
          {qualityReview ||
            data.qualityReview ||
            (lang === "fa"
              ? "تحلیل کیفیت و امنیت کد در این بخش نمایش داده می‌شود."
              : "Code quality & security analysis will appear here.")}
        </div>
      )}

      {tab === "merge" && (
        <pre className="mt-2 text-[11px] md:text-xs bg-black/80 border border-gray-800 rounded-xl p-3 overflow-x-auto text-emerald-300 font-mono whitespace-pre">
{mergeSuggestion || data.mergeSuggestion || ""}
        </pre>
      )}
    </div>
  );
}

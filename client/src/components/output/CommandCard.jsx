// client/src/components/output/CommandCard.jsx
import { ClipboardCopy } from "lucide-react";
import { useState } from "react";

export default function CommandCard({ lang, t, data }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        data.command || data.script || ""
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm md:text-base font-semibold text-gray-100">
          {data.mode === "script"
            ? lang === "fa"
              ? "اسکریپت پیشنهادی"
              : "Suggested Script"
            : lang === "fa"
            ? "دستور پیشنهادی"
            : "Suggested Command"}
        </h2>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 text-[11px] text-gray-100 hover:bg-gray-700"
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
          <span>{copied ? t.copied : lang === "fa" ? "کپی" : "Copy"}</span>
        </button>
      </div>

      {data.command || data.script ? (
        <pre className="w-full text-xs md:text-sm bg-black/70 border border-gray-800 rounded-xl p-3 overflow-x-auto text-emerald-300 font-mono">
{data.command || data.script}
        </pre>
      ) : null}

      {data.explanation && (
        <div className="mt-3 text-xs md:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {data.explanation}
        </div>
      )}

      {data.warning && (
        <p className="mt-2 text-xs text-amber-400">{data.warning}</p>
      )}
    </div>
  );
}

// client/src/components/ui/CodeBlock.jsx
import { useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function CodeBlock({
  code,
  language = "bash",
  showCopy = true,
  maxHeight = "520px",
}) {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  const langLabel = useMemo(() => String(language || "text").toUpperCase(), [language]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(code ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300 font-mono">{langLabel}</span>
        </div>

        {showCopy ? (
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1.5 text-xs text-gray-200 hover:text-white px-3 py-1 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
            title={lang === "fa" ? "کپی" : "Copy"}
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>{lang === "fa" ? "کپی شد" : "Copied"}</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>{lang === "fa" ? "کپی" : "Copy"}</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      <pre
        className="p-4 text-sm text-gray-100 font-mono overflow-x-auto"
        style={{ maxHeight, margin: 0 }}
      >
        <code>{String(code ?? "")}</code>
      </pre>
    </div>
  );
}

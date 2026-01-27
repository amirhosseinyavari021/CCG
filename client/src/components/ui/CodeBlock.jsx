import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function CodeBlock({ code, language = "bash" }) {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
}
  
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300 font-mono">
            {language.toUpperCase()}
          </span>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition"
        >
          {copied ? (
            <>
              <span>✓</span>
              {lang === "fa" ? "کپی شد" : "Copied"}
            </>
          ) : (
            <>
              <span>📋</span>
              {lang === "fa" ? "کپی" : "Copy"}
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

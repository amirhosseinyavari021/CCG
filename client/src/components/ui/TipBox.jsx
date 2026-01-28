import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function TipBox({ title, content, type = "info" }) {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(true);

  const typeStyles = {
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
  };

  const typeIcons = {
    info: "💡",
    warning: "⚠️",
    success: "✅",
    error: "❌"
  };

  if (!visible) return null;

  return (
    <div className={`rounded-lg border p-4 ${typeStyles[type]} animate-fadeIn`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[type]}</span>
          <h3 className="font-semibold text-sm">
            {typeof title === "object" ? title[lang] || title.en : title}
          </h3>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {typeof content === "object" ? content[lang] || content.en : content}
      </div>
    </div>
  );
}

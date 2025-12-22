// src/components/layout/Header.jsx
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { lang, toggleLang } = useLanguage();
  const { toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-300 dark:border-slate-800">
      <div className="text-lg font-semibold">
        CCG – Cando Command Generator
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg border px-3 py-1 text-sm
          border-slate-300 hover:bg-slate-200
          dark:border-slate-700 dark:hover:bg-slate-800"
        >
          🌗
        </button>

        <button
          onClick={toggleLang}
          className="rounded-lg border px-3 py-1 text-sm
          border-slate-300 hover:bg-slate-200
          dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {lang.toUpperCase()}
        </button>

        <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500">
          ورود / ثبت‌نام
        </button>
      </div>
    </header>
  );
}

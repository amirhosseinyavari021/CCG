// client/src/components/shared/Header.jsx
import { useAppView } from "../../hooks/useAppView.jsx";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { view, setView, openErrorAnalyzer } = useAppView();
  const { lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-[70] border-b border-[var(--border)] bg-[var(--bg-panel)]/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        {/* Left actions */}
        <div className="flex items-center gap-2">
          <button className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400">
            {lang === "fa" ? "ورود / ثبت‌نام" : "Login / Signup"}
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)] hover:opacity-90"
          >
            {lang === "fa" ? "FA" : "EN"}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)] hover:opacity-90"
            title={theme === "dark" ? "Light" : "Dark"}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
        </div>

        {/* Center view switch (دو صفحه) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("generator")}
            className={`rounded-xl px-4 py-2 text-sm border ${
              view === "generator"
                ? "border-blue-400 bg-blue-500/10 text-blue-200"
                : "border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] hover:opacity-90"
            }`}
          >
            {lang === "fa" ? "Generator" : "Generator"}
          </button>

          <button
            type="button"
            onClick={() => setView("comparator")}
            className={`rounded-xl px-4 py-2 text-sm border ${
              view === "comparator"
                ? "border-blue-400 bg-blue-500/10 text-blue-200"
                : "border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] hover:opacity-90"
            }`}
          >
            {lang === "fa" ? "Code Comparator" : "Code Comparator"}
          </button>

          <button
            type="button"
            onClick={openErrorAnalyzer}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm text-[var(--text)] hover:opacity-90"
          >
            {lang === "fa" ? "Error Analyzer" : "Error Analyzer"}
          </button>
        </div>

        {/* Right brand */}
        <div className="text-sm font-semibold text-[var(--text)]">
          CCG – Cando Command Generator
        </div>
      </div>
    </header>
  );
}

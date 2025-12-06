// client/src/components/layout/Header.jsx
import { useContext } from "react";
import { LanguageContext } from "../../LanguageContext";
import { Sun, Moon, TerminalSquare } from "lucide-react";

export default function Header() {
  const { lang, toggleLang } = useContext(LanguageContext);

  return (
    <header className="w-full border-b border-gray-800/70 bg-black/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo + brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center">
            <TerminalSquare className="w-5 h-5 text-amber-400" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm md:text-base">CCG</div>
            <div className="text-[11px] md:text-xs text-gray-400">
              Cando Command Generator
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Theme toggle (فعلاً فقط دکوری، بعداً می‌تونیم واقعاً تم رو سوییچ کنیم) */}
          <button
            type="button"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-700 text-xs text-gray-300 hover:bg-gray-800/80 transition"
          >
            <Sun className="w-3 h-3" />
            <span>{lang === "fa" ? "تم" : "Theme"}</span>
          </button>

          {/* Lang toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 text-xs text-gray-100 border border-gray-700 hover:bg-gray-700 transition"
          >
            <span className="font-semibold">
              {lang === "fa" ? "FA" : "EN"}
            </span>
            <span className="text-gray-400">
              {lang === "fa" ? "زبان" : "Lang"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

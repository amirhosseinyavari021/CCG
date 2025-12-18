import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { appConfig } from "../../config/app";
import { Sun, Moon, User } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { lang, toggleLanguage, isRTL } = useLanguage();
  const { user } = useAuth(); // null => guest
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-100">
            {appConfig.appName}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          
          {/* Language */}
          <button
            onClick={toggleLanguage}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            {lang === "fa" ? "EN" : "FA"}
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Auth */}
          {!user ? (
            <a
              href="/login"
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-blue-400"
            >
              {isRTL ? "ورود / ثبت‌نام" : "Login / Sign up"}
            </a>
          ) : (
            <a
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <User size={16} />
              {isRTL ? "پروفایل" : "Profile"}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

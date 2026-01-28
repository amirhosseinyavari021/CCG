import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLang = () => {
    const newLang = lang === "fa" ? "en" : "fa";
    setLang(newLang);
  };

  const navigationItems = [
    { id: "generator", label: t("generator") || "Generator", icon: "🚀" },
    { id: "comparator", label: t("comparator") || "Code Compiler", icon: "🔄" },
    { id: "chat", label: t("chat") || "Chat", icon: "💬" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="ccg-container">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Menu Button */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">CCG</span>
              </div>
              <span className="font-bold text-sm hidden sm:inline">Cando Command Generator</span>
              <span className="font-bold text-sm sm:hidden">CCG</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("ccg-navigate", { detail: item.id }));
                }}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-sm"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-sm font-medium"
              aria-label={lang === "fa" ? "Switch to English" : "تغییر به فارسی"}
            >
              {lang === "fa" ? "EN" : "فا"}
            </button>

            {/* Auth buttons */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("ccg-auth", { detail: "login" }))}
                className="px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                {lang === "fa" ? "ورود" : "Login"}
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("ccg-auth", { detail: "signup" }))}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
              >
                {lang === "fa" ? "ثبت‌نام" : "Sign Up"}
              </button>
            </div>
            
            {/* Mobile Auth Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("ccg-auth", { detail: "menu" }))}
              className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <span className="text-sm">👤</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="ccg-container py-3">
            <div className="flex flex-col gap-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-left"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("ccg-navigate", { detail: item.id }));
                    setMenuOpen(false);
                  }}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
              
              {/* Mobile Auth Section */}
              <div className="border-t border-gray-200 dark:border-gray-800 mt-2 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("ccg-auth", { detail: "login" }));
                      setMenuOpen(false);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {lang === "fa" ? "ورود" : "Login"}
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("ccg-auth", { detail: "signup" }));
                      setMenuOpen(false);
                    }}
                    className="px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90"
                  >
                    {lang === "fa" ? "ثبت‌نام" : "Sign Up"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

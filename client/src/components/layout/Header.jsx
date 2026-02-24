import { NavLink } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: "/generator", label: t("generator") || "Generator", icon: "🚀" },
    { to: "/compare", label: t("comparator") || "Comparator", icon: "🔄" },
    { to: "/chat", label: t("chat") || "Chat", icon: "💬" },
  ];

  const navClass = ({ isActive }) =>
    `flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs">
              CCG
            </div>
            <span className="hidden sm:inline">Cando Command Generator</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3 text-sm">

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              onClick={() => setLang(lang === "fa" ? "en" : "fa")}
              className="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
            >
              {lang === "fa" ? "EN" : "فا"}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}

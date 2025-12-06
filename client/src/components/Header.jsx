// client/src/components/Header.jsx
import { useContext } from "react";
import { LanguageContext } from "../LanguageContext";
import { AuthContext } from "../AuthContext";
import { Menu, Sun, Moon, User, LogOut } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";

export default function Header({ onMenu }) {
  const { lang, t, toggleLang, theme, toggleTheme } = useContext(LanguageContext);
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const isRTL = lang === "fa";

  const handleAuthClick = () => {
    navigate("/auth");
  };

  const handleDashboard = () => {
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header
      className="w-full bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3
                 flex items-center justify-between sticky top-0 z-30"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="md:hidden p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
        >
          <Menu size={20} />
        </button>

        <div
          className={`flex items-baseline gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <span className="text-lg font-bold tracking-tight">CCG</span>
          <span className="text-xs text-gray-400">v3.2.0</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-3 ms-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-xs md:text-sm ${
                isActive ? "text-amber-400" : "text-gray-300"
              } hover:text-white`
            }
          >
            {lang === "fa" ? "خانه" : "Home"}
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) =>
              `text-xs md:text-sm ${
                isActive ? "text-amber-400" : "text-gray-300"
              } hover:text-white`
            }
          >
            {t?.about || (lang === "fa" ? "درباره" : "About")}
          </NavLink>
        </nav>
      </div>

      {/* Right */}
      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Telegram */}
        <a
          href="https://t.me/+KOknn1yVxlM1OWI0"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full
                     text-xs md:text-sm bg-sky-600 hover:bg-sky-500 text-white"
        >
          {lang === "fa" ? "عضویت در کانال تلگرام" : "Join Telegram"}
        </a>

        {/* Lang toggle */}
        <button
          onClick={toggleLang}
          className="text-xs md:text-sm text-gray-300 hover:text-white border border-gray-700
                     rounded-full px-3 py-1"
        >
          {lang === "fa" ? "FA" : "EN"}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Auth */}
        {!isAuthenticated ? (
          <button
            onClick={handleAuthClick}
            className="px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm
                       bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            {lang === "fa" ? "ورود / ثبت‌نام" : "Login / Sign up"}
          </button>
        ) : (
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700"
            >
              <User size={16} />
              <span className="text-xs md:text-sm truncate max-w-[80px] md:max-w-[120px]">
                {user?.name || user?.email || "User"}
              </span>
            </button>

            <div
              className="absolute end-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl
                         shadow-lg opacity-0 pointer-events-none group-hover:opacity-100
                         group-hover:pointer-events-auto transition"
            >
              <button
                onClick={handleDashboard}
                className="w-full text-right text-xs md:text-sm px-3 py-2 hover:bg-gray-800"
              >
                {lang === "fa" ? "داشبورد" : "Dashboard"}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between text-xs md:text-sm px-3 py-2 hover:bg-gray-800 text-red-400"
              >
                <span>{lang === "fa" ? "خروج" : "Logout"}</span>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

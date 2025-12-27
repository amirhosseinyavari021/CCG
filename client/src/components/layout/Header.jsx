import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useAppView } from "../../hooks/useAppView";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { view, setView } = useAppView();
  const { lang, setLang, t } = useLanguage();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLang = () => {
    const next = lang === "fa" ? "en" : "fa";
    setLang(next);
    localStorage.setItem("ccg_lang", next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const go = (nextView) => {
    setView(nextView);
    setMenuOpen(false);
  };

  const Drawer = () => (
    <div className={`fixed inset-0 z-[20000] ${menuOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${
          menuOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <div
        className={[
          "absolute top-0 bottom-0",
          lang === "fa" ? "right-0" : "left-0",
          "w-[86vw] max-w-[360px]",
          "ccg-card rounded-none p-4",
          "transition-transform duration-200",
          menuOpen ? "translate-x-0" : lang === "fa" ? "translate-x-full" : "-translate-x-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold">CCG</div>
            <div className="text-xs text-slate-500 dark:text-slate-300/70">
              {t("menu")}
            </div>
          </div>
          <button className="ccg-btn-ghost px-3 py-2" onClick={() => setMenuOpen(false)} type="button">
            ✕
          </button>
        </div>

        <div className="grid gap-2">
          <DrawerItem active={view === "generator"} onClick={() => go("generator")}>
            {t("generator")}
          </DrawerItem>
          <DrawerItem active={view === "comparator"} onClick={() => go("comparator")}>
            {t("comparator")}
          </DrawerItem>
        </div>

        <div className="mt-4 border-t pt-4 space-y-2">
          <button className="ccg-btn w-full" type="button" onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button className="ccg-btn w-full" type="button" onClick={toggleLang}>
            {lang === "fa" ? "Switch to English" : "تغییر به فارسی"}
          </button>

          {!user ? (
            <button
              className="ccg-btn-primary w-full"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new Event("open-auth-modal"));
              }}
            >
              {t("signIn")}
            </button>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-300/70">
              {user?.email || "Logged in"}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <header className="pt-6 mb-8">
      <div className="ccg-container">
        <div className="ccg-card px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-bold leading-tight">CCG</div>
            <div className="text-xs text-slate-500 dark:text-slate-300/70 truncate">
              Cando Command Generator
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Nav active={view === "generator"} onClick={() => go("generator")}>
              {t("generator")}
            </Nav>
            <Nav active={view === "comparator"} onClick={() => go("comparator")}>
              {t("comparator")}
            </Nav>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="ccg-btn px-3 py-2" type="button" title="Theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button onClick={toggleLang} className="ccg-btn px-3 py-2" type="button">
              {lang === "fa" ? "EN" : "FA"}
            </button>

            {!user ? (
              <button
                onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}
                className="ccg-btn-primary px-4 py-2 hidden sm:inline-flex"
                type="button"
              >
                {t("signIn")}
              </button>
            ) : (
              <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-200/80">
                {user.email}
              </span>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden ccg-btn px-3 py-2"
              type="button"
              aria-label="Open menu"
              title="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {createPortal(<Drawer />, document.body)}
    </header>
  );
}

function Nav({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`px-4 py-2 rounded-xl text-sm transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

function DrawerItem({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

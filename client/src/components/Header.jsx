// client/src/components/Header.jsx
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const { lang, setLang } = useLanguage();
  const { theme, toggle } = useTheme();

  return (
    <header className="ccg-header">
      <div className="ccg-header-left">
        <button className="ccg-btn primary" type="button">
          {lang === "fa" ? "ورود / ثبت‌نام" : "Login / Signup"}
        </button>

        <button
          className="ccg-btn"
          type="button"
          onClick={() => setLang(lang === "fa" ? "en" : "fa")}
          title={lang === "fa" ? "تغییر زبان" : "Switch language"}
        >
          {lang === "fa" ? "FA" : "EN"}
        </button>

        <button
          className="ccg-btn"
          type="button"
          onClick={toggle}
          title={lang === "fa" ? "تغییر تم" : "Toggle theme"}
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>

      <div className="ccg-header-right">
        <div className="ccg-brand">CCG – Cando Command Generator</div>
      </div>
    </header>
  );
}


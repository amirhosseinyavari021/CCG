import { useLanguage } from "../../context/LanguageContext";

export default function MainLayout({ children }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} className="min-h-screen">
      {children}
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

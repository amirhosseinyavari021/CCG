import { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { useLanguage } from "../../context/LanguageContext";

export default function MainLayout({ children }) {
  const { lang } = useLanguage();

  // ✅ inject styles ONCE
  useEffect(() => {
    const STYLE_ID = "ccg-mainlayout-inline-style";
    if (document.getElementById(STYLE_ID)) return;

    const styles = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
    `;

    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" dir={lang === "fa" ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-grow mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="animate-fadeIn">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

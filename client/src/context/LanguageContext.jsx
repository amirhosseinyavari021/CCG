// client/src/context/LanguageContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageCtx = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("ccg_lang") || "fa");

  useEffect(() => {
    localStorage.setItem("ccg_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      isRTL: lang === "fa",
      setLang,
      toggleLanguage: () => setLang((p) => (p === "fa" ? "en" : "fa")),
    }),
    [lang]
  );

  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageCtx);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

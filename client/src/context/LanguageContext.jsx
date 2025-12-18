// src/context/LanguageContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    inputs: "Inputs",
    output: "Output",
    platform: "Platform",
    cli: "CLI / Shell",
    deviceType: "Device Type",
    request: "Request",
    generate: "Generate Output",
  },
  fa: {
    inputs: "ورودی‌ها",
    output: "خروجی",
    platform: "پلتفرم",
    cli: "CLI / شل",
    deviceType: "نوع دیوایس",
    request: "درخواست",
    generate: "تولید خروجی",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("ccg_lang");
    if (saved) setLang(saved);
  }, []);

  const changeLanguage = (l) => {
    setLang(l);
    localStorage.setItem("ccg_lang", l);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        isRTL: lang === "fa",
        t: translations[lang],
        changeLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

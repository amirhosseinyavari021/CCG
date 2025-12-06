// client/src/LanguageContext.jsx
import { createContext, useState, useEffect, useMemo } from "react";
import { translations } from "./constants/translations";

export const LanguageContext = createContext({
  lang: "fa",
  t: translations.fa,
  toggleLang: () => {},
  theme: "dark",
  toggleTheme: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("fa");
  const [theme, setTheme] = useState("dark");

  // load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLang = localStorage.getItem("lang");
    if (storedLang === "fa" || storedLang === "en") {
      setLang(storedLang);
    }

    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    } else {
      setTheme("dark");
    }
  }, []);

  // persist lang
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("lang", lang);
  }, [lang]);

  // persist + apply theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("theme", theme);

    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleLang = () => {
    setLang((prev) => (prev === "fa" ? "en" : "fa"));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const value = useMemo(
    () => ({
      lang,
      t: translations[lang] || translations.fa,
      toggleLang,
      theme,
      toggleTheme,
    }),
    [lang, theme]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (k) => String(k || ""),
});

const LS_LANG = "ccg_lang_v1";

const DICT = {
  en: {
    generator: "Generator",
    comparator: "Code Comparator",
    chat: "Chat",
    platform: "Platform",
    shell: "Shell / CLI",
    vendor: "Vendor",
    deviceType: "Device type",
    request: "Request",
    output: "Output",
    outputType: "Output type",
    output_tool: "Tool (command + explanation + warnings + alternatives)",
    output_command: "Command (command only)",
    output_python: "Python Automation",
    advanced: "Advanced",
    custom: "Custom",
    swap: "Swap",
    generate: "Generate",
    explain: "Explain",
    copy: "Copy",
    copied: "Copied",
  },
  fa: {
    generator: "جنریتور",
    comparator: "مقایسه کد",
    chat: "چت",
    platform: "پلتفرم",
    shell: "شل / CLI",
    vendor: "وندور",
    deviceType: "نوع دستگاه",
    request: "درخواست",
    output: "خروجی",
    outputType: "نوع خروجی",
    output_tool: "Tool (دستور + توضیح + هشدار + جایگزین‌ها)",
    output_command: "Command (فقط دستور)",
    output_python: "اتوماسیون پایتون",
    advanced: "پیشرفته",
    custom: "سفارشی",
    swap: "جابجایی",
    generate: "ساخت",
    explain: "توضیح",
    copy: "کپی",
    copied: "کپی شد",
  },
}

function pickInitialLang() {
  try {
    const u = new URL(window.location.href);
    const q = (u.searchParams.get("lang") || "").toLowerCase();
    if (q === "fa" || q === "en") return q;
  } catch {}

  const ls = (localStorage.getItem(LS_LANG) || "").toLowerCase();
  if (ls === "fa" || ls === "en") return ls;
  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(pickInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(LS_LANG, lang);
    } catch {}

    // Persist in URL too (nice for refresh/share)
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", lang);
      window.history.replaceState({}, "", u.toString());
    } catch {}
  }, [lang]);

  // IMPORTANT: `t` is defined BEFORE it is ever referenced anywhere in this module.
  const t = useCallback((key) => {
    const k = String(key || "");
    const table = DICT[lang] || DICT.en;
    return table[k] ?? DICT.en[k] ?? k;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

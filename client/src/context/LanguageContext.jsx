import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const LanguageContext = createContext(null);

const LS_LANG = "ccg_lang_v1";

// Keep it permissive: missing keys fall back to EN then the key itself.
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
    invalid_custom: "Invalid custom values. Allowed: letters/numbers/space . _ + - /",
    invalid_platform_mismatch: "Advanced details must match selected platform.",
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
    output_python: "Python Automation",
    advanced: "تنظیمات بیشتر",
    custom: "سفارشی",
    swap: "جابجایی",
    generate: "تولید",
    explain: "توضیح دستور",
    copy: "کپی",
    copied: "کپی شد",
    invalid_custom: "مقادیر Custom نامعتبر است. فقط حروف/عدد/._+-/ و فاصله مجاز است.",
    invalid_platform_mismatch: "جزئیات Advanced باید با پلتفرم انتخابی هم‌خوان باشد.",
  },
};

function readLangFromUrl() {
  try {
    const u = new URL(window.location.href);
    const q = (u.searchParams.get("lang") || "").toLowerCase();
    return q === "fa" || q === "en" ? q : "";
  } catch {
    return "";
  }
}

function writeLangToUrl(lang) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("lang", lang);
    window.history.replaceState({}, "", u.toString());
  } catch {}
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const fromUrl = readLangFromUrl();
    if (fromUrl) return fromUrl;
    const saved = (localStorage.getItem(LS_LANG) || "").toLowerCase();
    if (saved === "fa" || saved === "en") return saved;
    return "en";
  });

  const setLang = useCallback((next) => {
    const v = String(next || "").toLowerCase();
    if (v !== "fa" && v !== "en") return;
    setLangState(v);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_LANG, lang);
    } catch {}
    writeLangToUrl(lang);
    // also set dir attribute for better RTL/LTR behavior
    try {
      document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    } catch {}
  }, [lang]);

  // ✅ IMPORTANT: define t BEFORE it is used in value/useMemo (prevents TDZ)
  const t = useCallback(
    (key) => {
      const k = String(key || "");
      const dLang = DICT[lang] || {};
      const dEn = DICT.en || {};
      return dLang[k] ?? dEn[k] ?? k;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback: never throw during render
    return { lang: "en", setLang: () => {}, t: (k) => String(k || "") };
  }
  return ctx;
}

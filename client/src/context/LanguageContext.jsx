import React, { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const dict = {
  en: {
    generator: "Generator",
    comparator: "Code Comparator",
    chat: "Chat",
    output: "Output",
    outputPlaceholder: "Your result will appear here.",
    request: "Request",
    placeholderReq: "درخواستت را واضح بنویس (هدف + محدودیت‌ها). مثال: «می‌خوام فضای خالی دیسک رو ببینم»",
    generate: "Generate",
    explainMore: "Explain this command",
    platform: "Platform",
    shell: "Shell/CLI",
    outputType: "Output type",
    tool: "Tool (recommended)",
    commandShell: "Command",
    pythonAutomation: "Python automation",
    advanced: "Advanced",
    verbosity: "Verbosity",
    concise: "Concise",
    normal: "Normal",
    detailed: "Detailed",
    osDetails: "OS details",
    osFamily: "OS family",
    osName: "OS name",
    osVersion: "OS version (optional)",
    customOS: "Custom OS (validated)",
    customShell: "Custom shell (validated)",
    tip_platform: "Choose your target platform (what you want commands for).",
    tip_outputType: "Tool=command+explanation+warnings+alternatives. Command=copy-only. Python=automation script.",
    tip_vendor: "Network vendor/device type.",
    tip_shell: "Target shell/CLI (bash/pwsh/cmd...).",
    tip_verbosity: "Only affects explanation depth. Command and warnings remain stable.",
    errorShortcutText: "Got an error? Use the analyzer or chat.",
    openErrorAnalyzer: "Open error analyzer",
    vendor: "Vendor",
    deviceType: "Device type",
  },
  fa: {
    generator: "جنریتور",
    comparator: "مقایسه کد",
    chat: "گفت‌وگو",
    output: "خروجی",
    outputPlaceholder: "خروجی اینجا نمایش داده می‌شود.",
    request: "درخواست",
    placeholderReq: "درخواستت را واضح بنویس (هدف + محدودیت‌ها). مثال: «می‌خوام فضای خالی دیسک رو ببینم»",
    generate: "Generate",
    explainMore: "توضیح همین دستور",
    platform: "پلتفرم",
    shell: "شل / CLI",
    outputType: "نوع خروجی",
    tool: "Tool (پیشنهادی)",
    commandShell: "کامند",
    pythonAutomation: "اتوماسیون پایتون",
    advanced: "Advanced",
    verbosity: "Verbosity",
    concise: "خلاصه",
    normal: "نرمال",
    detailed: "جزئی",
    osDetails: "جزئیات سیستم‌عامل",
    osFamily: "خانواده OS",
    osName: "نام OS",
    osVersion: "ورژن (اختیاری)",
    customOS: "OS سفارشی (با اعتبارسنجی)",
    customShell: "Shell سفارشی (با اعتبارسنجی)",
    tip_platform: "برای چه پلتفرمی خروجی می‌خواهی (Target)؟",
    tip_outputType: "Tool=کامند+توضیح+هشدار+جایگزین‌ها. کامند=فقط قابل کپی. پایتون=اسکریپت اتوماسیون.",
    tip_vendor: "برند/نوع دستگاه شبکه.",
    tip_shell: "شل مقصد (bash/pwsh/cmd...).",
    tip_verbosity: "فقط روی میزان توضیح اثر دارد. کامند و هشدارها ثابت می‌مانند.",
    errorShortcutText: "ارور داری؟ از آنالیزور یا چت استفاده کن.",
    openErrorAnalyzer: "باز کردن آنالیزور خطا",
    vendor: "Vendor",
    deviceType: "Device Type",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("fa");

  const t = useMemo(() => {
    return (key) => dict?.[lang]?.[key] ?? dict?.en?.[key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

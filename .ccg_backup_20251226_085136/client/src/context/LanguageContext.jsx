import React, { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const DICT = {
  en: {
    generator: "Generator",
    comparator: "Code Comparator",
    signIn: "Sign in",
    menu: "Menu",

    platform: "Platform",
    vendor: "Vendor",
    deviceType: "Device Type",
    outputType: "Output Type",
    cliShell: "CLI / Shell",
    mode: "Mode",
    knowledge: "Knowledge",
    request: "Request",

    learn: "Learn",
    operational: "Operational",
    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",

    commandShell: "Command / Shell",
    pythonAutomation: "Python Automation",

    inputs: "Inputs",
    output: "Output",
    generate: "Generate Output",
    swapIO: "Swap Input ↔ Output",
    openErrorAnalyzer: "Open Error Analyzer",
    errorShortcutText:
      "If you hit an error… open Error Analyzer to get root cause + fix + verification.",

    placeholderReq: "e.g. safely check disk usage on a Linux server",
    outputPlaceholder: "Output will appear here.",

    tip_platform: "Choose target OS/device so outputs match your environment.",
    tip_vendor: "Select network vendor (should match backend supported vendors).",
    tip_deviceType: "Choose device type for more accurate network commands.",
    tip_outputType: "Choose command/shell output or Python automation script.",
    tip_cliShell: "Choose shell to match your system (bash/zsh/PowerShell...).",
    tip_mode: "Learn: detailed & educational. Operational: concise & production-safe.",
    tip_knowledge: "Controls depth of explanations (Beginner is more verbose).",
    tip_request: "Describe what you want. Include constraints and safety requirements.",

    ea_title: "Error Analyzer",
    ea_command: "Command / Error / Log",
    ea_context: "Extra context (optional)",
    ea_analyze: "Analyze",
    ea_clear: "Clear",
    ea_result: "Analysis result will appear here.",
  },

  fa: {
    generator: "جنریتور",
    comparator: "مقایسه کد",
    signIn: "ورود",
    menu: "منو",

    platform: "پلتفرم",
    vendor: "وندور",
    deviceType: "نوع دستگاه",
    outputType: "نوع خروجی",
    cliShell: "شل / CLI",
    mode: "حالت",
    knowledge: "سطح دانش",
    request: "درخواست",

    learn: "آموزشی",
    operational: "عملیاتی",
    beginner: "مبتدی",
    intermediate: "متوسط",
    expert: "حرفه‌ای",

    commandShell: "کامند / شل",
    pythonAutomation: "اتوماسیون پایتون",

    inputs: "ورودی‌ها",
    output: "خروجی",
    generate: "ساخت خروجی",
    swapIO: "جابجایی ورودی ↔ خروجی",
    openErrorAnalyzer: "باز کردن آنالیز خطا",
    errorShortcutText:
      "اگر به خطا خوردی… آنالیز خطا را باز کن تا علت + رفع + صحت‌سنجی را بگیری.",

    placeholderReq: "مثلاً: بررسی امن فضای دیسک روی سرور لینوکس",
    outputPlaceholder: "خروجی اینجا نمایش داده می‌شود.",

    tip_platform: "سیستم عامل/دستگاه مقصد را انتخاب کن تا خروجی دقیق و متناسب باشد.",
    tip_vendor: "وندور شبکه را انتخاب کن (باید با وندورهای بک‌اند یکی باشد).",
    tip_deviceType: "نوع دستگاه شبکه را انتخاب کن تا دستورات دقیق‌تر تولید شود.",
    tip_outputType: "خروجی را به صورت کامند/شل یا اسکریپت اتوماسیون پایتون بگیر.",
    tip_cliShell: "شل متناسب سیستم را انتخاب کن (bash/zsh/PowerShell...).",
    tip_mode: "آموزشی: توضیح کامل. عملیاتی: خلاصه و امن برای پروداکشن.",
    tip_knowledge: "میزان توضیح را کنترل می‌کند (مبتدی = توضیح بیشتر).",
    tip_request: "درخواستت را دقیق بنویس؛ محدودیت‌ها و نکات امنیتی را هم بگو.",

    ea_title: "آنالیز خطا",
    ea_command: "کامند / خطا / لاگ",
    ea_context: "توضیح تکمیلی (اختیاری)",
    ea_analyze: "تحلیل",
    ea_clear: "پاک کردن",
    ea_result: "نتیجه تحلیل اینجا نمایش داده می‌شود.",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("ccg_lang") || "fa");

  const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

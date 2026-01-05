import React, { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const DICT = {
  en: {
    generator: "Generator",
    comparator: "Code Comparator",
    chat: "گفت‌وگو",

    signIn: "Sign in",
    menu: "Menu",

    // generator ui
    platform: "Platform",
    vendor: "Vendor",
    deviceType: "Device Type",
    outputType: "Output Type",
    cliShell: "CLI / Shell",
    knowledge: "Knowledge",
    style: "Output style",
    request: "Request",
    learnInput: "Command / code you want to understand",
    advanced: "Advanced",

    learn: "Learn",
    generate: "Generate",
    operational: "Operational",
    detailed: "Detailed",

    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",

    commandShell: "Command / Shell",
    pythonAutomation: "Python Automation",

    inputs: "Inputs",
    output: "Output",
    generateBtn: "Generate Output",
    learnBtn: "Explain",
    swapIO: "Swap Input ↔ Output",
    openErrorAnalyzer: "Open Error Analyzer",
    errorShortcutText:
      "If you hit an error… open Error Analyzer to get root cause + fix + verification.",

    placeholderReq: "e.g. safely check disk usage on a Linux server",
    placeholderLearn: "e.g. ls -la   or   Get-Process",
    outputPlaceholder: "Output will appear here.",

    tip_platform: "Choose target OS/device so outputs match your environment.",
    tip_vendor: "Select network vendor (must match backend supported vendors).",
    tip_deviceType: "Choose device type for more accurate network commands.",
    tip_outputType: "Command output or Python automation script.",
    tip_cliShell: "Choose shell to match your system.",
    tip_knowledge: "Controls depth of explanation.",
    tip_style: "Operational: concise. Detailed: more explanation + warnings.",
    tip_request: "Describe what you want. Include constraints and safety requirements.",
    tip_learnInput: "Paste the command/code you want explained.",

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
    chat: "Chat",

    signIn: "ورود",
    menu: "منو",

    platform: "پلتفرم",
    vendor: "وندور",
    deviceType: "نوع دستگاه",
    outputType: "نوع خروجی",
    cliShell: "شل / CLI",
    knowledge: "سطح دانش",
    style: "استایل خروجی",
    request: "درخواست",
    learnInput: "کامند/کد برای یادگیری",
    advanced: "تنظیمات بیشتر",

    learn: "Learn",
    generate: "Generate",
    operational: "عملیاتی",
    detailed: "Detailed",

    beginner: "مبتدی",
    intermediate: "متوسط",
    expert: "حرفه‌ای",

    commandShell: "کامند / شل",
    pythonAutomation: "اتوماسیون پایتون",

    inputs: "ورودی‌ها",
    output: "خروجی",
    generateBtn: "ساخت خروجی",
    learnBtn: "توضیح بده",
    swapIO: "جابجایی ورودی ↔ خروجی",
    openErrorAnalyzer: "باز کردن آنالیز خطا",
    errorShortcutText:
      "اگر به خطا خوردی… آنالیز خطا را باز کن تا علت + رفع + صحت‌سنجی را بگیری.",

    placeholderReq: "مثلاً: بررسی امن فضای دیسک روی سرور لینوکس",
    placeholderLearn: "مثلاً: ls -la  یا  Get-Process",
    outputPlaceholder: "خروجی اینجا نمایش داده می‌شود.",

    tip_platform: "سیستم مقصد را انتخاب کن تا خروجی دقیق و درست باشد.",
    tip_vendor: "وندور شبکه را انتخاب کن (با بک‌اند باید یکی باشد).",
    tip_deviceType: "نوع دستگاه شبکه را انتخاب کن.",
    tip_outputType: "خروجی کامند/شل یا اسکریپت پایتون بگیر.",
    tip_cliShell: "شل متناسب سیستم را انتخاب کن.",
    tip_knowledge: "عمق توضیح را کنترل می‌کند.",
    tip_style: "عملیاتی: خلاصه. Detailed: توضیح بیشتر + هشدارها.",
    tip_request: "درخواستت را دقیق بنویس و محدودیت‌ها را بگو.",
    tip_learnInput: "کامند/کدی که می‌خواهی توضیح داده شود را قرار بده.",

    ea_title: "آنالیز خطا",
    ea_command: "کامند / خطا / لاگ",
    ea_context: "توضیح تکمیلی (اختیاری)",
    ea_analyze: "تحلیل",
    ea_clear: "پاک کردن",
    ea_result: "نتیجه تحلیل اینجا نمایش داده می‌شود.",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("ccg_lang") || "en");
  const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

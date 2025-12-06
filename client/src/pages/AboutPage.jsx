// client/src/pages/AboutPage.jsx
import { useContext } from "react";
import { LanguageContext } from "../LanguageContext";

export default function AboutPage() {
  const { lang, t } = useContext(LanguageContext);
  const isRTL = lang === "fa";

  return (
    <div
      className="max-w-3xl mx-auto mt-8 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 md:p-8 text-gray-100"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <h1 className="text-2xl font-bold mb-4">
        {t?.aboutToolTitle || (lang === "fa" ? "درباره CCG" : "About CCG")}
      </h1>
      <p className="mb-3 text-sm md:text-base leading-relaxed">
        {t?.aboutToolText}
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">
        {t?.aboutMeTitle || (lang === "fa" ? "درباره سازنده" : "About the creator")}
      </h2>
      <p className="mb-3 text-sm md:text-base leading-relaxed">
        {t?.aboutMeText}
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">
        {lang === "fa" ? "این نسخه چه کار می‌کند؟" : "What does this version do?"}
      </h2>
      <ul className="list-disc ms-5 text-sm md:text-base space-y-2">
        <li>
          {lang === "fa"
            ? "تولید کامند و اسکریپت برای سیستم‌عامل‌ها و دیوایس‌های مختلف"
            : "Generate commands and scripts for multiple platforms and devices"}
        </li>
        <li>
          {lang === "fa"
            ? "توضیح قدم‌به‌قدم دستورات و خطاها به زبان ساده"
            : "Explain commands and errors in simple language"}
        </li>
        <li>
          {lang === "fa"
            ? "مقایسه هوشمند دو نسخه کد و پیشنهاد ادغام بهتر"
            : "Smart compare of two code versions with merge suggestion"}
        </li>
      </ul>
    </div>
  );
}

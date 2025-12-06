// client/src/components/Footer.jsx
import { useContext } from "react";
import { LanguageContext } from "../LanguageContext";

export default function Footer() {
  const { lang, t } = useContext(LanguageContext);
  const isRTL = lang === "fa";

  return (
    <footer
      className="w-full border-t border-gray-800 bg-gray-950/90 text-xs md:text-sm text-gray-400 mt-8"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className={isRTL ? "text-right" : "text-left"}>
          <p>{t?.footerLine1}</p>
          <p>{t?.footerLine2}</p>
        </div>
        <div className={`flex flex-col md:items-end ${isRTL ? "text-right" : "text-left"}`}>
          <p>{t?.footerCando}</p>
          <p className="text-[11px] md:text-xs text-gray-500">
            powered by{" "}
            <a
              href="https://cando.ac"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-amber-400"
            >
              cando.ac
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

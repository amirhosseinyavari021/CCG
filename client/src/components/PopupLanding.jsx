// src/components/PopupLanding.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../LanguageContext";
import { Send } from "lucide-react";

export default function PopupLanding({ open, onClose }) {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  if (!open) return null;

  const isRTL = lang === "fa";

  const title =
    lang === "fa"
      ? "CCG؛ دستیار هوشمند خط فرمان و شبکه"
      : "CCG: Your smart assistant for CLI & networking";

  const subtitle =
    lang === "fa"
      ? "دستورات، اسکریپت‌ها و کانفیگ‌ها را با کمک AI بساز، مقایسه کن و امن کن."
      : "Generate commands, scripts and configs with AI, compare them and stay secure.";

  const primary = lang === "fa" ? "شروع استفاده رایگان" : "Start for free";
  const secondary = lang === "fa" ? "ورود / ثبت‌نام" : "Login / Sign up";
  const joinTelegram =
    lang === "fa" ? "عضویت در کامیونیتی تلگرام" : "Join Telegram Community";

  const tgLink = "https://t.me/+KOknn1yVxlM1OWI0";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-3xl bg-gray-950 border border-gray-800
                   shadow-2xl relative overflow-hidden"
      >
        {/* Glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/20 blur-3xl" />
        </div>

        <div className="relative p-6 md:p-8 space-y-5">
          {/* Close btn */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 border border-gray-700 right-3.5 w-8 h-8
                       rounded-full flex items-center justify-center text-gray-300
                       hover:text-white hover:border-gray-500 transition"
          >
            ✕
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500
                         flex items-center justify-center shadow-lg shadow-amber-500/40"
            >
              <span className="font-black text-gray-950 text-lg">CCG</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
              <p className="text-xs text-emerald-300">
                {lang === "fa"
                  ? "نسخه 3.2.0 — با مقایسه‌گر هوشمند"
                  : "v3.2.0 — Smart Compare Included"}
              </p>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-gray-200 leading-relaxed">
            {subtitle}
          </p>

          {/* Features */}
          <ul className="text-xs md:text-sm text-gray-300 space-y-1.5">
            <li>
              {lang === "fa"
                ? "✔ تولید دستور و اسکریپت برای Linux، Windows، Cisco، MikroTik، FortiGate"
                : "✔ Commands & scripts for Linux, Windows, Cisco, MikroTik, FortiGate"}
            </li>
            <li>
              {lang === "fa"
                ? "✔ مقایسه‌گر هوشمند کد و کانفیگ‌ها"
                : "✔ Smart AI code/config comparison"}
            </li>
            <li>
              {lang === "fa"
                ? "✔ تحلیل خطاها و نکات امنیتی"
                : "✔ Error analysis & security hints"}
            </li>
          </ul>

          {/* Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Start button */}
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5
                         rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950
                         text-sm font-semibold shadow-lg shadow-amber-500/40 transition"
            >
              {primary}
            </button>

            {/* Login button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/auth");
              }}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5
                         rounded-xl border border-emerald-500/70 text-emerald-300
                         text-sm font-semibold hover:bg-emerald-500/10 transition"
            >
              {secondary}
            </button>

            {/* Telegram button */}
            <a
              href={tgLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5
                         rounded-xl bg-gray-900 border border-gray-700
                         hover:bg-gray-800 text-sm font-semibold text-blue-300
                         hover:text-blue-400 transition"
            >
              <Send size={16} />
              <span>{joinTelegram}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

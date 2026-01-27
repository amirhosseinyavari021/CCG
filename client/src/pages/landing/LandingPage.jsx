import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { useLanguage } from "../../context/LanguageContext";

export default function LandingPage() {
  const nav = useNavigate();
  const { lang, setLang, t } = useLanguage();

  return (
    <MainLayout>
      <div className="grid gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-2xl font-bold text-slate-100">
            {isRTL ? "به CCG خوش اومدی" : "Welcome to CCG"}
          </h1>
          <p className="mt-2 text-slate-300">
            {isRTL
              ? "پلتفرم تولید، تحلیل و مقایسه دستورات سیستم و شبکه با خروجی حرفه‌ای."
              : "Generate, analyze, and compare system & network commands with production-ready output."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{t.chooseLang}:</span>
              <button
                className={`rounded-lg border px-3 py-2 text-sm ${
                  lang === "fa" ? "border-blue-400 bg-blue-500/10" : "border-slate-800 hover:border-slate-600"
                }`}
                onClick={() => changeLanguage("fa")}
              >
                فارسی
              </button>
              <button
                className={`rounded-lg border px-3 py-2 text-sm ${
                  lang === "en" ? "border-blue-400 bg-blue-500/10" : "border-slate-800 hover:border-slate-600"
                }`}
                onClick={() => changeLanguage("en")}
              >
                English
              </button>
            </div>

            <div className="sm:ms-auto">
              <button
                onClick={() => nav("/generator")}
                className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400 sm:w-auto"
              >
                {t.enterLab}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="text-sm text-slate-300">
            {isRTL ? (
              <>
                <div className="font-semibold text-slate-100">هدف:</div>
                <ul className="mt-2 list-disc ps-6 text-slate-300">
                  <li>خروجی قابل‌اجرا برای محیط عملیاتی</li>
                  <li>Markdown خوانا + هشدارهای واقعی</li>
                  <li>پشتیبانی Linux / Windows / Windows Server / macOS + Network Devices</li>
                </ul>
              </>
            ) : (
              <>
                <div className="font-semibold text-slate-100">Goal:</div>
                <ul className="mt-2 list-disc ps-6 text-slate-300">
                  <li>Production-ready commands & scripts</li>
                  <li>Readable Markdown + real operational warnings</li>
                  <li>Linux / Windows / Windows Server / macOS + Network Devices</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// src/pages/CCGMain.jsx
import { useContext, useEffect, useState } from "react";
import { LanguageContext } from "../LanguageContext";

import Header from "../components/Header";
import Form from "../components/Form";
import CommandCard from "../components/CommandCard";
import CodeComparePanel from "../components/CodeComparePanel";
import ErrorAnalysis from "../components/ErrorAnalysis";
import MobileDrawer from "../components/MobileDrawer";
import PopupLanding from "../components/PopupLanding";
import Footer from "../components/Footer";

import { fetchCCGResponse } from "../api/apiService";

export default function CCGMain() {
  const { lang, t } = useContext(LanguageContext);
  const isRTL = lang === "fa";

  // لندینگ فقط بار اول
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("ccg_seen_landing_v1");
    if (!seen) {
      setShowLanding(true);
      localStorage.setItem("ccg_seen_landing_v1", "1");
    }
  }, []);

  // appMode: generator | compare
  const [appMode, setAppMode] = useState("generator");

  // فرم اصلی
  const [mode, setMode] = useState("generate"); // generate | script | explain
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState(null);

  // Drawer موبایل
  const [showDrawer, setShowDrawer] = useState(false);

  const handleFormSubmit = async (payload) => {
    try {
      setIsLoading(true);
      setOutput(null);

      const res = await fetchCCGResponse(payload);

      // فرض بر اینه که backend یک آبجکت structured برمی‌گردونه
      // اگر string بود، اینجا می‌تونیم wrap کنیم
      if (typeof res === "string") {
        setOutput({
          type: "command",
          command: res,
          explanation: "",
          warning: "",
        });
      } else {
        setOutput(res);
      }
    } catch (err) {
      console.error("CCG request failed:", err);
      setOutput({
        type: "error",
        message:
          lang === "fa"
            ? "در ارتباط با سرور مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
            : "There was a problem talking to the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-950 text-white flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <Header onMenu={() => setShowDrawer(true)} />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        lang={lang}
        t={t}
      />

      {/* Landing Popup (فقط بار اول) */}
      <PopupLanding open={showLanding} onClose={() => setShowLanding(false)} />

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          {/* AppMode tabs: مولد دستورات / مقایسه هوشمند کد */}
          <div className="w-full mb-5 flex flex-col gap-3">
            <div
              className="inline-flex rounded-full bg-gray-900 border border-gray-800
                         p-1 mx-auto md:mx-0"
            >
              <button
                type="button"
                onClick={() => {
                  setAppMode("generator");
                  setOutput(null);
                }}
                className={`px-4 md:px-5 py-1.5 text-xs md:text-sm rounded-full transition
                  ${
                    appMode === "generator"
                      ? "bg-emerald-500 text-gray-950 shadow shadow-emerald-500/40"
                      : "text-gray-300 hover:text-white"
                  }`}
              >
                {t.appModeGenerator || "Command Generator"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMode("compare");
                  setOutput(null);
                }}
                className={`px-4 md:px-5 py-1.5 text-xs md:text-sm rounded-full transition
                  ${
                    appMode === "compare"
                      ? "bg-amber-500 text-gray-950 shadow shadow-amber-500/40"
                      : "text-gray-300 hover:text-white"
                  }`}
              >
                {t.appModeCompare || "Smart Code Compare"}
              </button>
            </div>

            <p className="text-center text-xs md:text-sm text-gray-400">
              {appMode === "generator"
                ? lang === "fa"
                  ? "سیستم‌عامل، شل، سطح دانش و درخواست خود را وارد کنید تا دستور یا اسکریپت مناسب برایتان ساخته شود."
                  : "Choose your platform, shell, and skill level, then describe what you need. CCG will generate commands or scripts for you."
                : lang === "fa"
                ? "در حالت مقایسه‌گر، فقط روی دو قطعه کد یا کانفیگ تمرکز کن. فرم سیستم‌عامل و شِل برای جلوگیری از شلوغی مخفی شده."
                : "In compare mode, we hide OS/CLI fields so you can focus on the two code snippets only."}
            </p>
          </div>

          {/* Generator mode: فرم + خروجی */}
          {appMode === "generator" && (
            <div className="space-y-6">
              <Form
                lang={lang}
                t={t}
                mode={mode}
                setMode={setMode}
                isLoading={isLoading}
                onSubmit={handleFormSubmit}
              />

              {/* OUTPUT RENDER */}
              {output && output.type === "command" && (
                <CommandCard
                  command={output.command}
                  explanation={output.explanation}
                  warning={output.warning}
                  lang={lang}
                />
              )}

              {output && output.type === "explain" && (
                <ErrorAnalysis
                  lang={lang}
                  os={output.os}
                  osVersion={output.osVersion}
                  cli={output.cli}
                  response={output}
                />
              )}

              {output && output.type === "error" && (
                <div
                  className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10
                             px-4 py-3 text-sm text-red-200"
                >
                  {output.message}
                </div>
              )}
            </div>
          )}

          {/* Compare mode: فقط مقایسه‌گر هوشمند کد، بدون فرم OS/CLI */}
          {appMode === "compare" && (
            <div className="mt-4">
              <CodeComparePanel lang={lang} t={t} />
            </div>
          )}
        </div>
      </main>

      {/* Footer جدید */}
      <Footer />
    </div>
  );
}

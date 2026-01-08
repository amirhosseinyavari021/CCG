// src/components/modals/LanguageSelectModal.jsx
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function LanguageSelectModal({ onClose }) {
  const { lang, setLang, t } = useLanguage();

  // ✅ default English
  const [selectedLang, setSelectedLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("ccg_lang");
    if (saved === "fa" || saved === "en") setSelectedLang(saved);
  }, []);

  const handleSelect = () => {
    changeLanguage(selectedLang);
    localStorage.setItem("ccg_lang", selectedLang);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-blue-500/30 rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold mb-6 text-white">
            Select Language / زبان را انتخاب کنید
          </h2>

          <div className="flex justify-center gap-6 mb-8">
            <button
              onClick={() => setSelectedLang("fa")}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition ${
                selectedLang === "fa"
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-slate-700 hover:border-slate-500"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                <span className="text-blue-400 font-bold">FA</span>
              </div>
              <span className="text-white">فارسی</span>
            </button>

            <button
              onClick={() => setSelectedLang("en")}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition ${
                selectedLang === "en"
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-slate-700 hover:border-slate-500"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                <span className="text-blue-400 font-bold">EN</span>
              </div>
              <span className="text-white">English</span>
            </button>
          </div>

          <button
            onClick={handleSelect}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg font-medium"
          >
            Continue / ادامه
          </button>
        </div>
      </div>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

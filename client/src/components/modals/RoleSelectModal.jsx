// src/components/modals/RoleSelectModal.jsx
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function RoleSelectModal({ onClose }) {
  const { lang, setLang, t } = useLanguage();
  const [role, setRole] = useState("expert"); // ✅ default expert (چون پیش‌فرض زبان en است و تو محصول pro-DevOps می‌خوای)

  useEffect(() => {
    const saved = localStorage.getItem("ccg_role");
    if (saved === "expert" || saved === "learner") setRole(saved);
  }, []);

  const save = () => {
    localStorage.setItem("ccg_role", role);
    onClose();
  };

  const text = {
    title: lang === "fa" ? "انتخاب نقش" : "Choose your role",
    expertTitle: lang === "fa" ? "Export / Expert" : "Export / Expert",
    expertDesc:
      lang === "fa"
        ? "خروجی کوتاه، عملیاتی، آماده اجرا + هشدارهای ضروری"
        : "Short, production-ready output + essential warnings",
    learnerTitle: lang === "fa" ? "Learner / Junior" : "Learner / Junior",
    learnerDesc:
      lang === "fa"
        ? "خروجی آموزشی، توضیح مرحله‌به‌مرحله + نکات و هشدارها"
        : "Educational output with step-by-step explanation + tips",
    btn: lang === "fa" ? "ادامه" : "Continue",
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-blue-500/30 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-700 text-center">
          <h2 className="text-2xl font-bold text-blue-400">{text.title}</h2>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => setRole("expert")}
            className={`w-full text-left border rounded-lg p-4 transition ${
              role === "expert"
                ? "border-blue-400 bg-blue-500/10"
                : "border-slate-700 hover:border-blue-500/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚡</div>
              <div>
                <div className="font-semibold text-white">{text.expertTitle}</div>
                <div className="text-sm text-slate-400">{text.expertDesc}</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setRole("learner")}
            className={`w-full text-left border rounded-lg p-4 transition ${
              role === "learner"
                ? "border-blue-400 bg-blue-500/10"
                : "border-slate-700 hover:border-blue-500/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎓</div>
              <div>
                <div className="font-semibold text-white">{text.learnerTitle}</div>
                <div className="text-sm text-slate-400">{text.learnerDesc}</div>
              </div>
            </div>
          </button>

          <button
            onClick={save}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg font-medium"
          >
            {text.btn}
          </button>
        </div>
      </div>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

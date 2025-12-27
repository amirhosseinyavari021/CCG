// src/components/modals/WelcomeModal.jsx
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export default function WelcomeModal({ onClose, onComplete }) {
  const { loginAsGuest } = useAuth();
  const { lang } = useLanguage();

  const tryAsGuest = () => {
    loginAsGuest();
    onComplete();
    onClose();
  };

  const goToAuth = () => {
    onComplete();
    onClose();
    window.dispatchEvent(new CustomEvent("open-auth-modal"));
  };

  const openTelegram = () => {
    window.open("https://t.me/CCG127", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-blue-500/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <span className="text-blue-400 font-black">CCG</span>
            </div>
            <div>
              <div className="text-white font-semibold leading-5">CCG Platform</div>
              <div className="text-slate-400 text-sm">
                {lang === "fa" ? "Powered by cando.ac" : "Powered by cando.ac"}
              </div>
            </div>
          </div>

          {/* اگر لوگوی کندو در public هست */}
          <div className="flex items-center gap-2">
            <img
              src="/cando-logo.png"
              alt="cando.ac"
              className="h-7 opacity-90"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-300 text-center">
            {lang === "fa"
              ? "پلتفرم حرفه‌ای تولید و تحلیل Command/Script برای محیط‌های عملیاتی"
              : "Professional Command/Script generator & analyzer for production environments"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={tryAsGuest}
              className="border border-slate-800 rounded-xl p-4 hover:border-blue-500/50 transition"
            >
              <div className="text-2xl mb-2">💡</div>
              <h3 className="font-medium text-white mb-1">
                {lang === "fa" ? "امتحان بدون ثبت‌نام" : "Try without signup"}
              </h3>
              <p className="text-slate-400 text-sm">
                {lang === "fa" ? "۵ درخواست رایگان" : "5 free requests"}
              </p>
            </button>

            <button
              onClick={goToAuth}
              className="border border-slate-800 rounded-xl p-4 hover:border-blue-500/50 transition"
            >
              <div className="text-2xl mb-2">🔐</div>
              <h3 className="font-medium text-white mb-1">
                {lang === "fa" ? "ثبت‌نام / ورود" : "Login / Register"}
              </h3>
              <p className="text-slate-400 text-sm">
                {lang === "fa"
                  ? "برای ذخیره، تاریخچه و دسترسی کامل"
                  : "To save scripts, history, and full access"}
              </p>
            </button>
          </div>

          <button
            onClick={openTelegram}
            className="w-full border border-slate-800 rounded-xl p-3 hover:border-blue-500/50 transition flex items-center justify-center gap-2"
          >
            <span>📱</span>
            <span className="text-white font-medium">
              {lang === "fa" ? "کامیونیتی تلگرام" : "Telegram community"}
            </span>
            <span className="text-slate-400 text-sm">t.me/CCG127</span>
          </button>

          <div className="flex justify-center">
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="text-slate-400 text-sm hover:text-slate-200 transition"
            >
              {lang === "fa" ? "بعداً" : "Maybe later"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

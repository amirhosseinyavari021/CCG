// src/components/modals/WelcomeModal.jsx
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

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
    window.dispatchEvent(new CustomEvent('open-auth-modal'));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-blue-500/30 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-blue-400 text-center">CCG Platform</h2>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-slate-300 text-center">
            {lang === 'fa'
              ? 'پلتفرم هوشمند تولید و تحلیل دستورات سیستم و شبکه'
              : 'Smart platform for generating and analyzing system & network commands'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={tryAsGuest}
              className="border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition group"
            >
              <div className="text-2xl mb-2">💡</div>
              <h3 className="font-medium text-white mb-1">
                {lang === 'fa' ? 'امتحان بدون ثبت‌نام' : 'Try without signup'}
              </h3>
              <p className="text-slate-400 text-sm">
                {lang === 'fa' ? '۵ درخواست رایگان' : '5 free requests'}
              </p>
            </button>

            <button
              onClick={goToAuth}
              className="border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition group"
            >
              <div className="text-2xl mb-2">🔐</div>
              <h3 className="font-medium text-white mb-1">
                {lang === 'fa' ? 'ثبت‌نام / ورود' : 'Login / Register'}
              </h3>
              <p className="text-slate-400 text-sm">
                {lang === 'fa' ? 'دسترسی کامل و بدون محدودیت' : 'Full access, no limits'}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

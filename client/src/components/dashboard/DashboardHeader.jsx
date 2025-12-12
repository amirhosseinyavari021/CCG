// client/src/components/dashboard/DashboardHeader.jsx
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function DashboardHeader({ activeTab, setActiveTab }) {
  const { t, lang } = useLanguage();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="border-b border-ccg-border bg-ccg-card">
      <div className="container mx-auto px-4 py-3 max-w-6xl flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-blue-400">CCG Platform</h1>
          <p className="text-xs text-slate-400">
            {lang === 'fa' ? 'تولید هوشمند دستورات' : 'Smart Command Generation'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'generator'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ {t('generator')}
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'compare'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ↔️ {t('codeCompare')}
            </button>
          </div>

          {/* User Info */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">
                {user.email || user.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              {t('guestMode')} ({localStorage.getItem('ccg_guest_requests') || 0}/5)
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

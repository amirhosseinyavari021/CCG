// client/src/pages/Dashboard/Home.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import CommandGenerator from '../../components/dashboard/CommandGenerator';
import CodeCompare from '../../components/dashboard/CodeCompare';

export default function DashboardPage() {
  const { user, token, isGuestLimitReached } = useAuth();
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('generator');
  const [guestRequests, setGuestRequests] = useState(0);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('ccg_guest_requests') || '0');
    setGuestRequests(count);
  }, []);

  const disabled = isGuestLimitReached();

  return (
    <div className="min-h-screen bg-ccg-bg text-white">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Guest Limit Warning */}
        {disabled && (
          <div className="mb-6 p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-300 text-sm">
            ⚠️ {t('guestLimitReached')}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
              className="ml-2 text-blue-400 underline"
            >
              {t('upgradeNow')}
            </button>
          </div>
        )}

        {/* Content */}
        {activeTab === 'generator' && (
          <CommandGenerator disabled={disabled} />
        )}
        {activeTab === 'compare' && (
          <CodeCompare disabled={disabled} />
        )}
      </main>
    </div>
  );
}

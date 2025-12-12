// client/src/App.jsx
import { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LanguageSelectModal from './components/modals/LanguageSelectModal';
import WelcomeModal from './components/modals/WelcomeModal';
import DashboardPage from './pages/Dashboard/Home';

function AppContent() {
  const { loading } = useAuth();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (loading) return;

    const hasLang = localStorage.getItem('ccg_lang');
    const hasSeenWelcome = localStorage.getItem('ccg_has_seen_welcome');

    if (!hasLang) {
      setShowLanguageModal(true);
    } else if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
  }, [loading]);

  const handleWelcomeComplete = () => {
    localStorage.setItem('ccg_has_seen_welcome', 'true');
    setShowWelcomeModal(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-ccg-bg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ccg-bg text-white">
      <DashboardPage />

      {showLanguageModal && (
        <LanguageSelectModal onClose={() => setShowLanguageModal(false)} />
      )}

      {showWelcomeModal && (
        <WelcomeModal
          onClose={() => setShowWelcomeModal(false)}
          onComplete={handleWelcomeComplete}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

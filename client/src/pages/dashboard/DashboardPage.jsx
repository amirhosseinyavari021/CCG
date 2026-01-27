// src/pages/Dashboard/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import CommandGenerator from '../../components/dashboard/CommandGenerator';
import CodeComparePanel from '../../components/dashboard/CodeComparePanel';
import GuestLimitWarning from '../../components/dashboard/GuestLimitWarning';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function Dashboard() {
  const { user, token, loading } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('generator');
  const [guestRequests, setGuestRequests] = useState(0);

  // بارگذاری وضعیت درخواست‌های مهمان از localStorage
  useEffect(() => {
    if (!user && !token) {
      const saved = localStorage.getItem('ccg_guest_requests');
      setGuestRequests(saved ? parseInt(saved) : 0);
    }
  }, [user, token]);

  // مدیریت امنیت: بررسی تعداد درخواست‌های مهمان
  const isGuestLimitReached = !user && guestRequests >= 5;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ccg-bg">
        <div className="text-ccg-blue text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-ccg-bg">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
          {/* نمایش هشدار به کاربران مهمان */}
          {isGuestLimitReached && <GuestLimitWarning />}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* بخش کامند و اسکریپت جنریتور */}
            <div className={`lg:col-span-${activeTab === 'generator' ? '3' : '2'}`}>
              <CommandGenerator 
                guestRequests={guestRequests} 
                onGuestRequest={() => setGuestRequests(prev => prev + 1)}
                disabled={isGuestLimitReached}
              />
            </div>
            
            {/* بخش کد کامپاریسور */}
            {activeTab === 'compare' && (
              <div className="lg:col-span-3">
                <CodeComparePanel disabled={isGuestLimitReached} />
              </div>
            )}
          </div>
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

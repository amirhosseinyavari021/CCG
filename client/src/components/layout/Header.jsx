// src/components/layout/Header.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import ThemeToggle from '../ui/ThemeToggle';
import MobileDrawer from './MobileDrawer';

export default function Header({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // تشخیص scroll برای افکت شیشه‌ای
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const tabs = [
    { id: 'generator', label: t('commandGenerator'), icon: '⚡' },
    { id: 'compare', label: t('codeCompare'), icon: '↔️' }
  ];

  return (
    <header 
      className={`sticky top-0 z-40 transition-all ${
        scrolled 
          ? 'bg-ccg-card/90 backdrop-blur-sm border-b border-ccg-border shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* لوگو و نام */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <span className="text-ccg-blue font-bold text-lg">CCG</span>
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              Command & Code Generator
            </span>
          </Link>

          {/* ناوبری دسکتاپ */}
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-ccg-blue border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* کنترل‌ها و منوی کاربر */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            
            {user ? (
              <div className="relative group">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition"
                >
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-300 font-medium">
                    {user.name?.[0] || user.email?.[0] || '?'}
                  </div>
                  <span className="hidden md:block text-sm font-medium">{user.name || user.email}</span>
                </button>
                
                {/* منوی کشویی برای موبایل */}
                <MobileDrawer 
                  isOpen={isMobileMenuOpen} 
                  onClose={() => setIsMobileMenuOpen(false)}
                  user={user}
                  onLogout={handleLogout}
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                  tabs={tabs}
                />
                
                {/* منوی کاربر دسکتاپ */}
                <div className="absolute right-0 mt-2 w-48 bg-ccg-card border border-ccg-border rounded-lg shadow-xl py-1 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link 
                    to="/profile" 
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {t('profile')}
                  </Link>
                  <Link 
                    to="/settings" 
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {t('settings')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-ccg-blue text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
              >
                <span>{t('login')}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* تب‌های موبایل */}
      <div className="md:hidden border-t border-ccg-border bg-ccg-card/50">
        <div className="container mx-auto px-4 max-w-7xl flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium ${
                activeTab === tab.id
                  ? 'text-ccg-blue border-b-2 border-ccg-blue'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

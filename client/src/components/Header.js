import React from 'react';
import { Sun, Moon, Info, Menu } from 'lucide-react';
import { translations } from '../constants/translations';

const Header = ({ lang, theme, onThemeChange, onAboutClick, onMenuClick, onLangChange }) => {
    const t = translations[lang];
    const appVersion = process.env.REACT_APP_VERSION || '2.6.6';

    return (
        <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {/* Menu button for mobile */}
                    <button onClick={onMenuClick} className="md:hidden p-1.5 text-gray-600 dark:text-gray-300">
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2"> {/* تغییر از items-baseline به items-center */}
                        {/* اضافه کردن لوگو با SVG مستقیم */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            version="1.1"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 200 200"
                            className="h-8 w-auto" // ارتفاع بزرگ‌تر (مثلاً 8 = 2rem = 32px) و عرض متناسب
                            fill="#e5ff12"
                            stroke="#0e5278"
                            strokeWidth="0.2"
                        >
                            <rect width="200" height="200" fill="url('#gradient')" />
                            <defs>
                                <linearGradient id="gradient" gradientTransform="rotate(45 0.5 0.5)">
                                    <stop offset="0%" stop-color="#e80c0c" />
                                    <stop offset="100%" stop-color="#081aea" />
                                </linearGradient>
                            </defs>
                            <g>
                                <g transform="matrix(7.504491725768322,0,0,7.504491725768322,7.208675591108644,153.3563120386561)">
                                    <path d="M9.98 0L9.15-2.66L4.45-2.66L3.63 0L-0.03 0L5.19-14.22L8.41-14.22L13.66 0L9.98 0ZM6.80-10.23L5.27-5.30L8.33-5.30L6.80-10.23ZM15.81-14.22L18.44-8.05L21.05-14.22L24.76-14.22L20.18-5.11L20.18 0L16.70 0L16.70-5.11L12.13-14.22L15.81-14.22Z" />
                                </g>
                            </g>
                        </svg>
                        {/* نام و نسخه */}
                        <div className="flex flex-col"> {/* برای تراز کردن عمودی نام و نسخه */}
                            <h1 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">AY-CMDGEN</h1>
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">v{appVersion}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Desktop buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={onAboutClick} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                            <Info size={16} /> {t.about}
                        </button>
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                            <button onClick={() => onLangChange('en')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                            <button onClick={() => onLangChange('fa')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
                        </div>
                    </div>
                    {/* Theme toggle */}
                    <button onClick={onThemeChange} className="p-1.5 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;

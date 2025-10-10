import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';

const Header = ({ lang, theme, onThemeChange, onMenuClick, onLangChange }) => {
    // Updated the fallback version to 2.3.0
    const appVersion = process.env.REACT_APP_VERSION || '2.8.0';

    return (
        <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {/* Menu button for mobile */}
                    <button onClick={onMenuClick} className="md:hidden p-1.5 text-gray-600 dark:text-gray-300">
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Cando Logo" className="h-8 w-auto" />
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-bold text-amber-500 dark:text-amber-400">CCG</h1>
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">v{appVersion}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Desktop buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                            <button onClick={() => onLangChange('en')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                            <button onClick={() => onLangChange('fa')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
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

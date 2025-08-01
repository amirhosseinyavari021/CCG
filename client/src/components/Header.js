import React, { useState } from 'react';
import { Sun, Moon, Info, Menu } from 'lucide-react';
import { translations } from '../constants/translations';
// Note: We will create AboutModal and MobileDrawer later or you can move them here.
// For now, we'll just handle the button clicks.

const Header = ({ lang, theme, onLangChange, onThemeChange, onAboutClick }) => {
    const t = translations[lang];
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // This is a placeholder for the mobile drawer component you can build
    const MobileDrawer = () => (
        <div className={`fixed inset-y-0 ${lang === 'fa' ? 'right-0' : 'left-0'} bg-white dark:bg-gray-900 w-64 z-50 shadow-lg transition-transform duration-300 ${isDrawerOpen ? 'translate-x-0' : (lang === 'fa' ? 'translate-x-full' : '-translate-x-full')}`}>
            {/* You can build out the mobile drawer UI here */}
            <button onClick={() => setIsDrawerOpen(false)} className="p-4">Close</button>
        </div>
    );

    return (
        <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
            {isDrawerOpen && <MobileDrawer />}
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDrawerOpen(true)} className="md:hidden p-1.5 text-gray-600 dark:text-gray-300">
                        <Menu size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">CMDGEN</h1>
                    <button onClick={onAboutClick} className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-cyan-600">
                        <Info size={16} /> {t.about}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onThemeChange} className="p-1.5 text-gray-600 dark:text-gray-300 rounded-full">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div className="hidden md:flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                        <button onClick={() => onLangChange('en')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-cyan-600 text-white' : ''}`}>EN</button>
                        <button onClick={() => onLangChange('fa')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-cyan-600 text-white' : ''}`}>FA</button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

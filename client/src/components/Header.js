// client/src/components/Header.js
import React from 'react';
// حذف: import { translations } from '../constants/translations'; // این وجود نداره
// ایمپورت t:
import { t } from '../constants/translations';

const Header = ({ lang, theme, onThemeChange, onAboutClick, onMenuClick, onLangChange }) => {
    const currentTranslations = t[lang] || t['en'];

    return (
        <header className="bg-cyan-600 dark:bg-cyan-800 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <button onClick={onMenuClick} className="text-xl md:hidden">
                    ☰
                </button>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onThemeChange}
                        className="p-2 rounded-full bg-cyan-700 dark:bg-cyan-900 hover:bg-cyan-800 dark:hover:bg-cyan-700 transition-colors"
                        aria-label={theme === 'dark' ? currentTranslations.lightMode : currentTranslations.darkMode}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <select
                        value={lang}
                        onChange={(e) => onLangChange(e.target.value)}
                        className="bg-cyan-700 dark:bg-cyan-900 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                        <option value="en">{currentTranslations.english}</option>
                        <option value="fa">{currentTranslations.persian}</option>
                    </select>
                    <button
                        onClick={onAboutClick}
                        className="bg-cyan-700 dark:bg-cyan-900 px-4 py-2 rounded-md hover:bg-cyan-800 dark:hover:bg-cyan-700 transition-colors"
                    >
                        {currentTranslations.about}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
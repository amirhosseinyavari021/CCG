// client/src/components/Header.js
import React from 'react';
import { t } from '../constants/translations';

const Header = ({ lang, theme, onThemeChange, onAboutClick, onMenuClick, onLangChange, onFeedbackClick }) => {
    const currentTranslations = t[lang] || t['en'];

    return (
        <header className="bg-gray-900 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <button onClick={onMenuClick} className="text-xl md:hidden">
                        ☰
                    </button>
                    <div className="text-cyan-400 font-bold">AY-CMDGEN v2.6.9</div>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onThemeChange}
                        className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                        aria-label={theme === 'dark' ? currentTranslations.lightMode : currentTranslations.darkMode}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <select
                        value={lang}
                        onChange={(e) => onLangChange(e.target.value)}
                        className="bg-gray-800 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                        <option value="en">{currentTranslations.english}</option>
                        <option value="fa">{currentTranslations.persian}</option>
                    </select>
                    <button
                        onClick={onFeedbackClick}
                        className="bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                    >
                        {currentTranslations.feedback}
                    </button>
                    <button
                        onClick={onAboutClick}
                        className="bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                    >
                        {currentTranslations.about}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
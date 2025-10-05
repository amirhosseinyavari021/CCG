// client/src/components/Header.js
import React from 'react';
import { Sun, Moon, Menu, MessageSquareQuote } from 'lucide-react'; // Added Feedback Icon
import { translations } from '../constants/translations';

const Header = ({ lang, theme, onThemeChange, onAboutClick, onMenuClick, onLangChange, onFeedbackClick }) => {
    const t = translations[lang];

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        {/* Logo could go here */}
                        <span className="text-xl font-bold text-gray-800 dark:text-white">AY-CMDGEN</span>
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
                        <button onClick={onAboutClick} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                            {t.about}
                        </button>

                        {/* NEW: Feedback button in header */}
                        <button onClick={onFeedbackClick} className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                            <MessageSquareQuote className="w-4 h-4 mr-1" />
                            {t.feedback}
                        </button>

                        <div className="flex items-center space-x-4">
                            <select
                                value={lang}
                                onChange={onLangChange}
                                className="bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none"
                            >
                                <option value="en">EN</option>
                                <option value="fa">FA</option>
                            </select>

                            <button onClick={onThemeChange} aria-label="Toggle theme">
                                {theme === 'light' ? (
                                    <Moon className="w-5 h-5 text-gray-600 hover:text-cyan-500" />
                                ) : (
                                    <Sun className="w-5 h-5 text-gray-300 hover:text-cyan-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="md:hidden">
                        <button onClick={onMenuClick} aria-label="Open menu">
                            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // Correct import
import FeedbackCard from './FeedbackCard';
import MobileDrawer from './MobileDrawer';
import logo from '../../assets/logo.svg'; // Adjust path if needed

const Header = ({ onLanguageChange, currentLanguage, usageCount, onFeedbackOpen }) => {
    const { t } = useTranslation(); // Use hook

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="bg-gray-900 text-white p-4 flex justify-between items-center relative z-10 md:relative">
            <div className="flex items-center space-x-4">
                <img src={logo} alt="AY-CMDGEN Logo" className="h-8 w-8" />
                <h1 className="text-xl font-bold hidden md:block">AY-CMDGEN v2.6.9</h1>
                <h1 className="text-xl font-bold md:hidden">CMDGEN</h1>
            </div>

            <div className="hidden md:flex items-center space-x-4">
                <select
                    onChange={(e) => onLanguageChange(e.target.value)}
                    value={currentLanguage}
                    className="bg-gray-800 text-white px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="en">EN</option>
                    <option value="fa">FA</option>
                </select>
                <button
                    onClick={onFeedbackOpen}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2"
                >
                    <span>💬</span>
                    <span>{t('feedback')}</span>
                </button>
                <button
                    onClick={() => window.open('https://github.com/amirhosseinyavari021/ay-cmdgen', '_blank')}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
                >
                    {t('about')}
                </button>
            </div>

            {/* Mobile Menu Button */}
            <button
                onClick={toggleMobileMenu}
                className="md:hidden text-white p-2"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile Drawer */}
            <MobileDrawer
                isOpen={isMobileMenuOpen}
                onClose={closeMobileMenu}
                onLanguageChange={onLanguageChange}
                currentLanguage={currentLanguage}
                onFeedbackOpen={onFeedbackOpen}
            />
        </header>
    );
};

export default Header;
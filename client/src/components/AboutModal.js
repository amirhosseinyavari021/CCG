import React from 'react';
import { X } from 'lucide-react';
import { translations } from '../constants/translations';

const AboutModal = ({ lang, onClose, onLangChange }) => {
    const t = translations[lang];

    // Prevent modal close when clicking inside the card
    const handleModalContentClick = (e) => e.stopPropagation();

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm p-5 shadow-lg"
                onClick={handleModalContentClick}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.aboutToolTitle}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    <div>
                        <h3 className="font-medium text-amber-600 dark:text-amber-400">{t.aboutMeTitle}</h3>
                        <p className="text-sm">{t.aboutMeText}</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-amber-600 dark:text-amber-400">{t.aboutToolTitle}</h3>
                        <p className="text-sm">{t.aboutToolText}</p>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                            <button onClick={() => onLangChange('en')} className={`px-3 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                            <button onClick={() => onLangChange('fa')} className={`px-3 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
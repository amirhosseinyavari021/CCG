// client/src/components/MobileDrawer.js
import React from 'react';
import { t } from '../constants/translations';

const MobileDrawer = ({ isOpen, onClose, lang, onLangChange }) => {
    if (!isOpen) return null;

    const currentTranslations = t[lang] || t['en'];

    return (
        <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
            <div className="absolute top-0 left-0 h-full w-64 bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out">
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-cyan-400">{currentTranslations.settings}</h2>
                        <button onClick={onClose} className="text-gray-400 text-2xl">
                            &times;
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                {currentTranslations.language}
                            </label>
                            <select
                                value={lang}
                                onChange={(e) => onLangChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border-gray-600 bg-gray-800 text-white"
                            >
                                <option value="en">{currentTranslations.english}</option>
                                <option value="fa">{currentTranslations.persian}</option>
                            </select>
                        </div>
                        <div>
                            <button
                                onClick={onClose} // یا تابعی برای نمایش مودال درباره
                                className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                            >
                                {currentTranslations.about}
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={onClose} // یا تابعی برای نمایش کارت فیدبک
                                className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                            >
                                {currentTranslations.feedback}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileDrawer;
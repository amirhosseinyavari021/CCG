import React from 'react';
import { X } from 'lucide-react';
import { translations } from '../constants/translations';

const MobileDrawer = ({ isOpen, onClose, lang, onLangChange }) => {
    const t = translations[lang];

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <>
            {/* Overlay */}
            <div 
                onClick={onClose} 
                className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
            {/* Drawer */}
            <div 
                className={`fixed top-0 bottom-0 ${lang === 'fa' ? 'right-0' : 'left-0'} w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : (lang === 'fa' ? 'translate-x-full' : '-translate-x-full')}`}
                onClick={handleContentClick}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">Menu</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-2 mb-2">Language</p>
                         <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                            <button onClick={() => onLangChange('en')} className={`flex-1 text-center px-3 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                            <button onClick={() => onLangChange('fa')} className={`flex-1 text-center px-3 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileDrawer;

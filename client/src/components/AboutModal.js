// client/src/components/AboutModal.js
import React from 'react';
// حذف: import { translations } from '../constants/translations'; // این وجود نداره
// ایمپورت t:
import { t } from '../constants/translations';

const AboutModal = ({ isOpen, onClose, lang }) => {
    if (!isOpen) return null;

    const currentTranslations = t[lang] || t['en'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{currentTranslations.about}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
                        >
                            &times;
                        </button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300">
                        <p>AY-CMDGEN v2.6.9</p>
                        <p>{currentTranslations.version}: 2.6.9</p>
                        <p>{currentTranslations.license}: MIT & Apache 2.0</p>
                        <p>{currentTranslations.website}: <a href="https://cmdgen.onrender.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">https://cmdgen.onrender.com</a></p>
                        <p>{currentTranslations.sourceCode}: <a href="https://github.com/amirhosseinyavari021/ay-cmdgen" className="text-cyan-600 dark:text-cyan-400 hover:underline">https://github.com/amirhosseinyavari021/ay-cmdgen</a></p>
                        <p className="mt-4">{currentTranslations.thankYou}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
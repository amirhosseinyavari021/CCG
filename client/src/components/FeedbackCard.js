// client/src/components/FeedbackCard.js
import React from 'react';
import { translations } from '../constants/translations';
import { ExternalLink, X } from 'lucide-react';

// The Google Form link has been updated with the one you provided.
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=header';

const FeedbackCard = ({ isOpen, onClose, lang }) => {
    const currentTranslations = translations[lang];

    if (!isOpen) return null;

    const handleOpenForm = () => {
        window.open(GOOGLE_FORM_URL, '_blank', 'noopener,noreferrer');
        onClose(); // Close the modal after opening the link
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={20} />
                </button>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentTranslations.feedbackTitle}
                </h3>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {/* A new translation key can be added here if needed */}
                    We value your feedback! Clicking the button below will open our feedback form in a new tab.
                </p>

                <div className="mt-6">
                    <button
                        onClick={handleOpenForm}
                        className="w-full flex items-center justify-center px-4 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Feedback Form
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackCard;


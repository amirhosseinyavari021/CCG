import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=header';

const FeedbackCard = ({ onClose, usageCount }) => {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        setIsSubmitting(true);
        // Open the Google Form in a new tab
        window.open(FEEDBACK_FORM_URL, '_blank');
        setIsSubmitting(false);
        onClose(); // Close the modal after opening the form
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{t('feedbackTitle')}</h2>
                <p className="text-gray-600 mb-4">{t('feedbackDescription')}</p>
                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        {isSubmitting ? t('openingForm') : t('openForm')}
                    </button>
                </div>
                {usageCount >= 20 && (
                    <p className="text-sm text-gray-600 mt-4 italic">
                        {t('feedbackPrompt')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default FeedbackCard;
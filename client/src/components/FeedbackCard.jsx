import React from 'react';
import Card from './common/Card';
import { translations } from '../constants/translations';

const FeedbackCard = ({ lang, onDismiss }) => {
    const t = translations[lang];
    // --- MODIFICATION: Updated Feedback URL ---
    const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=dialog';
    // --- END MODIFICATION ---

    const handleProvideFeedback = () => {
        window.open(FEEDBACK_URL, '_blank');
        onDismiss(); // Hide the card after opening the link
    };

    return (
        <div className="mt-8">
            <Card lang={lang}>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">{t.feedbackTitle}</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t.feedbackSubheader}</p>
                    <div className="mt-4 flex gap-4 justify-center">
                        <button onClick={handleProvideFeedback} className="bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-700">
                            {t.feedbackAction}
                        </button>
                        <button onClick={onDismiss} className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">
                            {t.feedbackDismiss}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default FeedbackCard;
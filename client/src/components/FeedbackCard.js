// client/src/components/FeedbackCard.js
import React, { useState } from 'react';
// حذف: import { translations } from '../constants/translations'; // این وجود نداره
// ایمپورت t:
import { t } from '../constants/translations';

const FeedbackCard = ({ isOpen, onClose, lang }) => {
    if (!isOpen) return null;

    const [feedback, setFeedback] = useState('');
    const [rating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const currentTranslations = t[lang] || t['en'];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError('');
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("Feedback submitted:", { feedback, rating, lang });
            setSubmitSuccess(true);
            setTimeout(() => {
                onClose();
                setFeedback('');
                setRating(0);
                setSubmitSuccess(false);
            }, 2000);
        } catch (error) {
            setSubmitError(currentTranslations.feedbackFailed);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
                    <h3 className="text-xl font-semibold mb-2">{currentTranslations.feedbackSuccess}</h3>
                    <p>{currentTranslations.thankYou}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{currentTranslations.feedbackTitle}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
                        disabled={isSubmitting}
                    >
                        &times;
                    </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{currentTranslations.feedbackDescription}</p>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {currentTranslations.feedbackRate}
                    </label>
                    <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                                disabled={isSubmitting}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {rating === 1 && currentTranslations.feedbackRate1}
                        {rating === 2 && currentTranslations.feedbackRate2}
                        {rating === 3 && currentTranslations.feedbackRate3}
                        {rating === 4 && currentTranslations.feedbackRate4}
                        {rating === 5 && currentTranslations.feedbackRate5}
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="feedback-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {currentTranslations.feedbackComment}
                    </label>
                    <textarea
                        id="feedback-comment"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={currentTranslations.feedbackCommentPlaceholder}
                        className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows="3"
                        disabled={isSubmitting}
                    />
                </div>

                {submitError && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{submitError}</p>}

                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {currentTranslations.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
                        disabled={isSubmitting || !feedback.trim() || rating === 0}
                    >
                        {isSubmitting ? currentTranslations.loading : currentTranslations.feedbackSubmit}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackCard;
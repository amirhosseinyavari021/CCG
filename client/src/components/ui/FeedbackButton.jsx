import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";   // ← اینجا رو درست کن (../../ به جای ../)

const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=header";

export default function FeedbackButton() {
  const { lang } = useLanguage();
  const [showPopup, setShowPopup] = useState(false);

  const handleFeedbackClick = () => {
    window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  return (
    <>
      <button
        onClick={handleFeedbackClick}
        className="w-full ccg-card p-3 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-gray-800 dark:hover:to-gray-900 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white text-sm">💬</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">
                {lang === "fa" ? "💌 بازخورد خود را ارسال کنید" : "💌 Send Your Feedback"}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {lang === "fa"
                  ? "نظرات، پیشنهادات و گزارش مشکلات را با ما در میان بگذارید"
                  : "Share your comments, suggestions and bug reports with us"
                }
              </div>
            </div>
          </div>
          <div className="text-gray-400 group-hover:text-orange-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </button>

      {showPopup && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <div>
                <div className="font-medium">
                  {lang === "fa" ? "سپاس از شما!" : "Thank You!"}
                </div>
                <div className="text-sm opacity-90">
                  {lang === "fa"
                    ? "بازخورد شما برای بهبود CCG بسیار ارزشمند است"
                    : "Your feedback is valuable for improving CCG"
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

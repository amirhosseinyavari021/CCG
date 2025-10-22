import React from 'react';

const Card = ({ children, lang, className = '' }) => {
    return (
        <div
            className={`bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5 shadow-lg backdrop-blur-lg ${className}`}
            style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
        >
            {children}
        </div>
    );
};

export default Card;

import React from 'react';

const Card = ({ children, lang, className = '' }) => {
    return (
        <div
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg ${className}`}
            style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
        >
            {children}
        </div>
    );
};

export default Card;

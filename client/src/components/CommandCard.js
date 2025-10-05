import React from 'react';
import { useTranslation } from 'react-i18next'; // Correct import
import CommandDisplay from './common/CommandDisplay';

const CommandCard = ({ command, explanation, warning, mode, index }) => {
    const { t } = useTranslation(); // Use hook

    // Color schemes based on mode to avoid eye strain (soft, accessible colors)
    const getModeStyles = () => {
        switch (mode) {
            case 'generate':
                return {
                    bg: 'bg-green-50 border-green-200',
                    text: 'text-green-800',
                    header: 'bg-green-100 text-green-900'
                };
            case 'script':
                return {
                    bg: 'bg-blue-50 border-blue-200',
                    text: 'text-blue-800',
                    header: 'bg-blue-100 text-blue-900'
                };
            case 'explain':
                return {
                    bg: 'bg-orange-50 border-orange-200',
                    text: 'text-orange-800',
                    header: 'bg-orange-100 text-orange-900'
                };
            default:
                return {
                    bg: 'bg-gray-50 border-gray-200',
                    text: 'text-gray-800',
                    header: 'bg-gray-100 text-gray-900'
                };
        }
    };

    const styles = getModeStyles();

    return (
        <div className={`border-2 rounded-lg p-4 space-y-3 ${styles.bg} ${styles.text}`}>
            <div className={`p-3 rounded-md font-semibold ${styles.header}`}>
                {t(mode === 'generate' ? 'commandSuggestion' : mode === 'script' ? 'scriptSuggestion' : 'explanation')} #{index + 1}
            </div>
            <CommandDisplay command={command} mode={mode} />
            {explanation && (
                <p className="text-sm italic">{explanation}</p>
            )}
            {warning && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm">
                    ⚠️ {warning}
                </div>
            )}
        </div>
    );
};

export default CommandCard;
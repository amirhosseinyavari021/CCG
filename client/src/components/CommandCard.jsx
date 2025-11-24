import React from 'react';
import { Bot, FileCode2, Terminal } from 'lucide-react';
import Card from './common/Card';
import CommandDisplay from './common/CommandDisplay';
import { translations } from '../constants/translations';

// For "Generate" mode
export const GeneratedCommandCard = ({ command, explanation, warning, lang }) => {
    return (
        <Card lang={lang}>
            <div className="flex justify-between items-center mb-3">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-amber-600 dark:text-amber-400">
                    <Terminal size={18} /> Command
                </h4>
            </div>
            <CommandDisplay command={command} lang={lang} />
            {explanation && <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{explanation}</p>}
            {warning && warning.trim() !== '' && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 italic">{warning}</p>}
        </Card>
    );
};

// For "Explain" mode
export const ExplanationCard = ({ explanation, lang }) => {
    const t = translations[lang];
    return (
        <div className="mt-6 max-w-2xl mx-auto">
            <Card lang={lang}>
                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-4">
                    <Bot size={18} /> {t.detailedExplanation}
                </h3>
                <div 
                    className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300 max-w-none" 
                    dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} 
                />
            </Card>
        </div>
    );
};

// For "Script" mode
export const ScriptCard = ({ filename, script_lines = [], lang }) => {
    const t = translations[lang];
    const fullScript = script_lines.join('\n');
  
    const downloadScript = () => {
        const blob = new Blob([fullScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-6 max-w-2xl mx-auto">
            <Card lang={lang}>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-amber-600 dark:text-amber-400">
                        <FileCode2 size={18} /> {filename}
                    </h4>
                    <button onClick={downloadScript} className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors">
                        {t.downloadScript || 'Download Script'}
                    </button>
                </div>
                <CommandDisplay command={fullScript} lang={lang} />
            </Card>
        </div>
    );
};

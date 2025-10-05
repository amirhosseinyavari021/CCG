// client/src/components/CommandCard.js
import React, { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { translations } from '../constants/translations';
import { toast } from 'react-hot-toast';

// Helper component for copying
const CopyButton = ({ text, lang }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(translations[lang].copied);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
    );
};

// Card for "Generate" mode
export const GeneratedCommandCard = ({ command, explanation, warning, lang }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 relative text-left">
        <pre className="text-sm text-green-300 bg-black/30 p-3 rounded-md overflow-x-auto">
            <code>{command}</code>
        </pre>
        <CopyButton text={command} lang={lang} />
        <p className="mt-3 text-sm text-gray-300">{explanation}</p>
        {warning && warning.trim() !== '' && (
            <p className="mt-2 text-xs text-amber-400 italic border-l-2 border-amber-400 pl-2">
                <span className="font-bold">{translations[lang].warning}:</span> {warning}
            </p>
        )}
    </div>
);

// Card for "Explain" mode
export const ExplanationCard = ({ explanation, lang }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 relative text-left prose prose-invert prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    </div>
);

// Card for "Script" mode
export const ScriptCard = ({ script_lines = [], explanation, lang }) => {
    const fullScript = script_lines.join('\n');
    const t = translations[lang];

    const downloadScript = () => {
        const blob = new Blob([fullScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `script-${Date.now()}.sh`; // Generic filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t.downloaded);
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 relative text-left">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg">{t.generatedScript}</h3>
                <button onClick={downloadScript} className="flex items-center px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors">
                    <Download size={14} className="mr-1.5" />
                    {t.download}
                </button>
            </div>
            <p className="text-sm text-gray-300 mb-3">{explanation}</p>
            <div className="relative">
                <pre className="text-sm text-green-300 bg-black/30 p-3 rounded-md overflow-x-auto max-h-80">
                    <code>{fullScript}</code>
                </pre>
                <CopyButton text={fullScript} lang={lang} />
            </div>
        </div>
    );
};

export default { GeneratedCommandCard, ExplanationCard, ScriptCard };
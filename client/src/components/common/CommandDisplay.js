import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { translations } from '../../constants/translations';

const CommandDisplay = ({ command, lang }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        toast.success(translations[lang].copied);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            <pre className="p-4 pr-12 font-mono text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">
                {command}
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
                aria-label="Copy command"
            >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
        </div>
    );
};

export default CommandDisplay;

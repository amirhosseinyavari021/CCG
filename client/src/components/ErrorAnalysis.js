import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { translations } from '../constants/translations';
import { callApi } from '../api/promptService'; // Corrected import path
import Card from './common/Card';
import LoadingSpinner from './common/LoadingSpinner';
import CommandDisplay from './common/CommandDisplay';
import toast from 'react-hot-toast';

const SolutionStep = ({ step, t, lang }) => {
    if (step.startsWith('CMD:')) {
        const command = step.substring(4).trim();
        return <CommandDisplay command={command} lang={lang} />;
    }
    return <p className="text-gray-600 dark:text-gray-300 text-sm">{step}</p>;
};

const ErrorAnalysisCard = ({ analysis, lang }) => {
    const t = translations[lang];
    return (
        <div className="mt-6 max-w-2xl mx-auto">
            <Card lang={lang}>
                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 mb-4">
                    <ShieldAlert size={18} /> {t.errorAnalysis}
                </h3>
                <div className="space-y-5">
                    {analysis.cause && <div><h4 className="font-semibold text-red-500 dark:text-red-400 mb-2">{t.cause}</h4><p className="text-gray-600 dark:text-gray-300 text-sm">{analysis.cause}</p></div>}
                    {analysis.explanation && <div><h4 className="font-semibold text-amber-500 dark:text-amber-400 mb-2">{t.explanation}</h4><p className="text-gray-600 dark:text-gray-300 text-sm">{analysis.explanation}</p></div>}
                    {analysis.solution && <div><h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">{t.solution}</h4><div className="space-y-2">{analysis.solution.map((step, index) => <SolutionStep key={index} step={step} t={t} lang={lang} />)}</div></div>}
                </div>
            </Card>
        </div>
    );
};

const ErrorAnalysis = ({ lang, os, osVersion, cli }) => {
    const t = translations[lang];
    const [commandInput, setCommandInput] = useState('');
    const [errorInput, setErrorInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    const handleAnalyze = async () => {
        if (!errorInput.trim()) {
            toast.error(t.fieldRequired);
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        const result = await callApi({ mode: 'error', command: commandInput, userInput: errorInput, os, osVersion, cli, lang });
        if (result) {
            setAnalysisResult(result.data);
        }
        setIsLoading(false);
    };

    return (
        <div className="mt-10">
            <Card lang={lang}>
                <div className="text-center">
                    <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
                    <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{t.errorPromptTitle}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t.errorPromptSubheader}</p>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.commandLabel}</label>
                        <textarea value={commandInput} onChange={(e) => setCommandInput(e.target.value)} placeholder={t.commandPlaceholder} className="mt-1 w-full h-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 resize-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.errorLabel} <span className="text-red-500">*</span></label>
                        <textarea value={errorInput} onChange={(e) => setErrorInput(e.target.value)} placeholder={t.errorPlaceholder} className="mt-1 w-full h-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 resize-none" />
                    </div>
                </div>
                <button onClick={handleAnalyze} disabled={isLoading} className="mt-4 w-full bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center min-h-[44px]">
                    {isLoading ? <LoadingSpinner /> : t.analyzeError}
                </button>
            </Card>
            {analysisResult && <ErrorAnalysisCard analysis={analysisResult} lang={lang} />}
        </div>
    );
};

export default ErrorAnalysis;

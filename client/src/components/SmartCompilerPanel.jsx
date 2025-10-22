import React, { useState } from 'react';
import Card from './common/Card';
import LoadingSpinner from './common/LoadingSpinner';
import CommandDisplay from './common/CommandDisplay';
import { useSmartCompiler } from '../hooks/useSmartCompiler';
import { CheckCircle, AlertTriangle, XCircle, Wand2, Brain, Search, Sparkles, Network, Terminal, ShieldAlert } from 'lucide-react';

// A reusable component for displaying AI analysis sections
const ReportSection = ({ title, icon, content, lang }) => {
    if (!content) return null;
    return (
        <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <h4 className="flex items-center gap-2 text-md font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {icon} {title}
            </h4>
            {/* Use pre-wrap to respect newlines from AI */ }
            <pre className="font-sans text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{content}</pre>
        </div>
    );
};

const SmartCompilerPanel = ({ lang, t }) => {
    const [code, setCode] = useState('');
    const [isLearningMode, setIsLearningMode] = useState(false);
    const { state, runCode, fixCode } = useSmartCompiler(lang, t);
    const {
        isLoading,
        isFixing,
        showSafetyWarning,
        report,
        error
    } = state;

    const handleRun = () => {
        runCode(code, isLearningMode);
    };

    const handleFix = () => {
        if (report.errorOutput) {
            fixCode(code, report.errorOutput, isLearningMode);
        }
    };

    const iconMap = {
        lang: <Terminal size={18} />,
        explanation: <Search size={18} />,
        review: <Wand2 size={18} />,
        flow: <Network size={18} />,
        learning: <Brain size={18} />,
        suggestions: <Sparkles size={18} />,
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{t.appModeCompiler}</h2>
            <p className="text-gray-600 mb-8 text-center text-md">{t.compilerSubheader}</p>

            <Card lang={lang}>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.pasteCode}</label>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="print('Hello, CCG!')"
                        className="w-full h-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 resize-vertical"
                    />
                </div>

                <div className="mt-4 flex flex-col md:flex-row gap-4">
                    <button
                        onClick={handleRun}
                        disabled={isLoading || !code}
                        className="w-full md:w-1/2 bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px] transition-colors"
                    >
                        {isLoading ? <><LoadingSpinner /> {t.runningCode}</> : <>{t.runCode}</>}
                    </button>
                    <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-200/70 dark:bg-gray-700/70 rounded-lg px-4 py-2">
                        <input
                            type="checkbox"
                            id="learningMode"
                            checked={isLearningMode}
                            onChange={(e) => setIsLearningMode(e.target.checked)}
                            className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 dark:focus:ring-amber-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="learningMode" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">{t.learningMode}</label>
                    </div>
                </div>

                {/* Safety Warning Modal */}
                {showSafetyWarning && (
                    <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400/50 rounded-lg">
                        <h4 className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
                            <ShieldAlert size={20} />
                            {t.safetyWarningTitle}
                        </h4>
                        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{t.safetyWarningBody}</p>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300 font-medium">{report.safetyCheck}</p>
                        <div className="mt-4 flex gap-4">
                            <button onClick={() => runCode(code, isLearningMode, true)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">{t.confirmRun}</button>
                            <button onClick={() => runCode(null, false, false, true)} className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">{t.cancel}</button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Compilation Report Card */}
            {(report.lang || report.result || report.errorOutput || isLoading) && !showSafetyWarning && (
                <Card lang={lang} className="mt-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t.compilationReport}</h3>
                    
                    {isLoading && !report.lang && <div className="flex justify-center p-4"><LoadingSpinner /></div>}
                    
                    <ReportSection title={t.detectedLanguage} icon={iconMap.lang} content={report.lang} />
                    <ReportSection title={t.codeExplanation} icon={iconMap.explanation} content={report.explanation} />
                    <ReportSection title={t.aiCodeReview} icon={iconMap.review} content={report.review} />
                    <ReportSection title={t.executionFlow} icon={iconMap.flow} content={report.flow} />
                    <ReportSection title={t.learningTrace} icon={iconMap.learning} content={report.learning} />

                    {/* Execution Result */}
                    {report.result && (
                        <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                            <h4 className="flex items-center gap-2 text-md font-semibold text-green-600 dark:text-green-400 mb-2">
                                <CheckCircle size={18} /> {t.executionResult}
                            </h4>
                            <CommandDisplay command={report.result} lang={lang} />
                        </div>
                    )}
                    
                    {/* Error Result */}
                    {report.errorOutput && (
                        <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                            <h4 className="flex items-center gap-2 text-md font-semibold text-red-500 dark:text-red-400 mb-2">
                                <XCircle size={18} /> {t.executionResult}
                            </h4>
                            <CommandDisplay command={report.errorOutput} lang={lang} />
                            
                            <ReportSection title={t.aiErrorAnalysis} icon={<ShieldAlert size={18} />} content={report.errorAnalysis} />
                            
                            <button
                                onClick={handleFix}
                                disabled={isFixing}
                                className="mt-4 w-full md:w-auto bg-sky-700 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-sky-800 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                            >
                                {isFixing ? <><LoadingSpinner /> {t.autoFixing}</> : <><Wand2 size={18} /> {t.autoFix}</>}
                            </button>
                        </div>
                    )}
                    
                    <ReportSection title={t.aiSuggestions} icon={iconMap.suggestions} content={report.suggestions} />

                </Card>
            )}

            {/* Global Error */}
            {error && (
                 <Card lang={lang} className="mt-6">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400/50 rounded-lg">
                        <h4 className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
                            <AlertTriangle size={20} />
                            {t.errorDefault}
                        </h4>
                        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                 </Card>
            )}
        </div>
    );
};

export default SmartCompilerPanel;
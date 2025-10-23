import React, { useState } from 'react';
import Card from './common/Card';
import LoadingSpinner from './common/LoadingSpinner';
import CommandDisplay from './common/CommandDisplay';
import { useCodeCompare } from '../hooks/useCodeCompare';
import { GitCompare, Terminal, AlertTriangle, CheckCircle, Wand2, Star, Eye } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react'; // <-- NEW: Import DiffEditor

// A reusable component for displaying AI analysis sections
const AnalysisSection = ({ title, icon, content }) => {
    if (!content) return null;
    return (
        <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-gray-700/50 first:pt-0 first:mt-0 first:border-0">
            <h4 className="flex items-center gap-2 text-md font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {icon} {title}
            </h4>
            {/* Use pre-wrap to respect newlines and formatting from AI */}
            <pre className="font-sans text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{content}</pre>
        </div>
    );
};

const CodeComparePanel = ({ lang, t }) => {
    const [codeA, setCodeA] = useState('');
    const [codeB, setCodeB] = useState('');
    const [activeTab, setActiveTab] = useState('visual'); // <-- NEW: Default to visual diff
    const { state, runCompare } = useCodeCompare(lang, t);
    const { isLoading, error, result } = state;

    const handleCompare = () => {
        runCompare(codeA, codeB);
        setActiveTab('visual'); // Ensure visual tab is shown on new compare
    };

    const TabButton = ({ tabId, title, icon }) => ( // <-- NEW: Added icon
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === tabId
                    ? 'bg-white/70 dark:bg-gray-800/70 border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
        >
            {icon} {title}
        </button>
    );

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{t.appModeCompare}</h2>
            <p className="text-gray-600 mb-8 text-center text-md">{t.compareSubheader}</p>

            {/* Input Card */}
            <Card lang={lang}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.pasteCodeA}</label>
                        <textarea
                            value={codeA}
                            onChange={(e) => setCodeA(e.target.value)}
                            placeholder="def hello():
    print('Hello')"
                            className="w-full h-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 resize-vertical"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.pasteCodeB}</label>
                        <textarea
                            value={codeB}
                            onChange={(e) => setCodeB(e.target.value)}
                            placeholder="def hello_world():
    print('Hello, World!')"
                            className="w-full h-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 resize-vertical"
                        />
                    </div>
                </div>
                <button
                    onClick={handleCompare}
                    disabled={isLoading || !codeA || !codeB}
                    className="mt-4 w-full bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px] transition-colors"
                >
                    {isLoading ? <><LoadingSpinner /> {t.comparing}</> : <><GitCompare size={18} /><span className="ml-2">{t.compareWithAI}</span></>}
                </button>
            </Card>

            {/* Error Display */}
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

            {/* Results Card */}
            {(isLoading || result) && !error && (
                <div className="mt-6">
                    <div className="border-b border-gray-200/50 dark:border-gray-700/50 flex flex-wrap">
                        {/* --- NEW VISUAL TAB --- */}
                        <TabButton tabId="visual" title={t.tabSideBySide} icon={<Eye size={16} />} />
                        {/* --- EXISTING TABS --- */}
                        <TabButton tabId="diff" title={t.tabDifferences} icon={<GitCompare size={16} />} />
                        <TabButton tabId="analysis" title={t.tabAIAnalysis} icon={<Star size={16} />} />
                        <TabButton tabId="merge" title={t.tabSuggestedMerge} icon={<Wand2 size={16} />} />
                    </div>

                    <Card lang={lang} className="rounded-t-none">
                        {isLoading ? (
                            <div className="flex justify-center p-10"><LoadingSpinner /></div>
                        ) : (
                            result && (
                                <div>
                                    {/* Language Detection Info (shown on all tabs) */}
                                    <div className="pb-2 mb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            <Terminal size={16} /> {t.langDetected}:
                                            <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{result.langA || 'N/A'}</span>
                                            vs
                                            <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{result.langB || 'N/A'}</span>
                                        </h4>
                                        {result.langA && result.langB && result.langA !== result.langB && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                                <AlertTriangle size={14} /> {t.langMismatchWarning}
                                            </p>
                                        )}
                                    </div>

                                    {/* --- NEW: Tab Content for Visual Diff --- */}
                                    <div className={activeTab === 'visual' ? '' : 'hidden'}>
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                                            <DiffEditor
                                                height="500px"
                                                language={(result.langA || 'plaintext').toLowerCase().split(' ')[0]} // Get base lang e.g. 'python'
                                                original={codeA}
                                                modified={codeB}
                                                theme="vs-dark" // Match app's dark theme
                                                options={{
                                                    readOnly: true,
                                                    enableSplitViewResizing: false,
                                                    renderSideBySide: true,
                                                    automaticLayout: true,
                                                    minimap: { enabled: false }
                                                }}
                                                loading={<LoadingSpinner />}
                                            />
                                        </div>
                                    </div>

                                    {/* --- EXISTING: Tab Content --- */}
                                    <div className={activeTab === 'diff' ? '' : 'hidden'}>
                                        <AnalysisSection title={t.logicalDifferences} icon={<GitCompare size={18} />} content={result.diffAnalysis} />
                                    </div>
                                    <div className={activeTab === 'analysis' ? '' : 'hidden'}>
                                        <AnalysisSection title={t.qualityReview} icon={<Star size={18} />} content={result.qualityAnalysis} />
                                    </div>
                                    <div className={activeTab === 'merge' ? '' : 'hidden'}>
                                        <h4 className="flex items-center gap-2 text-md font-semibold text-amber-600 dark:text-amber-400 mb-2">
                                            <Wand2 size={18} /> {t.mergeSuggestion}
                                        </h4>
                                        {result.merge ? (
                                            <CommandDisplay command={result.merge} lang={lang} />
                                        ) : (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">AI did not provide a merged version.</p>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CodeComparePanel;
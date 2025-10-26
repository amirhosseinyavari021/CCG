import React, { useState } from 'react';
import Card from './common/Card';
import LoadingSpinner from './common/LoadingSpinner';
import CommandDisplay from './common/CommandDisplay';
import { useCodeCompare } from '../hooks/useCodeCompare';
import { GitCompare, Terminal, AlertTriangle, Wand2, Star, Eye } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';

// A reusable component for displaying AI analysis sections
const AnalysisSection = ({ title, icon, content, lang }) => { // Added lang prop
    if (!content) return null;
    return (
        <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-gray-700/50 first:pt-0 first:mt-0 first:border-0">
            <h4 className="flex items-center gap-2 text-md font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {icon} {title}
            </h4>
            {/* Use pre-wrap and set direction based on language */}
            <pre
                className="font-sans text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                dir={lang === 'fa' ? 'rtl' : 'ltr'} // Set direction for analysis text
            >
                {content}
            </pre>
        </div>
    );
};

// Maps AI language names to Monaco Editor language identifiers.
const getMonacoLanguage = (aiLanguage) => {
    if (!aiLanguage) return 'plaintext';
    const lang = aiLanguage.toLowerCase();
    const map = {
        javascript: 'javascript',
        python: 'python',
        bash: 'shell',
        shell: 'shell',
        html: 'html',
        css: 'css',
        json: 'json',
        markdown: 'markdown',
        typescript: 'typescript',
        java: 'java',
        csharp: 'csharp',
        cpp: 'cpp',
        php: 'php',
        ruby: 'ruby',
        go: 'go',
        // Add more mappings as needed
    };
    return map[lang] || 'plaintext';
};


const CodeComparePanel = ({ lang, t }) => {
    const [codeA, setCodeA] = useState('');
    const [codeB, setCodeB] = useState('');
    const [activeTab, setActiveTab] = useState('visual'); // Default to visual diff
    const { state, runCompare } = useCodeCompare(lang, t);
    const { isLoading, error, result } = state;

    const handleCompare = () => {
        runCompare(codeA, codeB);
        setActiveTab('visual'); // Reset to visual diff tab on new comparison
    };

    /**
     * Fixes the blank editor issue when Monaco loads in a hidden tab.
     */
    const handleEditorDidMount = (editor) => {
        setTimeout(() => {
            if (editor) {
                editor.layout();
            }
        }, 200); // 200ms delay often helps ensure the tab is visible
    };

    const TabButton = ({ tabId, title, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-150 ${activeTab === tabId
                    ? 'bg-white dark:bg-gray-800 border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
        >
            {icon} {title}
        </button>
    );

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t.appModeCompare}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center text-md">{t.compareSubheader}</p>

            {/* Input Card */}
            <Card lang={lang}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.pasteCodeA}</label>
                        <textarea
                            value={codeA}
                            onChange={(e) => setCodeA(e.target.value)}
                            placeholder={`// ${t.pasteCodeA}\nfunction example() {\n  console.log("original");\n}`}
                            className="w-full h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 resize-vertical"
                            spellCheck="false"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.pasteCodeB}</label>
                        <textarea
                            value={codeB}
                            onChange={(e) => setCodeB(e.target.value)}
                            placeholder={`// ${t.pasteCodeB}\nfunction example() {\n  console.log("modified");\n}`}
                            className="w-full h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 resize-vertical"
                            spellCheck="false"
                        />
                    </div>
                </div>
                <button
                    onClick={handleCompare}
                    disabled={isLoading || !codeA || !codeB}
                    className="mt-4 w-full bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px] transition-colors"
                >
                    {isLoading ? <><LoadingSpinner /> <span className="ml-2">{t.comparing}</span></> : <><GitCompare size={18} /><span className="ml-2">{t.compareWithAI}</span></>}
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
                    {/* Tabs */}
                    <div className="border-b border-gray-200/50 dark:border-gray-700/50 flex flex-wrap -mb-px">
                        {/* Use translated titles */}
                        <TabButton tabId="visual" title={t.tabSideBySide} icon={<Eye size={16} />} />
                        <TabButton tabId="diff" title={t.tabDifferences} icon={<GitCompare size={16} />} />
                        <TabButton tabId="analysis" title={t.tabAIAnalysis} icon={<Star size={16} />} />
                        <TabButton tabId="merge" title={t.tabSuggestedMerge} icon={<Wand2 size={16} />} />
                    </div>

                    <Card lang={lang} className="rounded-t-none">
                        {isLoading ? (
                            <div className="flex justify-center items-center p-10 min-h-[200px]"><LoadingSpinner /></div>
                        ) : (
                            result && (
                                <div>
                                    {/* Language Detection Info (shown just below tabs) */}
                                    <div className="pb-3 mb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                                        <h4 className="flex items-center flex-wrap gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            <Terminal size={16} /> {t.langDetected}:
                                            <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{result.langA || 'N/A'}</span>
                                            <span className="text-gray-400">vs</span>
                                            <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{result.langB || 'N/A'}</span>
                                        </h4>
                                        {result.langA && result.langB && result.langA !== result.langB && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                                <AlertTriangle size={14} /> {t.langMismatchWarning}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tab Content */}
                                    <div className={activeTab === 'visual' ? '' : 'hidden'}>
                                        {/* Ensure LTR for the diff editor layout */}
                                        <div dir="ltr" className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                                            <DiffEditor
                                                height="100%" // Use 100% to fill container
                                                language={getMonacoLanguage(result.langA || result.langB)} // Use detected language
                                                original={codeA}
                                                modified={codeB}
                                                theme="vs-dark" // Keep dark theme consistent
                                                options={{
                                                    readOnly: true,
                                                    enableSplitViewResizing: true, // Allow resizing
                                                    renderSideBySide: true,
                                                    automaticLayout: true, // Let Monaco handle layout updates
                                                    minimap: { enabled: false }
                                                }}
                                                loading={<div className="flex justify-center items-center h-full"><LoadingSpinner /></div>}
                                                onMount={handleEditorDidMount} // Still useful for initial load
                                            />
                                        </div>
                                    </div>

                                    <div className={activeTab === 'diff' ? '' : 'hidden'}>
                                        <AnalysisSection title={t.logicalDifferences} icon={<GitCompare size={18} />} content={result.diffAnalysis} lang={lang} />
                                    </div>
                                    <div className={activeTab === 'analysis' ? '' : 'hidden'}>
                                        <AnalysisSection title={t.qualityReview} icon={<Star size={18} />} content={result.qualityAnalysis} lang={lang} />
                                    </div>
                                    <div className={activeTab === 'merge' ? '' : 'hidden'}>
                                        <h4 className="flex items-center gap-2 text-md font-semibold text-amber-600 dark:text-amber-400 mb-2">
                                            <Wand2 size={18} /> {t.mergeSuggestion}
                                        </h4>
                                        {result.merge ? (
                                            /* Render merged code in CommandDisplay, which handles copying */
                                            <CommandDisplay command={result.merge} lang={lang} />
                                        ) : (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{t.errorParse || 'AI did not provide a merged version.'}</p>
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
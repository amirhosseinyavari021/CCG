import React, { useState } from 'react';
import Card from './common/Card';
import LoadingSpinner from './common/LoadingSpinner';
import CommandDisplay from './common/CommandDisplay';
import { useCodeCompare } from '../hooks/useCodeCompare';
import { GitCompare, Terminal, AlertTriangle, Wand2, Star, Eye } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';

const AnalysisSection = ({ title, icon, content }) => {
    if (!content) return null;

    return (
        <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-gray-700/50 first:pt-0 first:mt-0 first:border-0">
            <h4 className="flex items-center gap-2 text-md font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {icon} {title}
            </h4>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-gray-900 prose-pre:text-gray-50 prose-code:text-amber-600">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </div>
    );
};

const CodeComparePanel = ({ lang, t }) => {
    const [codeA, setCodeA] = useState('');
    const [codeB, setCodeB] = useState('');
    const [activeTab, setActiveTab] = useState('visual');
    const { state, runCompare } = useCodeCompare(lang, t);
    const { isLoading, error, result } = state;

    const handleCompare = () => {
        if (!codeA.trim() || !codeB.trim()) {
            return;
        }
        runCompare(codeA, codeB);
        setActiveTab('visual');
    };

    const getMonacoLanguage = (detected) => {
        const lower = (detected || '').toLowerCase();
        if (lower.includes('python')) return 'python';
        if (lower.includes('javascript') || lower === 'js') return 'javascript';
        if (lower.includes('typescript') || lower === 'ts') return 'typescript';
        if (lower.includes('c++')) return 'cpp';
        if (lower === 'c') return 'c';
        if (lower.includes('java')) return 'java';
        if (lower.includes('bash') || lower.includes('shell')) return 'shell';
        if (lower.includes('powershell')) return 'powershell';
        return 'plaintext';
    };

    const langLabelA = result?.langA || 'N/A';
    const langLabelB = result?.langB || 'N/A';
    const editorLanguage = getMonacoLanguage(result?.langA || result?.langB);

    return (
        <div className="space-y-4">
            <Card className="border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold">
                            {t.codeCompareTitle || 'Code comparison & merge'}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium mb-1">
                            {t.codeA || 'Code A'}
                        </label>
                        <textarea
                            className="min-h-[160px] text-sm font-mono rounded-xl border border-gray-300/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/70 resize-vertical"
                            value={codeA}
                            onChange={(e) => setCodeA(e.target.value)}
                            placeholder={t.codeAPlaceholder || 'Paste the first version of your code here'}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium mb-1">
                            {t.codeB || 'Code B'}
                        </label>
                        <textarea
                            className="min-h-[160px] text-sm font-mono rounded-xl border border-gray-300/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/70 resize-vertical"
                            value={codeB}
                            onChange={(e) => setCodeB(e.target.value)}
                            placeholder={t.codeBPlaceholder || 'Paste the second version of your code here'}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={handleCompare}
                        disabled={isLoading || !codeA.trim() || !codeB.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <LoadingSpinner size="sm" />
                                {t.analyzing || 'Analyzing...'}
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" />
                                {t.compareNow || 'Compare & analyze'}
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Terminal className="w-4 h-4" />
                        <span>{t.codeCompareHint || 'Best results when both snippets are functionally related.'}</span>
                    </div>
                </div>
            </Card>

            {isLoading && (
                <Card className="flex items-center justify-center py-10">
                    <LoadingSpinner />
                </Card>
            )}

            {error && !isLoading && (
                <Card className="border border-red-300/60 dark:border-red-800/60 bg-red-50/60 dark:bg-red-900/20">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                </Card>
            )}

            {result && !isLoading && (
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                    <div className="xl:col-span-3 space-y-3">
                        <Card className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-semibold">
                                        {t.diffView || 'Visual diff'}
                                    </span>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                        A: {langLabelA}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                        B: {langLabelB}
                                    </span>
                                </div>
                            </div>

                            <div className="flex border-b border-gray-200/60 dark:border-gray-700/60 mb-2">
                                <button
                                    onClick={() => setActiveTab('visual')}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 ${activeTab === 'visual'
                                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {t.visualTab || 'Visual'}
                                </button>
                                <button
                                    onClick={() => setActiveTab('analysis')}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 ${activeTab === 'analysis'
                                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {t.analysisTab || 'AI analysis'}
                                </button>
                            </div>

                            <div className="flex-1 min-h-[260px]">
                                {activeTab === 'visual' ? (
                                    <DiffEditor
                                        original={codeA}
                                        modified={codeB}
                                        language={editorLanguage}
                                        theme="vs-dark"
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            renderSideBySide: true
                                        }}
                                    />
                                ) : (
                                    <div className="text-sm">
                                        <AnalysisSection
                                            title={t.diffAnalysisTitle || 'Differences & structure'}
                                            icon={<GitCompare className="w-4 h-4" />}
                                            content={result.diffAnalysis}
                                        />
                                        <AnalysisSection
                                            title={t.qualityAnalysisTitle || 'Code quality review'}
                                            icon={<Star className="w-4 h-4" />}
                                            content={result.qualityAnalysis}
                                        />
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="xl:col-span-2 space-y-3">
                        <Card className="h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <Terminal className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold">
                                    {t.mergeTitle || 'Merged / improved version'}
                                </span>
                            </div>
                            {result.merge ? (
                                <CommandDisplay command={result.merge} lang={lang} />
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{t.noMergeResult || 'AI did not provide a merged version.'}</span>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeComparePanel;

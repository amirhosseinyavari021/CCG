import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { translations } from './constants/translations';
import { callApi } from './api/promptService';

import Header from './components/Header';
import Form from './components/Form';
import { GeneratedCommandCard, ExplanationCard, ScriptCard } from './components/CommandCard';
import { PlusCircle, Github, Wand2, GitCompare } from 'lucide-react';
import LoadingSpinner from './components/common/LoadingSpinner';
import Card from './components/common/Card';

// Lazy load components that are not needed on initial render
const ErrorAnalysis = lazy(() => import('./components/ErrorAnalysis'));
const MobileDrawer = lazy(() => import('./components/MobileDrawer'));
const FeedbackCard = lazy(() => import('./components/FeedbackCard'));
const CodeComparePanel = lazy(() => import('./components/CodeComparePanel')); // New Compare Panel

/**
 * Helper function to determine the correct script file extension based on OS and CLI.
 * @param {string} os - The selected operating system (e.g., 'python', 'windows', 'linux').
 * @param {string} cli - The selected command-line interface (e.g., 'PowerShell 7', 'CMD').
 * @returns {string} The file extension (e.g., '.py', '.ps1', '.sh').
 */
const getScriptExtension = (os, cli) => {
  const lowerOs = (os || '').toLowerCase();
  const lowerCli = (cli || '').toLowerCase();

  if (lowerOs === 'python') return '.py';
  if (lowerOs === 'windows') {
    if (lowerCli.includes('powershell')) return '.ps1';
    if (lowerCli.includes('cmd')) return '.bat';
  }
  // Default for linux, macos, cisco, mikrotik, bash, zsh, sh, etc.
  return '.sh';
};

function AppContent() {
  const [lang, setLang] = useState('en');
  const [appMode, setAppMode] = useState('generate'); // 'generate' or 'compare'

  const [commandList, setCommandList] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [script, setScript] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [moreCommandsCount, setMoreCommandsCount] = useState(0);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [formState, setFormState] = useState({});

  const [showFeedback, setShowFeedback] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    // Permanently set theme to dark
    document.documentElement.className = 'dark';

    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);
    // --- FIXED: Set direction on <html> (documentElement) not <body> ---
    document.documentElement.dir = savedLang === 'fa' ? 'rtl' : 'ltr';

    const usageCount = parseInt(localStorage.getItem('usageCount') || '0', 10);
    const feedbackRequested = localStorage.getItem('feedbackRequested') === 'true';

    // --- MODIFICATION: Changed threshold to 20 ---
    if (usageCount >= 20 && !feedbackRequested) {
      // --- END MODIFICATION ---
      setShowFeedback(true);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    // --- FIXED: Set direction on <html> (documentElement) not <body> ---
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    setIsDrawerOpen(false);
  };

  const resetStateForNewRequest = () => {
    setCommandList([]);
    setExplanation(null);
    setScript(null);
    setMoreCommandsCount(0);
    setIsLoading(true);
  };

  const incrementUsageCount = () => {
    const currentCount = parseInt(localStorage.getItem('usageCount') || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem('usageCount', newCount);

    // --- MODIFICATION: Changed threshold to 20 ---
    if (newCount >= 20 && localStorage.getItem('feedbackRequested') !== 'true') {
      // --- END MODIFICATION ---
      setShowFeedback(true);
    }
  };

  const handleGenerate = async (formData) => {
    resetStateForNewRequest();
    setFormState(formData);

    const apiResult = await callApi(
      { ...formData, lang, mode: 'generate' },
      (stage) => setLoadingMessage(stage === 'fetching' ? t.fetching : t.connecting)
    );

    if (apiResult?.data?.commands) {
      setCommandList(apiResult.data.commands);
      incrementUsageCount();
    }
    setIsLoading(false);
  };

  const handleExplain = async (formData) => {
    resetStateForNewRequest();
    setFormState(formData);

    const apiResult = await callApi(
      { ...formData, lang, mode: 'explain' },
      (stage) => setLoadingMessage(stage === 'fetching' ? t.fetching : t.connecting)
    );

    if (apiResult?.data?.explanation) {
      setExplanation(apiResult.data.explanation);
      incrementUsageCount();
    }
    setIsLoading(false);
  };

  const handleScript = async (formData) => {
    resetStateForNewRequest();
    setFormState(formData);

    const apiResult = await callApi(
      { ...formData, lang, mode: 'script' },
      (stage) => setLoadingMessage(stage === 'fetching' ? t.fetching : t.connecting)
    );

    if (apiResult?.data?.explanation) {
      const extension = getScriptExtension(formData.os, formData.cli);
      const filename = `generated_script${extension}`;

      setScript({
        filename: filename,
        script_lines: apiResult.data.explanation.split('\n')
      });
      incrementUsageCount();
    }
    setIsLoading(false);
  };

  const handleMoreCommands = async () => {
    setIsLoadingMore(true);
    const iteration = moreCommandsCount + 1;
    const existing = commandList.map(c => c.command);

    const apiResult = await callApi({ ...formState, lang, mode: 'generate', iteration, existingCommands: existing });

    if (apiResult?.data?.commands) {
      setCommandList(prev => [...prev, ...apiResult.data.commands]);
      setMoreCommandsCount(iteration);
    }
    setIsLoadingMore(false);
  };

  const dismissFeedback = () => {
    setShowFeedback(false);
    localStorage.setItem('feedbackRequested', 'true');
  };

  const AppModeToggle = () => (
    <div className="max-w-2xl mx-auto mb-6">
      <Card lang={lang} className="p-2">
        <div className="flex bg-gray-200/70 dark:bg-gray-700/70 rounded-lg p-1 space-x-1">
          <button
            onClick={() => setAppMode('generate')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${appMode === 'generate'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-600/50'
              }`}
          >
            <Wand2 size={16} />
            {t.appModeGenerator}
          </button>
          <button
            onClick={() => setAppMode('compare')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${appMode === 'compare'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-600/AN'
              }`}
          >
            <GitCompare size={16} />
            {t.appModeCompare}
          </button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-200" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: 'dark:bg-gray-700 dark:text-white',
        }}
      />

      <Suspense fallback={<div />}>
        <MobileDrawer
          isOpen={isDrawerOpen}
          lang={lang}
          onClose={() => setIsDrawerOpen(false)}
          onLangChange={handleLangChange}
        />
      </Suspense>

      <Header
        lang={lang}
        onMenuClick={() => setIsDrawerOpen(true)}
        onLangChange={handleLangChange}
      />

      <main className="container mx-auto px-4 py-8 md:py-12 flex-grow">
        <AppModeToggle />

        {appMode === 'generate' ? (
          <div className="max-w-2xl mx-auto">
            <Form
              onSubmit={handleGenerate}
              onExplain={handleExplain}
              onScript={handleScript}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              lang={lang}
            />

            {showFeedback && (
              <Suspense fallback={<div />}>
                <FeedbackCard lang={lang} onDismiss={dismissFeedback} />
              </Suspense>
            )}

            <div className="mt-8 space-y-4">
              {commandList.map((cmd, index) => (
                <GeneratedCommandCard key={index} {...cmd} lang={lang} />
              ))}
            </div>

            {commandList.length > 0 && !isLoading && (
              <div className="mt-6 text-center">
                <button onClick={handleMoreCommands} disabled={isLoadingMore} className="w-full bg-gray-200/70 dark:bg-gray-700/70 backdrop-blur-lg text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-300/80 dark:hover:bg-gray-600/80 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] transition-colors">
                  {isLoadingMore ? <><LoadingSpinner /> {t.loadingMore}</> : <><PlusCircle size={18} /> {t.moreCommands}</>}
                </button>
              </div>
            )}

            {explanation && <ExplanationCard explanation={explanation} lang={lang} />}
            {script && <ScriptCard filename={script.filename} script_lines={script.script_lines} lang={lang} />}

            {(commandList.length > 0 || explanation || script) && !isLoading && (
              <Suspense fallback={<div className="text-center mt-10"><LoadingSpinner /></div>}>
                <ErrorAnalysis {...formState} lang={lang} />
              </Suspense>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={<div className="text-center mt-10"><LoadingSpinner /></div>}>
              <CodeComparePanel lang={lang} t={t} />
            </Suspense>
          </div>
        )}
      </main>

      <footer className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg py-3 text-center font-semibold text-gray-900 dark:text-gray-300 text-xs border-t border-gray-200/50 dark:border-gray-800/50">
        <div className="flex justify-center items-center gap-4 mb-2">
          <a href="httpsm://github.com/amirhosseinyavari021/CCG" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black dark:text-gray-400 dark:hover:text-gray-300">
            <Github size={20} />
          </a>
        </div>
        <p>
          This service belongs to <a href="https://cando.ac" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-600 hover:underline">Cando Academy</a>.
        </p>
        <p className="mt-1">
          Created and designed by <a href="mailto:amirhosseinyavari61@gmail.com" className="font-semibold text-amber-600 hover:underline">Amirhossein Yavari</a>.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
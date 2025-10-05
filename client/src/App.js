// client/src/App.js
import React, { useState, useEffect, lazy, Suspense } from 'react';
import './index.css';
import Header from './components/Header';
import Form from './components/Form';
import { callApi } from './api/apiService';
import { t } from './constants/translations';

// لیزی لود کردن کامپوننت‌هایی که در ابتدا نیاز نیستند
const AboutModal = lazy(() => import('./components/AboutModal'));
const MobileDrawer = lazy(() => import('./components/MobileDrawer'));
const FeedbackCard = lazy(() => import('./components/FeedbackCard'));

function App() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [commandList, setCommandList] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentTranslations = t[lang] || t['en'];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;

    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);

    const usageCount = parseInt(localStorage.getItem('usageCount') || '0', 10);
    const feedbackRequested = localStorage.getItem('feedbackRequested') === 'true';
    if (usageCount >= 20 && !feedbackRequested) {
      setShowFeedback(true);
      localStorage.setItem('feedbackRequested', 'true');
    }
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.className = newTheme;
  };

  const resetStateForNewRequest = () => {
    setCommandList([]);
    setExplanation(null);
    setIsLoading(true);
    setLoadingMessage(currentTranslations.loading || "Loading...");
  };

  const handleApiCall = async (mode, formData) => {
    resetStateForNewRequest();
    try {
      const result = await callApi({
        mode,
        userInput: formData.userInput,
        os: formData.os,
        osVersion: formData.osVersion,
        cli: formData.cli,
        lang
      }, (stage) => {
        setLoadingMessage(stage === 'fetching' ? currentTranslations.fetching : currentTranslations.connecting);
      });

      if (mode === 'generate') {
        setCommandList(result.finalData.commands || []);
        setExplanation(result.finalData.explanation || null);
      } else if (mode === 'explain' || mode === 'analyze') {
        setCommandList([]);
        setExplanation(result.finalData.explanation || null);
      } else if (mode === 'script') {
        setCommandList([result.finalData.scriptCode || ""]);
        setExplanation(result.finalData.explanation || null);
      }
    } catch (error) {
      console.error(`Error in ${mode} mode:`, error);
      let errorMessageKey = 'errorGeneral';
      if (mode === 'generate') errorMessageKey = 'errorGenerating';
      else if (mode === 'analyze') errorMessageKey = 'errorAnalyzing';
      else if (mode === 'explain') errorMessageKey = 'errorExplaining';
      else if (mode === 'script') errorMessageKey = 'errorGenerating';

      setExplanation(currentTranslations[errorMessageKey] || currentTranslations.errorGeneral || "An error occurred.");
      setCommandList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = (formData) => handleApiCall('generate', formData);
  const handleExplain = (formData) => handleApiCall('explain', formData);
  const handleScript = (formData) => handleApiCall('script', formData);

  return (
    <div className={`min-h-screen bg-gray-900 text-white transition-colors duration-200 ${lang === 'fa' ? 'rtl' : 'ltr'}`}>
      <Header
        lang={lang}
        theme={theme}
        onThemeChange={toggleTheme}
        onAboutClick={() => setIsAboutModalOpen(true)}
        onMenuClick={() => setIsDrawerOpen(true)}
        onLangChange={handleLangChange}
        onFeedbackClick={() => setShowFeedback(true)} // اضافه شده برای دکمه فیدبک
      />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center gap-6">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-cyan-400">CMDGEN</h1>
          <p className="text-lg text-gray-400 mt-2">{currentTranslations.subtitle}</p>
        </div>

        <div className="w-full max-w-lg">
          <Form
            onSubmit={handleGenerate}
            onExplain={handleExplain}
            onScript={handleScript} // اضافه شده برای دکمه اسکریپت
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            lang={lang}
          />
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-gray-300">{loadingMessage}</p>
          </div>
        )}

        {!isLoading && (
          <div className="w-full max-w-lg flex flex-col gap-6">
            {commandList.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Generated Command/Script</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                  {commandList.map((cmd, idx) => <div key={idx}>{cmd}</div>)}
                </pre>
              </div>
            )}
            {explanation && commandList.length === 0 && (
              <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-blue-400 mb-4">{currentTranslations.explanationTitle}</h3>
                <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: explanation }} />
              </div>
            )}
          </div>
        )}
      </main>

      <Suspense fallback={<div className="hidden"></div>}>
        <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} lang={lang} />
        <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} lang={lang} />
        <FeedbackCard isOpen={showFeedback} onClose={() => setShowFeedback(false)} lang={lang} />
      </Suspense>
    </div>
  );
}

export default App;
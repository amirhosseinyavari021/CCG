// client/src/App.js
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { callApi } from './api/apiService';
import { translations } from './constants/translations';

// Components
import Header from './components/Header';
import Form from './components/Form';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load components
const AboutModal = lazy(() => import('./components/AboutModal'));
const MobileDrawer = lazy(() => import('./components/MobileDrawer'));
const FeedbackCard = lazy(() => import('./components/FeedbackCard'));
const { GeneratedCommandCard, ExplanationCard, ScriptCard } = lazy(() => import('./components/CommandCard'));
const ErrorAnalysis = lazy(() => import('./components/ErrorAnalysis')); // Assuming this might be used later

function App() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // CHANGED: Consolidated state for results
  const [results, setResults] = useState([]);
  const [currentMode, setCurrentMode] = useState(null); // 'generate', 'explain', 'script'

  const currentTranslations = translations[lang];

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;

    // Language initialization
    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);

    // Feedback prompt logic
    const usageCount = parseInt(localStorage.getItem('usageCount') || '0', 10);
    const feedbackRequested = localStorage.getItem('feedbackRequested') === 'true';
    if (usageCount > 20 && !feedbackRequested) {
      setShowFeedback(true);
      localStorage.setItem('feedbackRequested', 'true');
    }
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.className = newTheme;
  };

  const resetStateForNewRequest = () => {
    setResults([]);
    setCurrentMode(null);
    setIsLoading(true);
    setLoadingMessage(currentTranslations.loading);
  };

  const handleApiCall = async (mode, formData) => {
    resetStateForNewRequest();
    setCurrentMode(mode); // Set the current mode

    try {
      const result = await callApi(
        { ...formData, mode, lang },
        (stage) => {
          setLoadingMessage(stage === 'fetching' ? currentTranslations.fetching : currentTranslations.connecting);
        }
      );

      // NEW: Handle response based on mode
      if (result && result.finalData) {
        switch (mode) {
          case 'generate':
            setResults(result.finalData.commands || []);
            break;
          case 'explain':
            setResults(result.finalData.explanation ? [result.finalData] : []);
            break;
          case 'script':
            setResults(result.finalData.script_lines ? [result.finalData] : []);
            break;
          default:
            setResults([]);
        }
      } else {
        // Handle cases where parsing might fail or return nothing
        setResults([{ error: currentTranslations.errorParse }]);
      }
    } catch (error) {
      console.error(`Error in ${mode} mode:`, error);
      setResults([{ error: error.message || currentTranslations.errorGeneral }]);
    } finally {
      setIsLoading(false);
      // Increment usage count after a successful call
      const usage = parseInt(localStorage.getItem('usageCount') || '0', 10);
      localStorage.setItem('usageCount', (usage + 1).toString());
    }
  };

  const handleGenerate = (formData) => handleApiCall('generate', formData);
  const handleExplain = (formData) => handleApiCall('explain', formData);
  const handleScript = (formData) => handleApiCall('script', formData);

  // NEW: Render results based on currentMode
  const renderResults = () => {
    if (results.length === 0) return null;

    // Handle errors first
    if (results[0].error) {
      return <div className="text-red-500 text-center p-4">{results[0].error}</div>;
    }

    switch (currentMode) {
      case 'generate':
        return results.map((cmd, idx) => (
          <GeneratedCommandCard key={idx} lang={lang} {...cmd} />
        ));
      case 'explain':
        return <ExplanationCard lang={lang} explanation={results[0].explanation} />;
      case 'script':
        return <ScriptCard lang={lang} {...results[0]} />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300 ${lang === 'fa' ? 'font-vazir' : 'font-inter'}`}>
      <Toaster position="top-center" reverseOrder={false} />
      <Header
        lang={lang}
        theme={theme}
        onThemeChange={toggleTheme}
        onAboutClick={() => setIsAboutModalOpen(true)}
        onMenuClick={() => setIsDrawerOpen(true)}
        onLangChange={handleLangChange}
        onFeedbackClick={() => setShowFeedback(true)} // NEW: Prop for feedback button
      />

      <main className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        <div className="w-full max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">CMDGEN</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{currentTranslations.subtitle}</p>
        </div>

        <div className="w-full max-w-3xl mt-8">
          <Form
            onSubmit={handleGenerate}
            onExplain={handleExplain}
            onScript={handleScript} // Pass the script handler
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            lang={lang}
          />
        </div>

        <div className="w-full max-w-3xl mt-8 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <LoadingSpinner />
              <p className="mt-4 text-cyan-500">{loadingMessage}</p>
            </div>
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              {renderResults()}
            </Suspense>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        <p>All rights reserved. &copy;</p>
        <p>Created by Amirhossein Yavari</p>
      </footer>

      <Suspense fallback={<div />}>
        {isAboutModalOpen && <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} lang={lang} />}
        {isDrawerOpen && <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} lang={lang} onLangChange={handleLangChange} />}
        {showFeedback && <FeedbackCard isOpen={showFeedback} onClose={() => setShowFeedback(false)} lang={lang} />}
      </Suspense>
    </div>
  );
}

export default App;
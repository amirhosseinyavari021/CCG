import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import { osOptions } from './constants/osDetails';
import { translations } from './constants/translations';
import Header from './components/Header';
import Form from './components/Form';
import CommandCard from './components/CommandCard';
import ErrorAnalysis from './components/ErrorAnalysis';
import AboutModal from './components/AboutModal';
import FeedbackCard from './components/FeedbackCard';
import './index.css';

// Initialize i18next
i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    resources: translations,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

const App = () => {
  const { t, i18n } = useTranslation();
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState('');
  const [shell, setShell] = useState('bash');
  const [request, setRequest] = useState('');
  const [response, setResponse] = useState(null);
  const [mode, setMode] = useState('generate'); // 'generate', 'script', 'explain'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [usageCount, setUsageCount] = useState(0);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Load usage count from localStorage
  useEffect(() => {
    const savedUsage = localStorage.getItem('cmdgenUsageCount') || 0;
    setUsageCount(parseInt(savedUsage, 10));
    i18n.changeLanguage(localStorage.getItem('cmdgenLanguage') || 'en');
  }, []);

  // Save language change
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem('cmdgenLanguage', lang);
  };

  // Track usage
  const incrementUsage = () => {
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    localStorage.setItem('cmdgenUsageCount', newCount.toString());
  };

  // API call handler
  const callApi = async (selectedMode) => {
    if (!request.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call (replace with actual apiService call)
      // For now, mock response based on mode
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      const mockResponse = {
        commands: selectedMode === 'generate' ? ['ls -la'] : selectedMode === 'script' ? ['#!/bin/bash\necho "Hello"'] : ['This command lists files'],
        explanations: ['Lists all files'],
        warnings: ['Be careful with permissions']
      };
      setResponse({
        ...mockResponse,
        mode: selectedMode
      });
      incrementUsage();
      if (usageCount + 1 >= 20) {
        setIsFeedbackOpen(true); // Auto-open after 20 uses
      }
    } catch (err) {
      setError(t('apiError'));
    } finally {
      setIsLoading(false);
    }
  };

  const onGenerateCommand = () => {
    setMode('generate');
    callApi('generate');
  };

  const onGenerateScript = () => {
    setMode('script');
    callApi('script');
  };

  const onExplainCommand = () => {
    setMode('explain');
    callApi('explain');
  };

  const handleFeedbackOpen = () => {
    setIsFeedbackOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header
        onLanguageChange={handleLanguageChange}
        currentLanguage={currentLanguage}
        usageCount={usageCount}
        onFeedbackOpen={handleFeedbackOpen}
      />
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <Form
          os={os}
          setOs={setOs}
          osVersion={osVersion}
          setOsVersion={setOsVersion}
          shell={shell}
          setShell={setShell}
          request={request}
          setRequest={setRequest}
          onGenerateCommand={onGenerateCommand}
          onGenerateScript={onGenerateScript}
          onExplainCommand={onExplainCommand}
          isLoading={isLoading}
          currentLanguage={currentLanguage}
        />
        {error && <ErrorAnalysis error={error} />}
        {response && (
          <div className="mt-8 w-full max-w-2xl space-y-4">
            {response.commands.map((cmd, idx) => (
              <CommandCard
                key={idx}
                command={cmd}
                explanation={response.explanations[idx]}
                warning={response.warnings[idx]}
                mode={mode}
                index={idx}
              />
            ))}
          </div>
        )}
      </main>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <FeedbackCard
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        usageCount={usageCount}
      />
    </div>
  );
};

export default App;
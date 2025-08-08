import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { translations } from './constants/translations';
import { callApi } from './api/apiService';

import Header from './components/Header';
import Form from './components/Form';
import ErrorAnalysis from './components/ErrorAnalysis';
import { GeneratedCommandCard, ExplanationCard } from './components/CommandCard';
import AboutModal from './components/AboutModal';
import { PlusCircle, Github } from 'lucide-react'; // Github icon imported
import LoadingSpinner from './components/common/LoadingSpinner';

function AppContent() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  
  const [commandList, setCommandList] = useState([]);
  const [explanation, setExplanation] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [moreCommandsCount, setMoreCommandsCount] = useState(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  
  const [formState, setFormState] = useState({}); 

  const t = translations[lang];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;
    
    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);
    document.body.dir = savedLang === 'fa' ? 'rtl' : 'ltr';
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    document.body.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    setIsAboutModalOpen(false);
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
    setMoreCommandsCount(0);
    setIsLoading(true);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}>
       <Toaster 
         position="top-center" 
         reverseOrder={false}
         toastOptions={{
           className: 'dark:bg-gray-700 dark:text-white',
         }}
       />
       {isAboutModalOpen && <AboutModal lang={lang} onClose={() => setIsAboutModalOpen(false)} onLangChange={handleLangChange} />}
       
       <Header 
         lang={lang} 
         theme={theme} 
         onLangChange={handleLangChange} 
         onThemeChange={toggleTheme}
         onAboutClick={() => setIsAboutModalOpen(true)}
       />

        <main className="container mx-auto px-4 py-8 md:py-12 flex-grow">
            <div className="max-w-2xl mx-auto">
                <Form 
                    onSubmit={handleGenerate}
                    onExplain={handleExplain}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    lang={lang}
                />

                <div className="mt-8 space-y-4">
                    {commandList.map((cmd, index) => (
                        <GeneratedCommandCard key={index} {...cmd} lang={lang} />
                    ))}
                </div>

                {commandList.length > 0 && !isLoading && (
                    <div className="mt-6 text-center">
                        <button onClick={handleMoreCommands} disabled={isLoadingMore} className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]">
                            {isLoadingMore ? <><LoadingSpinner/> {t.loadingMore}</> : <><PlusCircle size={18}/> {t.moreCommands}</>}
                        </button>
                    </div>
                )}
                
                {explanation && <ExplanationCard explanation={explanation} lang={lang} />}
                
                {(commandList.length > 0 || explanation) && !isLoading && (
                    <ErrorAnalysis {...formState} lang={lang} />
                )}
            </div>
        </main>

        <footer className="bg-white dark:bg-gray-900 py-4 text-center text-gray-500 dark:text-gray-400 text-xs border-t border-gray-200 dark:border-gray-800">
             <div className="flex justify-center items-center gap-4 mb-2">
                <a href="https://github.com/amirhosseinyavari021/AY-CMDGEN/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <Github size={20} />
                </a>
             </div>
             <p>{t.footerLine1}</p>
             <p className="mt-1">{t.footerLine2}</p>
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

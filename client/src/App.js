import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { translations } from './constants/translations';
import { callApi } from './api/apiService';

// Import all the new, refactored components
import Header from './components/Header';
import Form from './components/Form';
import ErrorAnalysis from './components/ErrorAnalysis';
import { GeneratedCommandCard, ExplanationCard, ScriptCard } from './components/CommandCard';
import AboutModal from './components/AboutModal';
import { PlusCircle } from 'lucide-react';
import LoadingSpinner from './components/common/LoadingSpinner';

function AppContent() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [mode, setMode] = useState('generate');
  
  // This state holds the form data after submission, to be used by "More Commands"
  const [formState, setFormState] = useState({}); 
  
  // Results for different modes are handled separately now
  const [mainResult, setMainResult] = useState(null); // For explain/script modes
  const [commandList, setCommandList] = useState([]); // For generate mode
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreCommandsCount, setMoreCommandsCount] = useState(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const t = translations[lang];

  // Effect to set theme and language from localStorage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);
    document.body.dir = savedLang === 'fa' ? 'rtl' : 'ltr';
  }, []);

  // Handler to change language
  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    document.body.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    setIsAboutModalOpen(false); // Close modal on language change
  };

  // Handler to toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  // Main handler for form submission
  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setMainResult(null);
    setCommandList([]);
    setMoreCommandsCount(0);
    setFormState(formData); // Save form state for "More Commands" feature

    const apiResult = await callApi({ ...formData, lang, mode, iteration: 0 });
    
    if (apiResult) {
      if (apiResult.type === 'generate') {
        setCommandList(apiResult.data.commands || []);
      } else {
        setMainResult(apiResult);
      }
    }
    setIsLoading(false);
  };
  
  // Handler for the "More Commands" button
  const handleMoreCommands = async () => {
    setIsLoadingMore(true);
    const iteration = moreCommandsCount + 1;
    const existing = commandList.map(c => c.command);

    const apiResult = await callApi({ ...formState, lang, mode: 'generate', iteration, existingCommands: existing });
    
    if (apiResult && apiResult.data.commands) {
      setCommandList(prev => [...prev, ...apiResult.data.commands]);
      setMoreCommandsCount(iteration);
    }
    setIsLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}>
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
                    mode={mode}
                    setMode={setMode}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    lang={lang}
                />

                <div className="mt-8 space-y-4">
                    {commandList.map((cmd, index) => (
                        <GeneratedCommandCard key={index} {...cmd} lang={lang} />
                    ))}
                </div>

                {mode === 'generate' && commandList.length > 0 && moreCommandsCount < 5 && !isLoading && (
                    <div className="mt-6 text-center">
                        <button onClick={handleMoreCommands} disabled={isLoadingMore} className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]">
                            {isLoadingMore ? <><LoadingSpinner/> {t.loadingMore}</> : <><PlusCircle size={18}/> {t.moreCommands}</>}
                        </button>
                    </div>
                )}
                
                {mainResult?.type === 'explain' && <ExplanationCard explanation={mainResult.data} lang={lang} />}
                {mainResult?.type === 'script' && mainResult.data.filename && <ScriptCard {...mainResult.data} lang={lang} />}
                
                {commandList.length > 0 && !isLoading && (
                    <ErrorAnalysis {...formState} lang={lang} />
                )}
            </div>
        </main>

        <footer className="bg-white dark:bg-gray-900 py-4 text-center text-gray-500 dark:text-gray-400 text-xs border-t border-gray-200 dark:border-gray-800">
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

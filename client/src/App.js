import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { translations } from './constants/translations';
import { osDetails } from './constants/osDetails';
import { callApi } from './api/apiService';

// این کامپوننت‌ها را در مراحل بعدی خواهیم ساخت
// import Header from './components/Header'; 
// import Form from './components/Form';
// import Results from './components/Results';

function AppContent() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [mode, setMode] = useState('generate');
  
  const [mainResult, setMainResult] = useState(null);
  const [commandList, setCommandList] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreCommandsCount, setMoreCommandsCount] = useState(0);

  const t = translations[lang];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);
    document.body.dir = savedLang === 'fa' ? 'rtl' : 'ltr';
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    document.body.dir = newLang === 'fa' ? 'rtl' : 'ltr';
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setMainResult(null);
    setCommandList([]);
    setMoreCommandsCount(0);

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
  
  const handleMoreCommands = async (formData) => {
    setIsLoadingMore(true);
    const iteration = moreCommandsCount + 1;
    const existing = commandList.map(c => c.command);

    const apiResult = await callApi({ ...formData, lang, mode: 'generate', iteration, existingCommands: existing });
    
    if (apiResult && apiResult.data.commands) {
      setCommandList(prev => [...prev, ...apiResult.data.commands]);
      setMoreCommandsCount(iteration);
    }
    setIsLoadingMore(false);
  };
  
  // در این مرحله، برای سادگی، ما هنوز رابط کاربری را نساخته‌ایم.
  // شما می‌توانید کدهای JSX مربوط به Header, Form و Results را که در فایل قبلی بود،
  // به اینجا منتقل کرده و سپس به تدریج به کامپوننت‌های جداگانه ببرید.
  // اما فعلاً برای اینکه ساختار اصلی را ببینید، این فایل را تمیز نگه می‌داریم.

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}>
       {/* Placeholder for UI components */}
       <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold text-center">CMDGEN - Refactored</h1>
            <p className="text-center">The new architecture is in place. Next step is to build the UI components.</p>
            {/* We will add <Header />, <Form />, and <Results /> here later */}
       </div>
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

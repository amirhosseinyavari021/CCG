// client/src/App.js
import React, { useState, useEffect, lazy, Suspense } from 'react';
import './index.css';
import Header from './components/Header';
import Form from './components/Form';
// ایمپورت callApi: حالا از apiService ایمپورت می‌شود
import { callApi } from './api/apiService'; // ایمپورت callApi به عنوان named export
// ایمپورت: استفاده از named import
import { t } from './constants/translations'; // ایمپورت t به عنوان named export

// لیزی لود کردن کامپوننت‌هایی که در ابتدا نیاز نیستند
const AboutModal = lazy(() => import('./components/AboutModal'));
const MobileDrawer = lazy(() => import('./components/MobileDrawer'));
const FeedbackCard = lazy(() => import('./components/FeedbackCard'));

// کامپوننت نمایش کارت کامند (ساده شده برای نمایش در اینجا)
const GeneratedCommandCard = ({ command, explanation, warning, lang }) => {
  // استفاده مستقیم از t[lang]
  const currentTranslations = t[lang] || t['en'];
  return (
    <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-lg">
      <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-4">{currentTranslations.generatedCommandTitle || currentTranslations.generateCommands || "Generated Command"}</h3>
      <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words">
        {command}
      </pre>
      {explanation && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">{currentTranslations.explanation || currentTranslations.explanationTitle || "Explanation"}</h4>
          <div
            className="prose prose-sm dark:prose-invert mt-1 text-gray-600 dark:text-gray-400"
            dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />') }}
          />
        </div>
      )}
      {warning && warning.trim() !== '' && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 italic">{warning}</p>
      )}
    </div>
  );
};

// کامپوننت نمایش توضیح (ساده شده برای نمایش در اینجا)
const ExplanationCard = ({ explanation, lang }) => {
  const currentTranslations = t[lang] || t['en'];
  return (
    <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-lg">
      <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-4">{currentTranslations.explanationTitle || "Explanation"}</h3>
      <div
        className="prose prose-sm dark:prose-invert text-gray-600 dark:text-gray-400"
        dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />') }}
      />
    </div>
  );
};

// کامپوننت نمایش اسکریپت (ساده شده برای نمایش در اینجا)
const ScriptCard = ({ filename, script_lines = [], lang }) => {
  const currentTranslations = t[lang] || t['en'];
  const fullScript = script_lines.join('\n');
  const downloadScript = () => {
    const blob = new Blob([fullScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'script.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-lg">
      <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-4">{currentTranslations.scriptTitle || currentTranslations.generateScript || "Generated Script"}</h3>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{filename || 'script.sh'}</span>
        <button
          onClick={downloadScript}
          className="text-sm bg-cyan-600 text-white px-3 py-1 rounded hover:bg-cyan-700 transition-colors"
        >
          {currentTranslations.download || "Download"}
        </button>
      </div>
      <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words">
        {fullScript}
      </pre>
    </div>
  );
};

function App() { // تغییر نام تابع به App اگر این کامپورنت اصلی است
  const [lang, setLang] = useState('en'); // زبان پیش‌فرض
  const [theme, setTheme] = useState('dark'); // تم پیش‌فرض
  const [commandList, setCommandList] = useState([]); // لیست کامندها
  const [explanation, setExplanation] = useState(null); // توضیح
  const [scriptData, setScriptData] = useState(null); // داده اسکریپت (اگر حالت اسکریپت باشد)
  const [isLoading, setIsLoading] = useState(false); // وضعیت لودینگ
  const [loadingMessage, setLoadingMessage] = useState(''); // پیام لودینگ
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false); // وضعیت مودال درباره
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // وضعیت دراور موبایل
  const [showFeedback, setShowFeedback] = useState(false); // وضعیت کارت فیدبک
  const [activeTab, setActiveTab] = useState('generate'); // تب فعال (generate, explain, script, analyze)

  const currentTranslations = t[lang] || t['en']; // ترجمه‌های فعلی

  useEffect(() => {
    // بارگذاری تنظیمات ذخیره شده
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme; // اعمال تم به html

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
    document.documentElement.className = newTheme; // اعمال تم جدید
  };

  const resetStateForNewRequest = () => {
    setCommandList([]);
    setExplanation(null);
    setScriptData(null); // ریست کردن اسکریپت
    setIsLoading(true);
    setLoadingMessage(currentTranslations.loading || "Loading...");
  };

  const handleApiCall = async (mode, formData) => {
    resetStateForNewRequest();
    try {
      const result = await callApi({ // استفاده از تابع callApi که الان تعریف شده
        mode,
        userInput: formData.userInput,
        os: formData.os,
        osVersion: formData.osVersion,
        cli: formData.cli,
        lang
      }, (stage) => {
        // ترجمه‌های 'fetching' و 'connecting' در فایل t وجود ندارند، پس مقدار پیش‌فرض انگلیسی استفاده می‌شود
        // اگر بخواید این پیام‌ها هم ترجمه بشن، باید به فایل t اضافه بشه
        setLoadingMessage(stage === 'fetching' ? 'Fetching data...' : 'Connecting...');
        // یا استفاده از ترجمه اگر وجود داشته باشه: setLoadingMessage(currentTranslations[stage] || (stage === 'fetching' ? 'Fetching data...' : 'Connecting...'));
      });

      // بر اساس حالت (mode) نتیجه را پردازش کن
      if (mode === 'generate') {
        setCommandList(result.finalData.commands || []);
        setExplanation(result.finalData.explanation || null);
      } else if (mode === 'explain' || mode === 'analyze') {
        setCommandList([]); // حالت توضیح نباید کامند نشان دهد
        setExplanation(result.finalData.explanation || null);
      } else if (mode === 'script') {
        setScriptData(result.finalData); // فرض بر این است که finalData شامل script_lines و filename است
        setCommandList([]); // حالت اسکریپت نباید کامند جداگانه نشان دهد
        setExplanation(result.finalData.explanation || null); // ممکن است توضیح داشته باشد
      }
    } catch (error) {
      console.error(`Error in ${mode} mode:`, error);
      // استفاده از ترجمه خاص هر حالت یا ترجمه عمومی
      let errorMessageKey = 'errorGeneral';
      if (mode === 'generate') errorMessageKey = 'errorGenerating';
      else if (mode === 'analyze') errorMessageKey = 'errorAnalyzing';
      else if (mode === 'explain') errorMessageKey = 'errorExplaining';
      else if (mode === 'script') errorMessageKey = 'errorGenerating'; // یا یک ترجمه خاص اسکریپت اضافه کنید

      setExplanation(currentTranslations[errorMessageKey] || currentTranslations.errorGeneral || "An error occurred."); // استفاده از ترجمه خاص هر حالت یا ترجمه عمومی
      setCommandList([]);
      setScriptData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // توابع هندلر برای هر تب
  const handleGenerate = (formData) => handleApiCall('generate', formData);
  const handleExplain = (formData) => handleApiCall('explain', formData);
  const handleAnalyze = (formData) => handleApiCall('analyze', formData); // تحلیل مثل توضیح عمل می‌کند
  const handleScript = (formData) => handleApiCall('script', formData);

  return (
    // استفاده از کلاس‌های Tailwind
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${lang === 'fa' ? 'rtl' : 'ltr'}`}>
      <Header
        lang={lang}
        theme={theme}
        onThemeChange={toggleTheme}
        onAboutClick={() => setIsAboutModalOpen(true)}
        onMenuClick={() => setIsDrawerOpen(true)}
        onLangChange={handleLangChange}
      />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center gap-6">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">CMDGEN</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">{currentTranslations.subtitle}</p>
        </div>

        <div className="w-full max-w-lg">
          <Form
            onSubmit={
              activeTab === 'generate' ? handleGenerate :
                activeTab === 'explain' ? handleExplain :
                  activeTab === 'analyze' ? handleAnalyze : handleScript
            }
            onExplain={handleExplain} // اگر فرم نیاز به تابع جداگانه explain داشته باشد
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            lang={lang}
            activeTab={activeTab}
            onTabChange={setActiveTab} // تغییر نام از setActiveTab به onTabChange اگر Form اینطور تعریف کرده
          />
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-gray-700 dark:text-gray-300">{loadingMessage}</p>
          </div>
        )}

        {!isLoading && (
          <div className="w-full max-w-lg flex flex-col gap-6">
            {/* نمایش کارت کامند تولید شده */}
            {commandList.length > 0 && commandList.map((cmd, idx) => (
              <GeneratedCommandCard key={idx} command={cmd.command || cmd} explanation={cmd.explanation} warning={cmd.warning} lang={lang} />
            ))}

            {/* نمایش کارت اسکریپت تولید شده */}
            {scriptData && (
              <ScriptCard
                filename={scriptData.filename}
                script_lines={scriptData.script_lines}
                lang={lang}
              />
            )}

            {/* نمایش کارت توضیح */}
            {explanation && !commandList.length && !scriptData && ( // فقط اگر کامند یا اسکریپت نباشد
              <ExplanationCard explanation={explanation} lang={lang} />
            )}
          </div>
        )}
      </main>

      <Suspense fallback={<div className="hidden"></div>}> {/* fallback خالی یا مخفی */}
        <AboutModal
          lang={lang}
          onClose={() => setIsAboutModalOpen(false)}
          onLangChange={handleLangChange} // اگر مودال بخواد زبان عوض کنه
        />
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          lang={lang}
          onLangChange={handleLangChange} // اگر دراور بخواد زبان عوض کنه
        />
        <FeedbackCard
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          lang={lang}
        />
      </Suspense>
    </div>
  );
}

export default App; // تغییر نام export اگر لازم بود
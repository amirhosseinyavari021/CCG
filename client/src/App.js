import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Copy, Check, ServerCrash, Wand2, Search, ShieldAlert, Sun, Moon, FileCode2, Info, X, Menu, Download, ChevronDown, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

// Translations
const translations = {
  en: {
    about: "About", modeGenerate: "Generate", modeExplain: "Explain", modeScript: "Script", modeError: "Analyze Error",
    generateSubheader: "Ask a question to generate commands.", explainSubheader: "Enter a command for a detailed explanation.",
    scriptSubheader: "Describe a multi-step task to create a script.", errorSubheader: "Paste an error message to analyze and fix it.",
    questionLabel: "Your Question", taskLabel: "Describe Your Task", errorLabel: "Paste Your Error Here",
    questionPlaceholder: "e.g., how to find files larger than 100MB", taskPlaceholder: "e.g., zip all .log files and move to /tmp",
    errorPlaceholder: "e.g., bash: command not found: git", commandLabel: "Command to Explain", commandPlaceholder: "e.g., grep -r 'error' /var/log",
    os: "Operating System", osVersion: "OS Version", cli: "CLI / Shell", selectVersion: "Select Version", selectCli: "Select Shell",
    generate: "Generate Commands", explain: "Explain", generateScript: "Create Script", analyzeError: "Analyze Error",
    generating: "Generating...", explaining: "Explaining...", generatingScript: "Creating Script...", analyzing: "Analyzing...",
    copied: "Copied!", copyAll: "Copy All as Script", downloadScript: "Download Script",
    errorNetwork: "Unable to connect. Please check your internet connection.",
    errorServer: "Something went wrong on our end. Please try again later.",
    errorInput: "Invalid input. Please provide a valid question or command.",
    fieldRequired: "This field is required",
    detailedExplanation: "Command Explanation", scriptExplanation: "Script Details", errorAnalysis: "Error Analysis", cause: "Cause", solution: "Solution", explanation: "Explanation",
    aboutMeTitle: "About Me", aboutToolTitle: "About CMDGEN", aboutMeText: "I'm Amirhossein Yavari, born in 2008, passionate about IT and building tools like CMDGEN.",
    aboutToolText: "CMDGEN is a smart assistant for command-line tasks, built with React.", footerLine1: "All rights reserved.",
    footerLine2: "Created by Amirhossein Yavari",
  },
  fa: {
    about: "درباره", modeGenerate: "تولید دستور", modeExplain: "تحلیل دستور", modeScript: "ساخت اسکریپت", modeError: "تحلیل خطا",
    generateSubheader: "سوال خود را برای تولید دستورات وارد کنید.", explainSubheader: "یک دستور برای توضیحات کامل وارد کنید.",
    scriptSubheader: "وظیفه چندمرحله‌ای را برای ساخت اسکریپت توصیف کنید.", errorSubheader: "پیغام خطا را برای تحلیل وارد کنید.",
    questionLabel: "سوال شما", taskLabel: "وظیفه خود را توصیف کنید", errorLabel: "پیغام خطای خود را وارد کنید",
    questionPlaceholder: "مثلاً: چطور فایل‌های بزرگتر از ۱۰۰ مگابایت را پیدا کنم", taskPlaceholder: "مثلاً: فایل‌های log را فشرده و به tmp منتقل کن",
    errorPlaceholder: "مثلاً: bash: command not found: git", commandLabel: "دستور برای تحلیل", commandPlaceholder: "مثلاً: grep -r 'error' /var/log",
    os: "سیستم‌عامل", osVersion: "نسخه سیستم‌عامل", cli: "رابط خط فرمان", selectVersion: "انتخاب نسخه", selectCli: "انتخاب رابط",
    generate: "تولید دستورات", explain: "تحلیل کن", generateScript: "ساخت اسکریپت", analyzeError: "تحلیل خطا",
    generating: "در حال تولید...", explaining: "در حال تحلیل...", generatingScript: "در حال ساخت...", analyzing: "در حال بررسی...",
    copied: "کپی شد!", copyAll: "کپی همه به‌عنوان اسکریپت", downloadScript: "دانلود اسکریپت",
    errorNetwork: "اتصال برقرار نشد. لطفاً اینترنت خود را بررسی کنید.",
    errorServer: "مشکلی از سمت ما پیش آمده. لطفاً بعداً دوباره امتحان کنید.",
    errorInput: "ورودی نامعتبر است. لطفاً سوال یا دستور معتبری وارد کنید.",
    fieldRequired: "این فیلد الزامی است",
    detailedExplanation: "توضیحات دستور", scriptExplanation: "جزئیات اسکریپت", errorAnalysis: "تحلیل خطا", cause: "علت", solution: "راه‌حل", explanation: "توضیحات",
    aboutMeTitle: "درباره من", aboutToolTitle: "درباره CMDGEN", aboutMeText: "من امیرحسین یاوری هستم، متولد ۱۳۸۷، علاقه‌مند به IT و ساخت ابزارهایی مثل CMDGEN.",
    aboutToolText: "CMDGEN یک دستیار هوشمند برای خط فرمان است که با React ساخته شده.", footerLine1: "تمامی حقوق محفوظ است.",
    footerLine2: "ساخته شده توسط امیرحسین یاوری",
  }
};
const osDetails = {
  linux: { versions: ['Ubuntu 22.04', 'Debian 11', 'Fedora 38', 'Arch Linux'], clis: ['Bash', 'Zsh', 'Fish'] },
  windows: { versions: ['Windows 11', 'Windows 10', 'Windows Server 2022'], clis: ['PowerShell', 'CMD'] },
  macos: { versions: ['Sonoma (14)', 'Ventura (13)'], clis: ['Zsh', 'Bash'] }
};
const CACHE_DURATION = 3600000;
const getCacheKey = (mode, os, userInput) => `${mode}-${os}-${userInput}`;
const setCache = (key, value) => {
  try {
    const cacheEntry = { value, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (e) { console.warn("Failed to set cache:", e); }
};
const getCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { value, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) return value;
    localStorage.removeItem(key);
    return null;
  } catch (e) {
    console.warn("Failed to get cache:", e);
    return null;
  }
};

const baseSystemPrompt = `You are CMDGEN, an expert command-line assistant. Provide practical, user-focused explanations. Use "فلگ" for command-line options in Persian.`;

// Standalone Component for a single step in the error analysis solution
const SolutionStep = ({ step, t }) => {
    if (step.startsWith('CMD:')) {
        const command = step.substring(4).trim();
        const [copied, setCopied] = useState(false);
        const handleCopy = () => {
            navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success(t.copied);
        };
        return <CommandDisplay command={command} onCopy={handleCopy} copied={copied} />;
    }
    return <p className="text-gray-600 dark:text-gray-300 text-sm">{step}</p>;
};

// Components
const CustomSelect = ({ label, value, onChange, options, placeholder, lang, error }) => (
  <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label} <span className="text-red-500">*</span></label>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500">
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className={`w-5 h-5 absolute text-gray-500 dark:text-gray-400 pointer-events-none ${lang === 'fa' ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2`} />
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </motion.div>
);
const Card = ({ children, lang }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg"
    style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
  >
    {children}
  </motion.div>
);
const CommandDisplay = ({ command, onCopy, copied }) => (
  <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
    <pre className="p-4 pr-12 font-mono text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">{command}</pre>
    <button onClick={onCopy} className="absolute top-2 right-2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors">
      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
    </button>
  </div>
);
const GeneratedCommandCard = ({ command, explanation, warning, lang }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(translations[lang].copied);
  };
  return (
    <Card lang={lang}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-600 dark:text-cyan-400"><Terminal size={18} /> Command</h4>
      </div>
      <CommandDisplay command={command} onCopy={handleCopy} copied={copied} />
      {explanation && <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{explanation}</p>}
      {warning && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 italic">{warning}</p>}
    </Card>
  );
};
const ExplanationCard = ({ explanation, lang }) => (
  <motion.div
    className="mt-6 max-w-2xl mx-auto"
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    <Card lang={lang}>
      <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 mb-4"><Bot size={18} /> {translations[lang].detailedExplanation}</h3>
      <div className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    </Card>
  </motion.div>
);
const ScriptCard = ({ filename, script_lines = [], explanation, lang }) => {
  const [copied, setCopied] = useState(false);
  const fullScript = script_lines.join('\n');
  const handleCopy = () => {
    navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(translations[lang].copied);
  };
  const downloadScript = () => {
    const blob = new Blob([fullScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <motion.div
      className="mt-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card lang={lang}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-600 dark:text-cyan-400"><FileCode2 size={18} /> {filename}</h4>
          <button onClick={downloadScript} className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"><Download size={16} /> {translations[lang].downloadScript}</button>
        </div>
        <CommandDisplay command={fullScript} onCopy={handleCopy} copied={copied} />
        {explanation && <div className="mt-3"><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{translations[lang].scriptExplanation}</h4><p className="text-gray-600 dark:text-gray-300 text-sm">{explanation}</p></div>}
      </Card>
    </motion.div>
  );
};
const ErrorAnalysisCard = ({ analysis, lang }) => {
    const t = translations[lang];
    return (
        <motion.div className="mt-6 max-w-2xl mx-auto" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <Card lang={lang}>
                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 mb-4"><ShieldAlert size={18} /> {t.errorAnalysis}</h3>
                <div className="space-y-5">
                    {analysis.cause && <div>
                        <h4 className="font-semibold text-red-500 dark:text-red-400 mb-2">{t.cause}</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{analysis.cause}</p>
                    </div>}
                    {analysis.explanation && <div>
                        <h4 className="font-semibold text-amber-500 dark:text-amber-400 mb-2">{t.explanation || 'Explanation'}</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{analysis.explanation}</p>
                    </div>}
                    {analysis.solution && <div>
                        <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">{t.solution}</h4>
                        <div className="space-y-2">
                            {analysis.solution.map((step, index) => <SolutionStep key={index} step={step} t={t} />)}
                        </div>
                    </div>}
                </div>
            </Card>
        </motion.div>
    );
};
const AboutModal = ({ lang, onClose, onLangChange }) => {
    const t = translations[lang];
    return (
        <motion.div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm p-5 shadow-lg" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">About CMDGEN</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={18} /></button>
                </div>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    <div>
                        <h3 className="font-medium text-cyan-600 dark:text-cyan-400">{t.aboutMeTitle}</h3>
                        <p className="text-sm">{t.aboutMeText}</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-cyan-600 dark:text-cyan-400">{t.aboutToolTitle}</h3>
                        <p className="text-sm">{t.aboutToolText}</p>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                         <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                            <button onClick={() => onLangChange('en')} className={`px-3 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                            <button onClick={() => onLangChange('fa')} className={`px-3 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
const MobileDrawer = ({ lang, isOpen, onClose, onAboutClick, onLangChange }) => {
  const t = translations[lang];
  return (
    <motion.div className={`fixed inset-y-0 ${lang === 'fa' ? 'right-0' : 'left-0'} bg-white dark:bg-gray-900 w-64 z-50 shadow-lg transition-transform duration-300 ${isOpen ? 'translate-x-0' : (lang === 'fa' ? 'translate-x-full' : '-translate-x-full')}`} initial={{ x: lang === 'fa' ? '100%' : '-100%' }} animate={{ x: isOpen ? 0 : (lang === 'fa' ? '100%' : '-100%') }}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Menu</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        <button onClick={() => { onAboutClick(); onClose(); }} className="flex items-center gap-3 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded w-full text-left">
          <Info size={20} /> {t.about}
        </button>
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                <button onClick={() => onLangChange('en')} className={`px-4 py-1.5 rounded-full text-sm w-full ${lang === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                <button onClick={() => onLangChange('fa')} className={`px-4 py-1.5 rounded-full text-sm w-full ${lang === 'fa' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
            </div>
        </div>
      </div>
    </motion.div>
  );
};


function AppContent() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [mode, setMode] = useState('generate');
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState('');
  const [cli, setCli] = useState('');
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);
  }, []);

  useEffect(() => {
    document.body.dir = lang === 'fa' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    setOsVersion(osDetails[os].versions[0]);
    setCli(osDetails[os].clis[0]);
    setResult(null);
    setUserInput('');
  }, [os, mode]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setIsAboutModalOpen(false);
    setIsDrawerOpen(false);
  };
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handlePrimaryAction = async () => {
    const newErrors = {};
    if (!userInput.trim()) newErrors.userInput = t.fieldRequired;
    if (!os) newErrors.os = t.fieldRequired;
    if (!osVersion) newErrors.osVersion = t.fieldRequired;
    if (!cli) newErrors.cli = t.fieldRequired;
    if (Object.keys(newErrors).length) {
      setFormErrors(newErrors);
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setFormErrors({});
    setIsLoading(true);
    setResult(null);

    const langMap = { 'fa': 'Persian', 'en': 'English' };
    let payload;
    let responseType;
    let isJson = false;

    if (mode === 'generate') {
      responseType = 'commands';
      isJson = true;
      const systemPrompt = `${baseSystemPrompt} Provide 3 practical commands in JSON format (array named "commands") for the user's environment: OS=${os}, Version=${osVersion}, Shell=${cli}. Language: ${langMap[lang]}. Each command must have "command", "explanation", and an optional "warning".`;
      payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Question: "${userInput}"` }] };
    } else if (mode === 'explain') {
      responseType = 'explanation';
      const systemPrompt = `${baseSystemPrompt} Provide a clear Markdown explanation for the command in ${langMap[lang]}. Include: "Purpose / هدف", "Breakdown / اجزاء دستور", "Usage Examples / مثال‌های کاربردی", "Pro Tip / نکته حرفه‌ای".`;
      payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Command: \`${userInput}\`. Environment: OS=${os}, Version=${osVersion}, Shell=${cli}.` }] };
    } else if (mode === 'script') {
        responseType = 'script';
        isJson = true;
        const scriptExtension = (os === 'windows' && cli === 'PowerShell') ? 'ps1' : (os === 'windows' && cli === 'CMD') ? 'bat' : 'sh';
        const systemPrompt = `${baseSystemPrompt} Generate a JSON object with a script for the task. Include: "filename" (e.g., "task.${scriptExtension}"), "script_lines" (array of code lines), "explanation". Language: ${langMap[lang]}.`;
        payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Task: "${userInput}". Environment: OS=${os}, Version=${osVersion}, Shell=${cli}.` }] };
    } else { // error
        responseType = 'error';
        isJson = true;
        const systemPrompt = `${baseSystemPrompt} Analyze the error in JSON format. Include: "cause", "explanation", "solution" (array of steps, prefix commands with 'CMD:'). Language: ${langMap[lang]}.`;
        payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Error: "${userInput}". Environment: OS=${os}, Version=${osVersion}, Shell=${cli}.` }] };
    }

    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: t.errorServer } }));
            throw new Error(errorData.error.message || t.errorServer);
        }

        if (!response.body) {
            throw new Error("Response body is missing.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            accumulatedData += decoder.decode(value, { stream: true });
        }
        
        let fullContent = '';
        const dataLines = accumulatedData.split('\n').filter(line => line.startsWith('data: '));

        for(const line of dataLines) {
            const jsonPart = line.substring(5).trim();
            if(jsonPart && jsonPart !== "[DONE]") {
                try {
                    const parsed = JSON.parse(jsonPart);
                    if(parsed.choices[0].delta.content) {
                        fullContent += parsed.choices[0].delta.content;
                    }
                } catch(e) {
                    console.warn("Could not parse stream chunk:", jsonPart);
                }
            }
        }
        
        const finalParsedData = isJson ? JSON.parse(fullContent) : fullContent;

        setResult({ type: responseType, data: finalParsedData });
        setCache(getCacheKey(mode, os, userInput), finalParsedData);

    } catch (err) {
        toast.error(err.message || t.errorNetwork);
    } finally {
        setIsLoading(false);
    }
  };

  const copyAllCommands = () => {
    if (result?.type === 'commands' && result.data.commands && result.data.commands.length > 0) {
        const textToCopy = result.data.commands.map(cmd => cmd.command).join('\n');
        navigator.clipboard.writeText(textToCopy);
        toast.success(t.copied);
    }
  };

  const currentModeData = {
    generate: { label: t.questionLabel, placeholder: t.questionPlaceholder, button: t.generate, loading: t.generating },
    explain: { label: t.commandLabel, placeholder: t.commandPlaceholder, button: t.explain, loading: t.explaining },
    script: { label: t.taskLabel, placeholder: t.taskPlaceholder, button: t.generateScript, loading: t.generatingScript },
    error: { label: t.errorLabel, placeholder: t.errorPlaceholder, button: t.analyzeError, loading: t.analyzing },
  };

  return (
    <motion.div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {isAboutModalOpen && <AboutModal lang={lang} onClose={() => setIsAboutModalOpen(false)} onLangChange={handleLangChange} />}
        <MobileDrawer lang={lang} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onAboutClick={() => setIsAboutModalOpen(true)} onLangChange={handleLangChange} />

        <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDrawerOpen(true)} className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <Menu size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">CMDGEN</h1>
                    <button onClick={() => setIsAboutModalOpen(true)} className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                        <Info size={16} /> {t.about}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleTheme} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div className="hidden md:flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                        <button onClick={() => setLang('en')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
                        <button onClick={() => setLang('fa')} className={`px-2.5 py-1 rounded-full text-xs ${lang === 'fa' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
                    </div>
                </div>
            </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12 flex-grow">
            <div className="max-w-2xl mx-auto">
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {['generate', 'explain', 'script', 'error'].map(m => (
                        <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors duration-200 ${mode === m ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            {m === 'generate' && <Wand2 size={16} />} {m === 'explain' && <Search size={16} />}
                            {m === 'script' && <FileCode2 size={16} />} {m === 'error' && <ShieldAlert size={16} />}
                            {t[`mode${m.charAt(0).toUpperCase() + m.slice(1)}`]}
                        </button>
                    ))}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`]}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-center text-md">{t[`${mode}Subheader`]}</p>

                <Card lang={lang}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <CustomSelect label={t.os} value={os} onChange={setOs} options={Object.keys(osDetails)} placeholder={t.os} lang={lang} error={formErrors.os} />
                        <CustomSelect label={t.osVersion} value={osVersion} onChange={setOsVersion} options={osDetails[os]?.versions || []} placeholder={t.selectVersion} lang={lang} error={formErrors.osVersion} />
                        <CustomSelect label={t.cli} value={cli} onChange={setCli} options={osDetails[os]?.clis || []} placeholder={t.selectCli} lang={lang} error={formErrors.cli} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentModeData.label} <span className="text-red-500">*</span></label>
                        <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={currentModeData.placeholder} className="w-full h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 resize-none" />
                        {formErrors.userInput && <p className="text-red-500 text-xs mt-1">{formErrors.userInput}</p>}
                    </div>
                    <button onClick={handlePrimaryAction} disabled={isLoading} className="mt-5 w-full bg-cyan-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200">
                        {isLoading ? currentModeData.loading : currentModeData.button}
                    </button>
                </Card>

                {result?.type === 'commands' && result.data.commands && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generated Commands</h3>
                            <button onClick={copyAllCommands} className="flex items-center gap-1.5 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"><Copy size={14} /> {t.copyAll}</button>
                        </div>
                        {result.data.commands.map((cmd, index) => <GeneratedCommandCard key={index} command={cmd.command} explanation={cmd.explanation} warning={cmd.warning} lang={lang} />)}
                    </motion.div>
                )}
                
                {result?.type === 'explanation' && <ExplanationCard explanation={result.data} lang={lang} />}
                {result?.type === 'script' && result.data.filename && <ScriptCard filename={result.data.filename} script_lines={result.data.script_lines} explanation={result.data.explanation} lang={lang} />}
                {result?.type === 'error' && result.data.cause && <ErrorAnalysisCard analysis={result.data} lang={lang} />}
            </div>
        </main>

        <footer className="bg-white dark:bg-gray-900 py-4 text-center text-gray-500 dark:text-gray-400 text-xs border-t border-gray-200 dark:border-gray-800">
             <p>{t.footerLine1}</p>
             <p className="mt-1">{t.footerLine2}</p>
        </footer>
    </motion.div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

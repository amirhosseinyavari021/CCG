import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Copy, Check, ServerCrash, Wand2, Search, ShieldAlert, Sun, Moon, FileCode2, Info, X, Menu, Download, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// Translations
const translations = {
  en: {
    about: "About", modeGenerate: "Generate", modeExplain: "Explain", modeScript: "Script", modeError: "Analyze Error",
    generateSubheader: "Ask a question to generate commands.", explainSubheader: "Enter a command to get a detailed explanation.",
    scriptSubheader: "Describe a multi-step task to generate a script.", errorSubheader: "Paste an error message to understand and solve it.",
    questionLabel: "Your Question", taskLabel: "Describe your task", errorLabel: "Paste your error message here",
    questionPlaceholder: "e.g., how to find all files larger than 100MB", taskPlaceholder: "e.g., find all .log files, zip them, and move to /tmp",
    errorPlaceholder: "e.g., bash: command not found: git", commandLabel: "Command to Explain", commandPlaceholder: "e.g., grep -r 'error' /var/log",
    os: "Operating System", osVersion: "OS Version", cli: "CLI / Shell", selectVersion: "Select Version", selectCli: "Select Shell",
    generate: "Generate Commands", explain: "Explain Command", generateScript: "Generate Script", analyzeError: "Analyze Error",
    generating: "Generating...", explaining: "Explaining...", generatingScript: "Generating Script...", analyzing: "Analyzing...",
    copied: "Copied!", copyAll: "Copy All as Script", downloadScript: "Download Script", errorTitle: "An Error Occurred",
    errorMessage: "Could not fetch a response. Please check your connection and API key.", fieldRequired: "This field is required",
    detailedExplanation: "Command Explanation", scriptExplanation: "Script Explanation", errorAnalysis: "Error Analysis",
    aboutMeTitle: "About Me", aboutToolTitle: "About CMDGEN", aboutMeText: "I'm Amirhossein Yavari, born in 2008, passionate about IT and building tools like CMDGEN.",
    aboutToolText: "CMDGEN is an intelligent assistant for command-line tasks, built with React.", footerLine1: "All rights reserved.",
    footerLine2: "Created by Amirhossein Yavari",
  },
  fa: {
    about: "درباره", modeGenerate: "تولید دستور", modeExplain: "تحلیل دستور", modeScript: "اسکریپت‌ساز", modeError: "تحلیل خطا",
    generateSubheader: "سوال خود را برای تولید دستورات وارد کنید.", explainSubheader: "یک دستور را برای تحلیل وارد کنید.",
    scriptSubheader: "وظیفه چندمرحله‌ای را برای تولید اسکریپت توصیف کنید.", errorSubheader: "پیغام خطا را برای تحلیل وارد کنید.",
    questionLabel: "سوال شما", taskLabel: "وظیفه خود را توصیف کنید", errorLabel: "پیغام خطای خود را وارد کنید",
    questionPlaceholder: "مثلاً: چطور فایل‌های بزرگتر از ۱۰۰ مگابایت را پیدا کنم", taskPlaceholder: "مثلاً: فایل‌های log را فشرده و به tmp منتقل کن",
    errorPlaceholder: "مثلاً: bash: command not found: git", commandLabel: "دستور جهت تحلیل", commandPlaceholder: "مثلاً: grep -r 'error' /var/log",
    os: "سیستم‌عامل", osVersion: "نسخه سیستم‌عامل", cli: "رابط خط فرمان", selectVersion: "انتخاب نسخه", selectCli: "انتخاب رابط",
    generate: "تولید دستورات", explain: "تحلیل کن", generateScript: "تولید اسکریپت", analyzeError: "تحلیل خطا",
    generating: "در حال تولید...", explaining: "در حال تحلیل...", generatingScript: "در حال ساخت اسکریپت...", analyzing: "در حال تحلیل...",
    copied: "کپی شد!", copyAll: "کپی همه به عنوان اسکریپت", downloadScript: "دانلود اسکریپت", errorTitle: "خطا در دریافت اطلاعات",
    errorMessage: "پاسخی دریافت نشد. لطفاً اتصال اینترنت را بررسی کنید.", fieldRequired: "این فیلد الزامی است",
    detailedExplanation: "تحلیل دستور", scriptExplanation: "توضیحات اسکریپت", errorAnalysis: "تحلیل خطا",
    aboutMeTitle: "درباره من", aboutToolTitle: "درباره CMDGEN", aboutMeText: "من امیرحسین یاوری هستم، متولد ۱۳۸۷، علاقه‌مند به IT و ساخت ابزارهایی مثل CMDGEN.",
    aboutToolText: "CMDGEN یک دستیار هوشمند برای خط فرمان است که با React ساخته شده.", footerLine1: "تمامی حقوق محفوظ است.",
    footerLine2: "ساخته شده توسط امیرحسین یاوری",
  }
};

// OS/CLI Data
const osDetails = {
  linux: { versions: ['Ubuntu 22.04', 'Debian 11', 'Fedora 38', 'Arch Linux'], clis: ['Bash', 'Zsh', 'Fish'] },
  windows: { versions: ['Windows 11', 'Windows 10', 'Windows Server 2022'], clis: ['PowerShell', 'CMD'] },
  macos: { versions: ['Sonoma (14)', 'Ventura (13)'], clis: ['Zsh', 'Bash'] }
};

// Cache Utility
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const getCacheKey = (mode, os, userInput) => `${mode}-${os}-${userInput}`;
const setCache = (key, value) => {
  const cacheEntry = { value, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(cacheEntry));
};
const getCache = (key) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { value, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_DURATION) return value;
  localStorage.removeItem(key);
  return null;
};

// API Functions
const callApiProxy = async (payload) => {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON, but received: ${text.substring(0, 50)}...`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from API.");
    return content;
  } catch (error) {
    console.error("API Proxy fetch error:", error);
    throw error;
  }
};

const baseSystemPrompt = `You are CMDGEN, an expert command-line assistant. Provide practical, user-focused explanations. Use "فلگ" for command-line options in Persian.`;

const fetchInitialCommands = async (question, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const systemPrompt = `${baseSystemPrompt} Provide 3 practical commands in JSON format for the user's environment: OS=${os_type}, Version=${os_version}, Shell=${cli}. Language: ${langMap[language]}.`;
  const userPrompt = `Question: "${question}"`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" } };
  const cacheKey = getCacheKey('generate', os_type, question);
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const jsonString = await callApiProxy(payload);
  const commands = JSON.parse(jsonString).commands || [];
  setCache(cacheKey, commands);
  return commands;
};

const fetchExplanationForCommand = async (command, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const systemPrompt = `${baseSystemPrompt} Provide a clear Markdown explanation for the command in ${langMap[language]}. Include: "Purpose / هدف", "Breakdown / اجزاء دستور", "Usage Examples / مثال‌های کاربردی", "Pro Tip / نکته حرفه‌ای".`;
  const userPrompt = `Command: \`${command}\`. Environment: OS=${os_type}, Version=${os_version}, Shell=${cli}.`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] };
  const cacheKey = getCacheKey('explain', os_type, command);
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const explanation = await callApiProxy(payload);
  setCache(cacheKey, explanation);
  return explanation;
};

const fetchScriptForTask = async (task, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const scriptExtension = (os_type === 'windows' && cli === 'PowerShell') ? 'ps1' : (os_type === 'windows' && cli === 'CMD') ? 'bat' : 'sh';
  const systemPrompt = `${baseSystemPrompt} Generate a JSON object with a script for the task. Include: "filename" (e.g., "task.${scriptExtension}"), "script_lines" (array of code lines), "explanation". Language: ${langMap[language]}.`;
  const userPrompt = `Task: "${task}". Environment: OS=${os_type}, Version=${os_version}, Shell=${cli}.`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" } };
  const cacheKey = getCacheKey('script', os_type, task);
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const jsonString = await callApiProxy(payload);
  const scriptData = JSON.parse(jsonString);
  setCache(cacheKey, scriptData);
  return scriptData;
};

const fetchErrorAnalysis = async (errorMsg, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const systemPrompt = `${baseSystemPrompt} Analyze the error in JSON format. Include: "cause", "explanation", "solution" (array of steps, prefix commands with 'CMD:'). Language: ${langMap[language]}.`;
  const userPrompt = `Error: "${errorMsg}". Environment: OS=${os_type}, Version=${os_version}, Shell=${cli}.`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" } };
  const cacheKey = getCacheKey('error', os_type, errorMsg);
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const jsonString = await callApiProxy(payload);
  const analysisData = JSON.parse(jsonString);
  setCache(cacheKey, analysisData);
  return analysisData;
};

// Components
const CustomSelect = ({ label, value, onChange, options, placeholder, lang, error }) => (
  <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label} <span className="text-red-500">*</span></label>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500">
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className={`w-5 h-5 absolute text-gray-500 dark:text-gray-400 pointer-events-none ${lang === 'fa' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2`} />
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </motion.div>
);

const Card = ({ children, lang }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg"
    style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
  >
    {children}
  </motion.div>
);

const CommandDisplay = ({ command, onCopy, copied }) => (
  <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
    <pre className="p-4 pr-12 font-mono text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">{command}</pre>
    <button onClick={onCopy} className="absolute top-2 right-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  </div>
);

const GeneratedCommandCard = ({ command, explanation, warning, lang }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card lang={lang}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-600 dark:text-cyan-400"><Terminal size={20} /> Command</h4>
      </div>
      <CommandDisplay command={command} onCopy={handleCopy} copied={copied} />
      {explanation && <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm">{explanation}</p>}
      {warning && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 italic">{warning}</p>}
    </Card>
  );
};

const ExplanationCard = ({ explanation, lang }) => (
  <motion.div
    className="mt-8 max-w-3xl mx-auto"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    <Card lang={lang}>
      <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 mb-5"><Bot size={20} /> {translations[lang].detailedExplanation}</h3>
      <div className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
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
      className="mt-8 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card lang={lang}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-600 dark:text-cyan-400"><FileCode2 size={20} /> {filename}</h4>
          <button onClick={downloadScript} className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"><Download size={16} /> {translations[lang].downloadScript}</button>
        </div>
        <CommandDisplay command={fullScript} onCopy={handleCopy} copied={copied} />
        {explanation && <div className="mt-4"><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{translations[lang].scriptExplanation}</h4><p className="text-gray-600 dark:text-gray-300 text-sm">{explanation}</p></div>}
      </Card>
    </motion.div>
  );
};

const ErrorAnalysisCard = ({ analysis, lang }) => (
  <motion.div
    className="mt-8 max-w-3xl mx-auto"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    <Card lang={lang}>
      <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 mb-5"><ShieldAlert size={20} /> {translations[lang].errorAnalysis}</h3>
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-red-500 dark:text-red-400 mb-2">{translations[lang].cause}</h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{analysis.cause}</p>
        </div>
        <div>
          <h4 className="font-semibold text-amber-500 dark:text-amber-400 mb-2">{translations[lang].explanation}</h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{analysis.explanation}</p>
        </div>
        <div>
          <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">{translations[lang].solution}</h4>
          <div className="space-y-3">
            {analysis.solution.map((step, index) => {
              if (step.startsWith('CMD:')) {
                const command = step.substring(4).trim();
                const [copied, setCopied] = useState(false);
                const handleCopy = () => {
                  navigator.clipboard.writeText(command);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                };
                return <CommandDisplay key={index} command={command} onCopy={handleCopy} copied={copied} />;
              }
              return <p key={index} className="text-gray-600 dark:text-gray-300 text-sm">{index + 1}. {step}</p>;
            })}
          </div>
        </div>
      </div>
    </Card>
  </motion.div>
);

const AboutModal = ({ lang, onClose }) => {
  const t = translations[lang];
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">About CMDGEN</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="font-semibold text-cyan-600 dark:text-cyan-400">{t.aboutMeTitle}</h3>
            <p className="text-sm">{t.aboutMeText}</p>
          </div>
          <div>
            <h3 className="font-semibold text-cyan-600 dark:text-cyan-400">{t.aboutToolTitle}</h3>
            <p className="text-sm">{t.aboutToolText}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MobileDrawer = ({ lang, isOpen, onClose }) => {
  const t = translations[lang];
  return (
    <motion.div
      className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-900 w-64 z-40 shadow-lg ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300`}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.menu}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        <button onClick={() => { onClose(); setIsAboutModalOpen(true); }} className="flex items-center gap-2 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <Info size={20} /> {t.about}
        </button>
      </div>
    </motion.div>
  );
};

function AppContent() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [mode, setMode] = useState('generate');
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState(osDetails['linux'].versions[0]);
  const [cli, setCli] = useState(osDetails['linux'].clis[0]);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  useEffect(() => {
    document.body.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    setOsVersion(osDetails[os].versions[0]);
    setCli(osDetails[os].clis[0]);
    setResult(null);
  }, [os]);

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
      setErrors(newErrors);
      toast.error('Please fill in all required fields.');
      return;
    }
    setErrors({});
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      let responseData;
      if (mode === 'generate') {
        const commands = await fetchInitialCommands(userInput, os, osVersion, cli, lang);
        responseData = { type: 'commands', data: commands };
      } else if (mode === 'explain') {
        const explanation = await fetchExplanationForCommand(userInput, os, osVersion, cli, lang);
        responseData = { type: 'explanation', data: explanation };
      } else if (mode === 'script') {
        const scriptData = await fetchScriptForTask(userInput, os, osVersion, cli, lang);
        responseData = { type: 'script', data: scriptData };
      } else {
        const analysisData = await fetchErrorAnalysis(userInput, os, osVersion, cli, lang);
        responseData = { type: 'error', data: analysisData };
      }
      setResult(responseData);
    } catch (err) {
      setError(t.errorMessage);
      toast.error(t.errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAllCommands = () => {
    const textToCopy = result.data.map(cmd => cmd.command).join('\n');
    navigator.clipboard.writeText(textToCopy);
    toast.success(t.copied);
  };

  const currentModeData = {
    generate: { label: t.questionLabel, placeholder: t.questionPlaceholder, button: t.generate, loading: t.generating },
    explain: { label: t.commandLabel, placeholder: t.commandPlaceholder, button: t.explain, loading: t.explaining },
    script: { label: t.taskLabel, placeholder: t.taskPlaceholder, button: t.generateScript, loading: t.generatingScript },
    error: { label: t.errorLabel, placeholder: t.errorPlaceholder, button: t.analyzeError, loading: t.analyzing },
  }[mode];

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
      style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {isAboutModalOpen && <AboutModal lang={lang} onClose={() => setIsAboutModalOpen(false)} />}
      <MobileDrawer lang={lang} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDrawerOpen(!isDrawerOpen)} className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">CMDGEN</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:flex items-center bg-gray-200 dark:bg-gray-800 rounded-full p-1">
              <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-full ${lang === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</button>
              <button onClick={() => setLang('fa')} className={`px-3 py-1 rounded-full ${lang === 'fa' ? 'bg-cyan-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>FA</button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button onClick={() => setMode('generate')} className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${mode === 'generate' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}><Wand2 size={16} /> {t.modeGenerate}</button>
            <button onClick={() => setMode('explain')} className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${mode === 'explain' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}><Search size={16} /> {t.modeExplain}</button>
            <button onClick={() => setMode('script')} className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${mode === 'script' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}><FileCode2 size={16} /> {t.modeScript}</button>
            <button onClick={() => setMode('error')} className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${mode === 'error' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}><ShieldAlert size={16} /> {t.modeError}</button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">{t[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`]}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">{t[`${mode}Subheader`]}</p>
          <Card lang={lang}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <CustomSelect label={t.os} value={os} onChange={setOs} options={Object.keys(osDetails)} placeholder={t.os} lang={lang} error={errors.os} />
              <CustomSelect label={t.osVersion} value={osVersion} onChange={setOsVersion} options={osDetails[os]?.versions || []} placeholder={t.selectVersion} lang={lang} error={errors.osVersion} />
              <CustomSelect label={t.cli} value={cli} onChange={setCli} options={osDetails[os]?.clis || []} placeholder={t.selectCli} lang={lang} error={errors.cli} />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentModeData.label} <span className="text-red-500">*</span></label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={currentModeData.placeholder}
                className="w-full h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
              {errors.userInput && <p className="text-red-500 text-xs mt-1">{errors.userInput}</p>}
            </div>
            <button
              onClick={handlePrimaryAction}
              disabled={isLoading}
              className="mt-6 w-full bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-500 transition-colors"
            >
              {isLoading ? currentModeData.loading : currentModeData.button}
            </button>
          </Card>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <Card lang={lang}>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3"><ServerCrash size={20} /> {t.errorTitle}</h3>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
              </Card>
            </motion.div>
          )}
          {result?.type === 'commands' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generated Commands</h3>
                <button onClick={copyAllCommands} className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"><Copy size={16} /> {t.copyAll}</button>
              </div>
              {result.data.map((cmd, index) => (
                <GeneratedCommandCard key={index} command={cmd.command} explanation={cmd.explanation} warning={cmd.warning} lang={lang} />
              ))}
            </motion.div>
          )}
          {result?.type === 'explanation' && <ExplanationCard explanation={result.data} lang={lang} />}
          {result?.type === 'script' && <ScriptCard filename={result.data.filename} script_lines={result.data.script_lines} explanation={result.data.explanation} lang={lang} />}
          {result?.type === 'error' && <ErrorAnalysisCard analysis={result.data} lang={lang} />}
        </div>
      </main>
      <footer className="bg-white dark:bg-gray-900 py-4 text-center text-gray-600 dark:text-gray-400">
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

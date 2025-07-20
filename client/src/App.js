import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Copy, Check, ServerCrash, Wind, Apple, BrainCircuit, Bot, ChevronDown, Wand2, Search, LogIn, LogOut, User, History, Star, Sun, Moon, FileCode2, CopyPlus, Info, X, ShieldAlert, MessageSquare, Download, Menu } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, limit, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

// کانفیگ Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let auth;
let db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  toast.error("Failed to connect to Firebase services.");
  db = null;
  auth = null;
}

// Authentication Context
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      toast.error(`Auth error: ${error.message}`);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUpWithEmail = async (email, password) => {
    if (!auth) {
      toast.error("Authentication is not initialized.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      toast.success("Successfully signed up!");
    } catch (error) {
      toast.error(`Failed to sign up: ${error.message}`);
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
      toast.success("Successfully signed out!");
    } catch (error) {
      toast.error(`Failed to sign out: ${error.message}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUpWithEmail, logout }}>
      {loading ? <div className="flex justify-center items-center h-screen">Loading...</div> : children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);

// Auth Handler
const AuthHandler = () => {
  const navigate = useNavigate();
  useEffect(() => navigate("/", { replace: true }), [navigate]);
  return null;
};

// Translations
const translations = {
  en: {
    signUp: "Sign Up", logout: "Logout", history: "History", favorites: "Favorites", about: "About", feedback: "Feedback",
    loginToSave: "Sign up to save.", noHistory: "No history yet.", noFavorites: "No favorites yet.",
    modeGenerate: "Generate", modeExplain: "Explain", modeScript: "Script", modeError: "Analyze Error",
    generateSubheader: "Ask a question to generate commands.",
    explainSubheader: "Enter a command to get a detailed explanation.",
    scriptSubheader: "Describe a multi-step task to generate a script.",
    errorSubheader: "Paste an error message to understand and solve it.",
    questionLabel: "Your Question", taskLabel: "Describe your task", errorLabel: "Paste your error message here",
    questionPlaceholder: "e.g., how to find all files larger than 100MB",
    taskPlaceholder: "e.g., find all .log files in my home directory, zip them, and move the zip to /tmp",
    errorPlaceholder: "e.g., bash: command not found: git",
    commandLabel: "Command to Explain", commandPlaceholder: "e.g., grep -r 'error' /var/log",
    os: "Operating System", osVersion: "OS Version", cli: "CLI / Shell",
    selectVersion: "Select Version", selectCli: "Select Shell",
    generate: "Generate Commands", explain: "Explain Command", generateScript: "Generate Script", analyzeError: "Analyze Error",
    generating: "Generating...", explaining: "Explaining...", generatingScript: "Generating Script...", analyzing: "Analyzing...",
    copied: "Copied!", copyAll: "Copy All as Script", downloadScript: "Download Script", shareCommand: "Share Command",
    searchPlaceholder: "Search history or favorites...",
    footerLine1: "All material and intellectual property rights are reserved.",
    footerLine2: "Created by Amirhossein Yavari",
    errorTitle: "An Error Occurred",
    errorMessage: "Could not fetch a response. Please check your connection and API key, then try again.",
    fieldRequired: "This field is required",
    detailedExplanation: "Command Explanation", scriptExplanation: "Script Explanation", errorAnalysis: "Error Analysis",
    aboutMeTitle: "About Me", aboutToolTitle: "About CMDGEN",
    aboutMeText: "I'm Amirhossein Yavari, born in 2008, passionate about IT and building tools like CMDGEN.",
    aboutToolText: "CMDGEN is an intelligent assistant for command-line tasks, built with React and Firebase.",
    feedbackTitle: "Send Feedback", feedbackPlaceholder: "Your feedback helps us improve...", send: "Send", sending: "Sending...",
    feedbackSuccess: "Thank you for your feedback!", feedbackError: "Could not send feedback. Please try again later.",
    feedbackPrompt: "Enjoying CMDGEN? Help us improve by sending your feedback!", giveFeedback: "Give Feedback", dismiss: "Dismiss",
    signUpWarning: "Please provide a valid email and strong password (6-8 characters with uppercase, lowercase, numbers, and symbols). Confirm to proceed.",
    menu: "Menu",
  },
  fa: {
    signUp: "ثبت‌نام", logout: "خروج", history: "تاریخچه", favorites: "مورد علاقه‌ها", about: "درباره", feedback: "بازخورد",
    loginToSave: "برای ذخیره ثبت‌نام کنید.", noHistory: "تاریخچه‌ای وجود ندارد.", noFavorites: "موردی یافت نشد.",
    modeGenerate: "تولید دستور", modeExplain: "تحلیل دستور", modeScript: "اسکریپت‌ساز", modeError: "تحلیل خطا",
    generateSubheader: "سوال خود را برای تولید دستورات وارد کنید.",
    explainSubheader: "یک دستور را برای دریافت تحلیل کامل وارد کنید.",
    scriptSubheader: "یک وظیفه چندمرحله‌ای را برای تولید اسکریپت توصیف کنید.",
    errorSubheader: "متن کامل خطا را برای درک و حل آن وارد کنید.",
    questionLabel: "سوال شما", taskLabel: "وظیفه خود را توصیف کنید", errorLabel: "پیغام خطای خود را اینجا وارد کنید",
    questionPlaceholder: "مثلاً: چطور فایل‌های بزرگتر از ۱۰۰ مگابایت را پیدا کنم",
    taskPlaceholder: "مثلاً: تمام فایل‌های log در پوشه home را پیدا کن، آنها را فشرده و به پوشه tmp منتقل کن",
    errorPlaceholder: "مثلاً: bash: command not found: git",
    commandLabel: "دستور جهت تحلیل", commandPlaceholder: "مثلاً: grep -r 'error' /var/log",
    os: "سیستم‌عامل", osVersion: "نسخه سیستم‌عامل", cli: "رابط خط فرمان",
    selectVersion: "انتخاب نسخه", selectCli: "انتخاب رابط",
    generate: "تولید دستورات", explain: "تحلیل کن", generateScript: "تولید اسکریپت", analyzeError: "تحلیل خطا",
    generating: "در حال تولید...", explaining: "در حال تحلیل...", generatingScript: "در حال ساخت اسکریپت...", analyzing: "در حال تحلیل...",
    copied: "کپی شد!", copyAll: "کپی همه به عنوان اسکریپت", downloadScript: "دانلود اسکریپت", shareCommand: "اشتراک‌گذاری دستور",
    searchPlaceholder: "جستجو در تاریخچه یا موارد موردعلاقه...",
    footerLine1: "تمامی حقوق مادی و معنوی این اثر محفوظ است.",
    footerLine2: "ساخته شده توسط امیرحسین یاوری",
    errorTitle: "خطا در دریافت اطلاعات",
    errorMessage: "پاسخی دریافت نشد. لطفاً اتصال اینترنت و کلید API خود را بررسی کنید.",
    fieldRequired: "این فیلد الزامی است",
    detailedExplanation: "تحلیل دستور", scriptExplanation: "توضیحات اسکریپت", errorAnalysis: "تحلیل خطا",
    aboutMeTitle: "درباره من", aboutToolTitle: "درباره CMDGEN",
    aboutMeText: "من امیرحسین یاوری هستم، متولد ۱۳۸۷، در حال یادگیری فناوری اطلاعات و علاقه‌مند به ساخت ابزارهایی مثل CMDGEN.",
    aboutToolText: "CMDGEN یک دستیار هوشمند برای کارهای خط فرمان است که با React و Firebase ساخته شده است.",
    feedbackTitle: "ارسال بازخورد", feedbackPlaceholder: "نظر شما به ما در بهبود این ابزار کمک می‌کند...", send: "ارسال", sending: "در حال ارسال...",
    feedbackSuccess: "از بازخورد شما سپاسگزاریم!", feedbackError: "ارسال بازخورد با مشکل مواجه شد. لطفاً بعداً تلاش کنید.",
    feedbackPrompt: "از کار با CMDGEN لذت می‌برید؟ با ارسال نظر خود به ما کمک کنید!", giveFeedback: "ارسال بازخورد", dismiss: "بعداً",
    signUpWarning: "لطفاً یک ایمیل معتبر و رمز عبور قوی (۶ تا ۸ کاراکتر با حروف بزرگ، کوچک، اعداد و نمادها) وارد کنید. برای ادامه تأیید کنید.",
    menu: "منو",
  }
};

// OS/CLI Data
const osDetails = {
  linux: { versions: ['Ubuntu 22.04', 'Debian 11', 'Fedora 38', 'Arch Linux', 'Generic Linux'], clis: ['Bash', 'Zsh', 'Fish'] },
  windows: { versions: ['Windows 11', 'Windows 10', 'Windows 7', 'Windows Server 2022'], clis: ['PowerShell', 'CMD'] },
  macos: { versions: ['Sonoma (14)', 'Ventura (13)', 'Monterey (12)'], clis: ['Zsh', 'Bash'] }
};

// API & DB Functions
const callApiProxy = async (payload) => {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
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
  const jsonString = await callApiProxy(payload);
  return JSON.parse(jsonString).commands || [];
};

const fetchExplanationForCommand = async (command, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const systemPrompt = `${baseSystemPrompt} Provide a clear Markdown explanation for the command in ${langMap[language]}. Include: "Purpose / هدف", "Breakdown / اجزاء دستور", "Usage Examples / مثال‌های کاربردی", "Pro Tip / نکته حرفه‌ای".`;
  const userPrompt = `Command: \`${command}\`. Environment: OS=${os_type}, Version=${os_version}, Shell=${cli}.`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] };
  return await callApiProxy(payload);
};

const fetchScriptForTask = async (task, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const scriptExtension = (os_type === 'windows' && cli === 'PowerShell') ? 'ps1' : (os_type === 'windows' && cli === 'CMD') ? 'bat' : 'sh';
  const systemPrompt = `${baseSystemPrompt} Generate a JSON object with a script for the task. Include: "filename" (e.g., "task.${scriptExtension}"), "script_lines" (array of code lines), "explanation". Language: ${langMap[language]}.`;
  const userPrompt = `Task: "${task}". Environment: OS=${os_type}, Version=${os_version}, Shell=${cli}.`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" } };
  const jsonString = await callApiProxy(payload);
  return JSON.parse(jsonString);
};

const fetchErrorAnalysis = async (errorMsg, os_type, os_version, cli, language) => {
  const langMap = { 'fa': 'Persian', 'en': 'English' };
  const systemPrompt = `${baseSystemPrompt} Analyze the error in JSON format. Include: "cause", "explanation", "solution" (array of steps, prefix commands with 'CMD:'). Language: ${langMap[language]}.`;
  const userPrompt = `Error: "${errorMsg}". Environment: OS=${os_type}, Version=${os_version}, Shell=${cli}.`;
  const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" } };
  const jsonString = await callApiProxy(payload);
  return JSON.parse(jsonString);
};

const dbAction = async (userId, collectionName, action, data = {}) => {
  if (!userId || !db) return;
  const collectionRef = collection(db, "users", userId, collectionName);
  try {
    if (action === 'add') {
      await addDoc(collectionRef, { ...data, createdAt: new Date() });
    } else if (action === 'delete') {
      await deleteDoc(doc(db, "users", userId, collectionName, data.id));
    }
  } catch (error) {
    toast.error(`Failed to perform ${collectionName} action: ${error.message}`);
  }
};

// Components
const CustomSelect = ({ label, value, onChange, options, placeholder, disabled, lang, error }) => (
  <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
    <label className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${disabled ? 'opacity-50' : ''}`}>{label} <span className="text-red-500">*</span></label>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full appearance-none bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500">
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className={`w-5 h-5 absolute text-gray-500 dark:text-gray-400 pointer-events-none ${lang === 'fa' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${disabled ? 'opacity-50' : ''}`} />
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </motion.div>
);

const Panel = ({ lang, onSelect, title, icon, collectionName, noItemsText }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || !db) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "users", user.uid, collectionName), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    }, (error) => {
      toast.error(`Failed to fetch ${collectionName}: ${error.message}`);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, collectionName]);

  const filteredItems = items.filter(item => item.userInput.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-4 flex flex-col" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">{icon} {title}</h3>
      <input
        type="text"
        placeholder={translations[lang].searchPlaceholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 mb-4"
      />
      {!user ? <div className="text-center text-gray-500 dark:text-gray-400 mt-8">{translations[lang].loginToSave}</div>
        : loading ? <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
        : filteredItems.length === 0 ? <div className="text-center text-gray-500 dark:text-gray-400">{noItemsText}</div>
        : (
          <ul className="space-y-2 overflow-y-auto">
            {filteredItems.map(item => (
              <li key={item.id}>
                <button onClick={() => onSelect(item)} className="w-full text-left p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700">
                  <p className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold truncate">{item.mode === 'generate' ? 'Q:' : item.mode === 'script' ? 'Task:' : 'Cmd:'} {item.userInput}</p>
                  {item.command && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.command}</p>}
                </button>
              </li>
            ))}
          </ul>
        )}
    </motion.div>
  );
};

const Header = ({ lang, setLang, theme, toggleTheme, onHistoryToggle, onFavoritesToggle, onAboutToggle, onFeedbackToggle, onMenuToggle }) => {
  const { user, signUpWithEmail, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const t = translations[lang];

  const handleSignUpClick = () => setShowWarning(true);
  const handleConfirmWarning = () => { setShowWarning(false); setIsSignUpOpen(true); };
  const handleCancelWarning = () => setShowWarning(false);

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    await signUpWithEmail(email, password);
    setIsSignUpOpen(false);
    setEmail('');
    setPassword('');
  };

  return (
    <motion.header
      className="py-3 px-4 md:px-8 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-20"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`container mx-auto flex items-center ${lang === 'fa' ? 'flex-row-reverse' : 'flex-row'} justify-between`}>
        <div className="flex items-center gap-2">
          <button onClick={onMenuToggle} className="md:hidden p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-cyan-500" />
            <h1 className="text-xl md:text-2xl font-bold tracking-wider text-gray-800 dark:text-white">CMDGEN</h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={onHistoryToggle} title={t.history} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"><History size={16}/></button>
          <button onClick={onFavoritesToggle} title={t.favorites} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"><Star size={16}/></button>
          <button onClick={onFeedbackToggle} title={t.feedback} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"><MessageSquare size={16}/></button>
          <button onClick={onAboutToggle} title={t.about} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"><Info size={16}/></button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
            {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          <div className="flex items-center bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full p-1">
            <button onClick={() => setLang('en')} className={`px-3 py-1 text-sm rounded-full ${lang === 'en' ? 'bg-cyan-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>EN</button>
            <button onClick={() => setLang('fa')} className={`px-3 py-1 text-sm rounded-full ${lang === 'fa' ? 'bg-cyan-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>FA</button>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || 'https://via.placeholder.com/32'} alt="User" className="w-8 h-8 rounded-full" />
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden md:block">{user.displayName || user.email || 'User'}</span>
              <button onClick={logout} className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 dark:text-red-300"><LogOut size={16}/></button>
            </div>
          ) : (
            <div className="relative group">
              <button onClick={handleSignUpClick} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-700">
                <LogIn size={16} /> {t.signUp}
              </button>
              {showWarning && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t.signUpWarning}</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={handleConfirmWarning} className="px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">Confirm</button>
                    <button onClick={handleCancelWarning} className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">Cancel</button>
                  </div>
                </div>
              )}
              {isSignUpOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <form onSubmit={handleSignUpSubmit} className="p-4 space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2"
                    />
                    <button type="submit" className="w-full bg-cyan-600 text-white px-3 py-2 rounded-lg hover:bg-cyan-700">
                      {t.signUp}
                    </button>
                    <button type="button" onClick={() => setIsSignUpOpen(false)} className="w-full text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mt-2">
                      Cancel
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

const Card = ({ children, lang }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="card bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg"
    style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
  >
    {children}
  </motion.div>
);

const CommandDisplay = ({ command, onCopy, copied }) => (
  <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg">
    <pre className="p-4 pr-12 font-mono text-sm text-gray-800 dark:text-gray-200 break-all whitespace-pre-wrap">{command}</pre>
    <button onClick={onCopy} className="absolute top-2 right-2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-200 dark:bg-gray-700/50 rounded-lg">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  </div>
);

const GeneratedCommandCard = ({ command, explanation, warning, lang, onFavoriteToggle, isFavorite, onShare }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card lang={lang}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400"><Terminal className="w-4 h-4" /><span>Command</span></div>
        <div className="flex items-center gap-2">
          <button onClick={onShare} className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">{translations[lang].shareCommand}</button>
          <button onClick={onFavoriteToggle} className="p-1.5 text-gray-400 hover:text-amber-400">
            <Star size={16} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
          </button>
        </div>
      </div>
      <CommandDisplay command={command} onCopy={handleCopy} copied={copied} />
      <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{explanation}</p>
      {warning && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400/80 italic">{warning}</p>}
    </Card>
  );
};

const ExplanationCard = ({ explanation, lang }) => (
  <motion.div
    className="mt-10 max-w-3xl mx-auto"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
  >
    <Card lang={lang}>
      <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-300 flex items-center gap-2 mb-4"><Bot size={20} /> {translations[lang].detailedExplanation}</h3>
      <div className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
    </Card>
  </motion.div>
);

const ScriptCard = ({ filename, script_lines = [], explanation, lang, onFavoriteToggle, isFavorite, onShare }) => {
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
      className="mt-10 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card lang={lang}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400"><FileCode2 className="w-4 h-4" /><span>{filename}</span></div>
          <div className="flex items-center gap-2">
            <button onClick={downloadScript} className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"><Download size={16} /> {translations[lang].downloadScript}</button>
            <button onClick={onShare} className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">{translations[lang].shareCommand}</button>
            <button onClick={onFavoriteToggle} className="p-1.5 text-gray-400 hover:text-amber-400">
              <Star size={16} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
          </div>
        </div>
        <CommandDisplay command={fullScript} onCopy={handleCopy} copied={copied} />
        <div className="mt-4">
          <h4 className="font-bold text-gray-800 dark:text-gray-200">{translations[lang].scriptExplanation}</h4>
          <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">{explanation}</p>
        </div>
      </Card>
    </motion.div>
  );
};

const ErrorAnalysisCard = ({ analysis, lang }) => (
  <motion.div
    className="mt-10 max-w-3xl mx-auto"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
  >
    <Card lang={lang}>
      <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-300 flex items-center gap-2 mb-4"><ShieldAlert size={20} /> {translations[lang].errorAnalysis}</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-red-500 dark:text-red-400">{translations[lang].cause}</h4>
          <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">{analysis.cause}</p>
        </div>
        <div>
          <h4 className="font-bold text-amber-500 dark:text-amber-400">{translations[lang].explanation}</h4>
          <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">{analysis.explanation}</p>
        </div>
        <div>
          <h4 className="font-bold text-green-600 dark:text-green-400">{translations[lang].solution}</h4>
          <div className="mt-2 space-y-2">
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
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">About CMDGEN</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20}/></button>
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">{t.aboutMeTitle}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t.aboutMeText}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">{t.aboutToolTitle}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t.aboutToolText}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FeedbackModal = ({ lang, onClose }) => {
  const t = translations[lang];
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setStatus('sending');
    try {
      await dbAction(auth.currentUser?.uid, 'feedback', 'add', { text: feedback });
      setStatus('success');
      toast.success(t.feedbackSuccess);
      setTimeout(onClose, 2000);
    } catch (error) {
      setStatus('error');
      toast.error(t.feedbackError);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t.feedbackTitle}</h2>
        {status === 'success' ? (
          <p className="text-green-600 dark:text-green-400">{t.feedbackSuccess}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t.feedbackPlaceholder}
              className="w-full h-32 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-3"
              disabled={status === 'sending'}
            />
            {status === 'error' && <p className="text-red-500 text-sm mt-2">{t.feedbackError}</p>}
            <div className="flex justify-end gap-4 mt-4">
              <button type="button" onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
              <button type="submit" disabled={status === 'sending'} className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 disabled:bg-gray-500">
                {status === 'sending' ? t.sending : t.send}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};

const MobileDrawer = ({ lang, isOpen, onClose, onHistoryToggle, onFavoritesToggle, onAboutToggle, onFeedbackToggle }) => {
  const t = translations[lang];
  return (
    <motion.div
      className={`mobile-drawer bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 ${isOpen ? 'open' : ''}`}
      initial={{ x: '-100%' }}
      animate={{ x: isOpen ? 0 : '-100%' }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t.menu}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <button onClick={() => { onHistoryToggle(); onClose(); }} className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400">
            <History size={20} /> {t.history}
          </button>
          <button onClick={() => { onFavoritesToggle(); onClose(); }} className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400">
            <Star size={20} /> {t.favorites}
          </button>
          <button onClick={() => { onFeedbackToggle(); onClose(); }} className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400">
            <MessageSquare size={20} /> {t.feedback}
          </button>
          <button onClick={() => { onAboutToggle(); onClose(); }} className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400">
            <Info size={20} /> {t.about}
          </button>
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
  const [osVersion, setOsVersion] = useState(osDetails['linux'].versions[0]);
  const [cli, setCli] = useState(osDetails['linux'].clis[0]);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user } = useAuth();
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

  const handlePanelToggle = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
    setIsDrawerOpen(false);
  };

  const handleHistorySelect = (item) => {
    setMode(item.mode);
    setOs(item.os);
    setOsVersion(item.osVersion);
    setCli(item.cli);
    setUserInput(item.userInput || '');
    setResult(null);
    setActivePanel(null);
    setIsDrawerOpen(false);
    handlePrimaryAction();
  };

  const handleFavoriteToggle = async (itemData, itemType) => {
    if (!user) {
      toast.error(t.loginToSave);
      return;
    }
    const itemIdentifier = itemData.command || (itemData.script_lines && itemData.script_lines.join('\n')) || itemData.userInput;
    if (!itemIdentifier) return;
    const favQuery = query(collection(db, "users", user.uid, "favorites"), where("identifier", "==", itemIdentifier));
    const querySnapshot = await getDocs(favQuery);
    if (querySnapshot.empty) {
      await dbAction(user.uid, 'favorites', 'add', { ...itemData, identifier: itemIdentifier, type: itemType, userInput: userInput || itemIdentifier, mode, os, osVersion, cli });
      toast.success(t.favorites + " added!");
    } else {
      querySnapshot.forEach(doc => dbAction(user.uid, 'favorites', 'delete', { id: doc.id }));
      toast.success(t.favorites + " removed!");
    }
  };

  const handleShare = (itemData) => {
    const itemIdentifier = itemData.command || (itemData.script_lines && itemData.script_lines.join('\n')) || itemData.userInput;
    const shareUrl = `https://cmdgen.onrender.com/share?content=${encodeURIComponent(itemIdentifier)}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(t.shareCommand + ' copied to clipboard!');
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
      await dbAction(user?.uid, 'history', 'add', { mode, os, osVersion, cli, userInput });
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
      className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white"
      style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {isAboutModalOpen && <AboutModal lang={lang} onClose={() => setIsAboutModalOpen(false)} />}
      {isFeedbackModalOpen && <FeedbackModal lang={lang} onClose={() => setIsFeedbackModalOpen(false)} />}
      <MobileDrawer
        lang={lang}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onHistoryToggle={() => handlePanelToggle('history')}
        onFavoritesToggle={() => handlePanelToggle('favorites')}
        onAboutToggle={() => setIsAboutModalOpen(true)}
        onFeedbackToggle={() => setIsFeedbackModalOpen(true)}
      />
      <aside className={`hidden md:block bg-white/80 dark:bg-gray-900/80 transition-all duration-300 ${activePanel ? 'w-72' : 'w-0'} ${lang === 'fa' ? 'border-l' : 'border-r'} border-gray-200 dark:border-gray-800 overflow-hidden`}>
        {activePanel === 'history' && <Panel lang={lang} onSelect={handleHistorySelect} title={t.history} icon={<History size={20}/>} collectionName="history" noItemsText={t.noHistory} />}
        {activePanel === 'favorites' && <Panel lang={lang} onSelect={handleHistorySelect} title={t.favorites} icon={<Star size={20}/>} collectionName="favorites" noItemsText={t.noFavorites} />}
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Header
          lang={lang}
          setLang={setLang}
          theme={theme}
          toggleTheme={toggleTheme}
          onHistoryToggle={() => handlePanelToggle('history')}
          onFavoritesToggle={() => handlePanelToggle('favorites')}
          onAboutToggle={() => setIsAboutModalOpen(true)}
          onFeedbackToggle={() => setIsFeedbackModalOpen(true)}
          onMenuToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex flex-wrap justify-center items-center bg-gray-200 dark:bg-gray-800 p-1 rounded-full mb-6 gap-2">
              <button onClick={() => setMode('generate')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 ${mode === 'generate' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <Wand2 size={16} /> {t.modeGenerate} </button>
              <button onClick={() => setMode('explain')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 ${mode === 'explain' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <Search size={16} /> {t.modeExplain} </button>
              <button onClick={() => setMode('script')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 ${mode === 'script' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <FileCode2 size={16} /> {t.modeScript} </button>
              <button onClick={() => setMode('error')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 ${mode === 'error' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <ShieldAlert size={16} /> {t.modeError} </button>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{t[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`]}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t[`${mode}Subheader`]}</p>
            <Card lang={lang}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <CustomSelect
                  label={t.os}
                  value={os}
                  onChange={setOs}
                  options={Object.keys(osDetails)}
                  placeholder={t.os}
                  lang={lang}
                  error={errors.os}
                />
                <CustomSelect
                  label={t.osVersion}
                  value={osVersion}
                  onChange={setOsVersion}
                  options={osDetails[os]?.versions || []}
                  placeholder={t.selectVersion}
                  lang={lang}
                  error={errors.osVersion}
                />
                <CustomSelect
                  label={t.cli}
                  value={cli}
                  onChange={setCli}
                  options={osDetails[os]?.clis || []}
                  placeholder={t.selectCli}
                  lang={lang}
                  error={errors.cli}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentModeData.label} <span className="text-red-500">*</span></label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={currentModeData.placeholder}
                  className="w-full h-24 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500"
                />
                {errors.userInput && <p className="text-red-500 text-xs mt-1">{errors.userInput}</p>}
              </div>
              <button
                onClick={handlePrimaryAction}
                disabled={isLoading}
                className="mt-4 bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-500"
              >
                {isLoading ? currentModeData.loading : currentModeData.button}
              </button>
            </Card>
            {error && (
              <Card lang={lang}>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-4"><ServerCrash size={20} /> {t.errorTitle}</h3>
                <p className="text-gray-600 dark:text-gray-300">{error}</p>
              </Card>
            )}
            {result?.type === 'commands' && (
              <motion.div
                className="mt-10 space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Generated Commands</h3>
                  <button onClick={copyAllCommands} className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-2">
                    <CopyPlus size={16} /> {t.copyAll}
                  </button>
                </div>
                {result.data.map((cmd, index) => (
                  <GeneratedCommandCard
                    key={index}
                    command={cmd.command}
                    explanation={cmd.explanation}
                    warning={cmd.warning}
                    lang={lang}
                    onFavoriteToggle={() => handleFavoriteToggle(cmd, 'command')}
                    isFavorite={!!favorites.find(fav => fav.command === cmd.command)}
                    onShare={() => handleShare(cmd)}
                  />
                ))}
              </motion.div>
            )}
            {result?.type === 'explanation' && <ExplanationCard explanation={result.data} lang={lang} />}
            {result?.type === 'script' && (
              <ScriptCard
                filename={result.data.filename}
                script_lines={result.data.script_lines}
                explanation={result.data.explanation}
                lang={lang}
                onFavoriteToggle={() => handleFavoriteToggle(result.data, 'script')}
                isFavorite={!!favorites.find(fav => fav.identifier === result.data.script_lines.join('\n'))}
                onShare={() => handleShare(result.data)}
              />
            )}
            {result?.type === 'error' && <ErrorAnalysisCard analysis={result.data} lang={lang} />}
          </div>
        </main>
        <footer className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          <p>{t.footerLine1}</p>
          <p>{t.footerLine2}</p>
        </footer>
      </div>
    </motion.div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/auth/*" element={<AuthHandler />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

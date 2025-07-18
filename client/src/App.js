import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Terminal, Copy, Check, ServerCrash, Wind, Apple, BrainCircuit, Bot, ChevronDown, Wand2, Search, LogIn, LogOut, User, History, Star, Sun, Moon, FileCode2, CopyPlus, Info, X, ShieldAlert, MessageSquare } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, limit, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// --- Initialize Firebase ---
let app;
let auth;
let db;
if (firebaseConfig.apiKey) {
    try {
        console.log("Initializing Firebase with config:", firebaseConfig);
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error("Firebase initialization error:", error);
        toast.error("Failed to initialize Firebase.");
    }
}

// --- Authentication Context ---
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            console.error("Auth is not initialized.");
            toast.error("Authentication is not initialized.");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth state changed:", user ? { uid: user.uid, displayName: user.displayName, email: user.email } : "No user");
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        if (!auth) {
            console.error("Auth is not initialized.");
            toast.error("Authentication is not initialized.");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            console.log("Starting Google login with redirect...");
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Google login error:", { code: error.code, message: error.message, details: error });
            toast.error(`Failed to sign in: ${error.code} - ${error.message}`);
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            toast.success("Successfully signed out!");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error(`Failed to sign out: ${error.message}`);
        }
    };

    const value = { user, loading, loginWithGoogle, logout };
    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex justify-center items-center h-screen">
                    <div className="text-gray-600 dark:text-gray-300">Loading...</div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);

// --- Auth Handler Component ---
const AuthHandler = () => {
    const { setUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Processing redirect in AuthHandler at:", new Date().toISOString());
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    console.log("Redirect result:", {
                        uid: result.user.uid,
                        displayName: result.user.displayName,
                        email: result.user.email
                    });
                    setUser(result.user);
                    toast.success("Successfully signed in!");
                    navigate("/", { replace: true });
                } else {
                    console.log("No redirect result available. Possible reasons: User cancelled login or already processed.");
                    navigate("/", { replace: true });
                }
            })
            .catch((error) => {
                console.error("Error in auth handler:", {
                    code: error.code,
                    message: error.message,
                    details: error
                });
                toast.error(`Failed to sign in: ${error.code} - ${error.message}`);
                navigate("/", { replace: true });
            });
    }, [navigate, setUser]);

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="text-gray-600 dark:text-gray-300">Processing login...</div>
        </div>
    );
};

// --- Translations ---
const translations = {
    en: {
        login: "Login with Google", logout: "Logout", history: "History", favorites: "Favorites", about: "About", feedback: "Feedback",
        loginToSave: "Login to save.", noHistory: "No history yet.", noFavorites: "No favorites yet.",
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
        copied: "Copied!", copyAll: "Copy All as Script",
        footerLine1: "All material and intellectual property rights are reserved.",
        footerLine2: "Created by Amirhossein Yavari",
        errorTitle: "An Error Occurred",
        errorMessage: "Could not fetch a response. Please check your connection and API key, then try again.",
        detailedExplanation: "Command Explanation", scriptExplanation: "Script Explanation", errorAnalysis: "Error Analysis",
        aboutMeTitle: "About Me", aboutToolTitle: "About CMDGEN",
        aboutMeText: "I'm Amirhossein Yavari, born in 2008, and I'm currently learning about the world of Information Technology (IT). I'm passionate about building tools that can help others, and CMDGen is one of my first projects on this journey. My goal is to continue creating useful tools that make technology easier for everyone.",
        aboutToolText: "CMDGEN is an intelligent assistant designed to bridge the gap between human language and the command line. Whether you're a seasoned developer or just starting, CMDGEN empowers you to accomplish tasks efficiently without needing to memorize complex syntax. It features powerful modes like **Generate**, **Explain**, **Script**, and **Error Analysis**. Powered by advanced AI and built with a modern tech stack including React and Firebase, CMDGEN is your smart, reliable partner for mastering the command line.",
        feedbackTitle: "Send Feedback", feedbackPlaceholder: "Your feedback helps us improve...", send: "Send", sending: "Sending...", feedbackSuccess: "Thank you for your feedback!", feedbackError: "Could not send feedback. Please try again later.",
        feedbackPrompt: "Enjoying CMDGEN? Help us improve by sending your feedback!", giveFeedback: "Give Feedback", dismiss: "Dismiss",
    },
    fa: {
        login: "ورود با گوگل", logout: "خروج", history: "تاریخچه", favorites: "مورد علاقه‌ها", about: "درباره", feedback: "بازخورد",
        loginToSave: "برای ذخیره وارد شوید.", noHistory: "تاریخچه‌ای وجود ندارد.", noFavorites: "موردی یافت نشد.",
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
        os: "سیستم‌عامل", osVersion: "نسخه سیستم‌عامل", cli: "رابط خط فرمان (CLI)",
        selectVersion: "انتخاب نسخه", selectCli: "انتخاب رابط",
        generate: "تولید دستورات", explain: "تحلیل کن", generateScript: "تولید اسکریپت", analyzeError: "تحلیل خطا",
        generating: "در حال تولید...", explaining: "در حال تحلیل...", generatingScript: "در حال ساخت اسکریپت...", analyzing: "در حال تحلیل...",
        copied: "کپی شد!", copyAll: "کپی همه به عنوان اسکریپت",
        footerLine1: "تمامی حقوق مادی و معنوی این اثر محفوظ است.",
        footerLine2: "ساخته شده توسط امیرحسین یاوری",
        errorTitle: "خطا در دریافت اطلاعات",
        errorMessage: "پاسخی دریافت نشد. لطفاً اتصال اینترنت و کلید API خود را بررسی کرده و دوباره تلاش کنید.",
        detailedExplanation: "تحلیل دستور", scriptExplanation: "توضیحات اسکریپت", errorAnalysis: "تحلیل خطا",
        aboutMeTitle: "درباره من", aboutToolTitle: "درباره CMDGEN",
        aboutMeText: "من امیرحسین یاوری هستم، متولد ۱۳۸۷ و در حال یادگیری در دنیای فناوری اطلاعات (IT) هستم. به ساخت ابزارهایی که به دیگران کمک می‌کند علاقه‌مندم و CMDGen یکی از اولین پروژه‌های من در این مسیر است. هدفم این است که به ساخت ابزارهای مفید که تکنولوژی را برای همه آسان‌تر می‌کنند، ادامه دهم.",
        aboutToolText: "CMDGEN یک دستیار هوشمند است که برای پر کردن شکاف بین زبان انسان و خط فرمان طراحی شده است. چه یک توسعه‌دهنده باتجربه باشید و چه در ابتدای راه، CMDGEN شما را قادر می‌سازد تا وظایف خود را به طور موثر و بدون نیاز به حفظ کردن دستورات پیچیده انجام دهید. این ابزار دارای حالت‌های قدرتمندی مانند **تولید**، **تحلیل**، **اسکریپت‌ساز** و **تحلیل خطا** است. CMDGEN با بهره‌گیری از هوش مصنوعی پیشرفته و ساخته شده بر پایه فناوری‌های مدرن مانند React و Firebase، شریک هوشمند و قابل اعتماد شما برای تسلط بر خط فرمان است.",
        feedbackTitle: "ارسال بازخورد", feedbackPlaceholder: "نظر شما به ما در بهبود این ابزار کمک می‌کند...", send: "ارسال", sending: "در حال ارسال...", feedbackSuccess: "از بازخورد شما سپاسگزاریم!", feedbackError: "ارسال بازخورد با مشکل مواجه شد. لطفاً بعداً تلاش کنید.",
        feedbackPrompt: "از کار با CMDGEN لذت می‌برید؟ با ارسال نظر خود به ما در بهبود آن کمک کنید!", giveFeedback: "ارسال بازخورد", dismiss: "بعداً",
    }
};

// --- OS/CLI Data ---
const osDetails = {
    linux: { versions: ['Ubuntu 22.04', 'Debian 11', 'Fedora 38', 'Arch Linux', 'Generic Linux'], clis: ['Bash', 'Zsh', 'Fish'] },
    windows: { versions: ['Windows 11', 'Windows 10', 'Windows 7', 'Windows Server 2022'], clis: ['PowerShell', 'CMD'] },
    macos: { versions: ['Sonoma (14)', 'Ventura (13)', 'Monterey (12)'], clis: ['Zsh', 'Bash'] }
};

// --- API & DB Functions ---
const callApiProxy = async (payload) => {
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Proxy Error:", response.status, errorBody);
        throw new Error(`API request failed: ${response.status}. ${errorBody}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Received an empty response from the API.");
    return content;
};

const baseSystemPrompt = `You are an expert command-line assistant, CMDGEN. Your explanations must be practical and user-focused. Explain *why* a user would do this and what the real-world outcome is.
**PERSIAN LANGUAGE QUALITY & CHARACTER CHECK (ABSOLUTELY CRITICAL):** When the language is Persian, you MUST use fluent, natural, and professional Persian. Before finalizing your response, meticulously review all Persian text. It must NOT contain any non-Persian characters (like Chinese: 旗, Japanese, Vietnamese, etc.). The correct Persian term for a command-line option is "فلگ".`;

const fetchInitialCommands = async (question, os_type, os_version, cli, language) => {
    const langMap = { 'fa': 'Persian', 'en': 'English' };
    const systemPrompt = `${baseSystemPrompt} Your task is to provide 3 practical commands based on the user's request, tailored to their environment.
    **CRITICAL INSTRUCTIONS:**
    1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object.
    2.  **JSON STRUCTURE:** The JSON must have a root key "commands", an array of THREE objects. Each object must have "command", "explanation", and "warning" keys.
    3.  **JSON VALIDITY:** All string values inside the JSON must be properly escaped.
    4.  **ENVIRONMENT:** The commands MUST be perfectly suited for the specified OS, OS Version, and CLI/Shell.`;
    const userPrompt = `User's environment: OS=${os_type}, Version=${os_version}, Shell=${cli}. Language for response: ${langMap[language]}. User's question: "${question}"`;
    const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" }, temperature: 0.7 };
    const jsonString = await callApiProxy(payload);
    const parsedContent = JSON.parse(jsonString);
    return parsedContent.commands || [];
};

const fetchExplanationForCommand = async (commandToExplain, os_type, os_version, cli, language) => {
    const langMap = { 'fa': 'Persian', 'en': 'English' };
    const systemPrompt = `${baseSystemPrompt} Your task is to provide a clear, comprehensive, and well-structured explanation for the given command, tailored to the user's specific environment.
    **CRITICAL INSTRUCTIONS:**
    1.  **Markdown Format:** Your entire response must be in Markdown.
    2.  **Structure:** The explanation MUST include these exact headings in the requested language: "Purpose / هدف", "Breakdown / اجزاء دستور", "Usage Examples / مثال‌های کاربردی", and "Pro Tip / نکته حرفه‌ای".
    3.  **OS-SPECIFIC EXAMPLES:** The examples in "Usage Examples" MUST be relevant and correct for the specified OS (${os_type}) and Shell (${cli}).`;
    const userPrompt = `User's environment: OS=${os_type}, Version=${os_version}, Shell=${cli}. Please explain this command: \`${commandToExplain}\``;
    const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.5 };
    return await callApiProxy(payload);
};

const fetchScriptForTask = async (task, os_type, os_version, cli, language) => {
    const langMap = { 'fa': 'Persian', 'en': 'English' };
    const scriptExtension = (os_type === 'windows' && cli === 'PowerShell') ? 'ps1' : (os_type === 'windows' && cli === 'CMD') ? 'bat' : 'sh';
    const systemPrompt = `${baseSystemPrompt} Your task is to generate a complete, executable script to accomplish a multi-step task, tailored to the user's environment.
    **CRITICAL INSTRUCTIONS:**
    1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object.
    2.  **JSON STRUCTURE:** The JSON must have three keys: "filename" (string, e.g., "cleanup_logs.${scriptExtension}"), "script_lines" (an array of strings, where each string is one line of the script), and "explanation" (string, a brief description of what the script does and how to use it, in the requested language).
    3.  **Script Content:** The script should be well-commented and robust. Do not include newline characters like \\n inside the strings in the script_lines array. Each element of the array should be a single, clean line of code.`;
    const userPrompt = `User's environment: OS=${os_type}, Version=${os_version}, Shell=${cli}. Language for response: ${langMap[language]}. User's task: "${task}"`;
    const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" }, temperature: 0.7 };
    const jsonString = await callApiProxy(payload);
    return JSON.parse(jsonString);
};

const fetchErrorAnalysis = async (errorMsg, os_type, os_version, cli, language) => {
    const langMap = { 'fa': 'Persian', 'en': 'English' };
    const systemPrompt = `${baseSystemPrompt} You are an expert error diagnostician. Your task is to analyze a command-line error message and provide a clear, actionable solution.
    **CRITICAL INSTRUCTIONS:**
    1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object.
    2.  **JSON STRUCTURE:** The JSON must have three keys: "cause" (string, a brief explanation of the likely cause), "explanation" (string, a more detailed but simple explanation of the problem), and "solution" (an array of strings, where each string is a step in the solution. If a step is a command, prefix it with 'CMD:').
    3.  **LANGUAGE:** The entire response MUST be in the requested language (${langMap[language]}).`;
    const userPrompt = `User's environment: OS=${os_type}, Version=${os_version}, Shell=${cli}. Language for response: ${langMap[language]}. Error message: "${errorMsg}"`;
    const payload = { model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], response_format: { type: "json_object" }, temperature: 0.5 };
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
        console.error(`Error with ${collectionName}:`, error);
        toast.error(`Failed to perform ${collectionName} action: ${error.message}`);
    }
};

// --- Components ---
const CustomSelect = ({ label, value, onChange, options, placeholder, disabled, lang }) => (
    <div className="flex flex-col gap-2">
        <label className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${disabled ? 'opacity-50' : ''}`}>{label}</label>
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full appearance-none bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-colors disabled:opacity-50">
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className={`w-5 h-5 absolute text-gray-500 dark:text-gray-400 pointer-events-none ${lang === 'fa' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${disabled ? 'opacity-50' : ''}`} />
        </div>
    </div>
);

const Panel = ({ lang, onSelect, title, icon, collectionName, noItemsText }) => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

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
            console.error(`Error fetching ${collectionName}:`, error);
            toast.error(`Failed to fetch ${collectionName}: ${error.message}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, collectionName]);

    return (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">{icon} {title}</h3>
            {!user ? <div className="text-center text-gray-500 dark:text-gray-400 mt-8">{translations[lang].loginToSave}</div>
                : loading ? <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
                : items.length === 0 ? <div className="text-center text-gray-500 dark:text-gray-400">{noItemsText}</div>
                : (
                    <ul className="space-y-2 overflow-y-auto">
                        {items.map(item => (
                            <li key={item.id}>
                                <button onClick={() => onSelect(item)} className="w-full text-left p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                                    <p className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold truncate">
                                        {item.mode === 'generate' ? 'Q:' : item.mode === 'script' ? 'Task:' : 'Cmd:'} {item.userInput}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.os} / {item.cli}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
};

const Header = ({ lang, setLang, theme, toggleTheme, onHistoryToggle, onFavoritesToggle, onAboutToggle, onFeedbackToggle }) => {
    const { user, loginWithGoogle, logout } = useAuth();
    const t = translations[lang];
    console.log("Header: Current user:", user ? { uid: user.uid, displayName: user.displayName, email: user.email } : "No user");

    return (
        <header className="py-3 px-4 md:px-8 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-20">
            <div className={`container mx-auto flex items-center ${lang === 'fa' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex-1 flex items-center gap-4" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-8 h-8 text-cyan-500" />
                        <h1 className="text-2xl font-bold tracking-wider text-gray-800 dark:text-white">CMDGEN</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onHistoryToggle} title={t.history} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><History size={16}/></button>
                        <button onClick={onFavoritesToggle} title={t.favorites} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><Star size={16}/></button>
                        <button onClick={onFeedbackToggle} title={t.feedback} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><MessageSquare size={16}/></button>
                        <button onClick={onAboutToggle} title={t.about} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><Info size={16}/></button>
                    </div>
                </div>
                <div className="flex-none flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
                    </button>
                    <div className="flex items-center bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full p-1">
                        <button onClick={() => setLang('en')} className={`px-3 py-1 text-sm rounded-full transition-colors ${lang === 'en' ? 'bg-cyan-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>EN</button>
                        <button onClick={() => setLang('fa')} className={`px-3 py-1 text-sm rounded-full transition-colors ${lang === 'fa' ? 'bg-cyan-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>FA</button>
                    </div>
                    {user ? (
                        <div className="flex items-center gap-3">
                            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{user.displayName}</span>
                            <button onClick={logout} className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 dark:text-red-300 transition-colors"><LogOut size={16}/></button>
                        </div>
                    ) : (
                        <button onClick={loginWithGoogle} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors">
                            <LogIn size={16}/> {t.login}
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

const Card = ({ children, lang }) => (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg dark:shadow-2xl" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}>
        {children}
    </div>
);

const CommandDisplay = ({ command, onCopy, copied }) => (
    <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg">
        <pre className="p-4 pr-12 font-mono text-sm text-gray-800 dark:text-gray-200 break-all whitespace-pre-wrap">{command}</pre>
        <button onClick={onCopy} className="absolute top-2 right-2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600/50 rounded-lg transition-all">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
    </div>
);

const GeneratedCommandCard = ({ command, explanation, warning, lang, onFavoriteToggle, isFavorite }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const textArea = document.createElement("textarea");
        textArea.value = command;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { console.error('Copy failed', err); }
        document.body.removeChild(textArea);
    };
    return (
        <Card lang={lang}>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400"><Terminal className="w-4 h-4" /><span>Command</span></div>
                <button onClick={onFavoriteToggle} className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors">
                    <Star size={16} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
            </div>
            <CommandDisplay command={command} onCopy={handleCopy} copied={copied} />
            <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{explanation}</p>
            {warning && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400/80 italic">{warning}</p>}
        </Card>
    );
};

const ExplanationCard = ({ explanation, lang }) => (
    <div className="mt-10 max-w-3xl mx-auto opacity-100" style={{ animation: `fadeInUp 0.5s ease-out forwards` }}>
        <Card lang={lang}>
            <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-300 flex items-center gap-2 mb-4"><Bot size={20} /> {translations[lang].detailedExplanation}</h3>
            <div className="prose prose-sm dark:prose-invert text-gray-700 dark:text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
        </Card>
    </div>
);

const ScriptCard = ({ filename, script_lines = [], explanation, lang, onFavoriteToggle, isFavorite }) => {
    const [copied, setCopied] = useState(false);
    const fullScript = script_lines.join('\n');
    const handleCopy = () => {
        const textArea = document.createElement("textarea");
        textArea.value = fullScript;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { console.error('Copy failed', err); }
        document.body.removeChild(textArea);
    };
    return (
        <div className="mt-10 max-w-3xl mx-auto opacity-100" style={{ animation: `fadeInUp 0.5s ease-out forwards` }}>
            <Card lang={lang}>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400"><FileCode2 className="w-4 h-4" /><span>{filename}</span></div>
                    <button onClick={onFavoriteToggle} className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors">
                        <Star size={16} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                    </button>
                </div>
                <CommandDisplay command={fullScript} onCopy={handleCopy} copied={copied} />
                <div className="mt-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{translations[lang].scriptExplanation}</h4>
                    <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{explanation}</p>
                </div>
            </Card>
        </div>
    );
};

const ErrorAnalysisCard = ({ analysis, lang }) => (
    <div className="mt-10 max-w-3xl mx-auto opacity-100" style={{ animation: `fadeInUp 0.5s ease-out forwards` }}>
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
                                    const textArea = document.createElement("textarea");
                                    textArea.value = command;
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { console.error('Copy failed', err); }
                                    document.body.removeChild(textArea);
                                };
                                return <CommandDisplay key={index} command={command} onCopy={handleCopy} copied={copied} />;
                            }
                            return <p key={index} className="text-gray-600 dark:text-gray-300 text-sm">{index + 1}. {step}</p>;
                        })}
                    </div>
                </div>
            </div>
        </Card>
    </div>
);

const AboutModal = ({ lang, onClose }) => {
    const t = translations[lang];
    return (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">About CMDGEN</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20}/></button>
                </div>
                <div className="space-y-8">
                    <div>
                        <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">{t.aboutMeTitle}</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t.aboutMeText}</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">{t.aboutToolTitle}</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t.aboutToolText}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FeedbackModal = ({ lang, onClose }) => {
    const t = translations[lang];
    const [feedback, setFeedback] = useState('');
    const [status, setStatus] = useState('idle'); // idle, sending, success, error

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.trim()) return;
        setStatus('sending');
        
        try {
            await dbAction(auth.currentUser?.uid, 'feedback', 'add', { text: feedback });
            setStatus('success');
            toast.success(t.feedbackSuccess);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Error sending feedback:", error);
            setStatus('error');
            toast.error(t.feedbackError);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t.feedbackTitle}</h2>
                {status === 'success' ? (
                    <p className="text-green-600 dark:text-green-400">{t.feedbackSuccess}</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={t.feedbackPlaceholder}
                            className="w-full h-32 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 resize-none"
                            disabled={status === 'sending'}
                        />
                        {status === 'error' && <p className="text-red-500 text-sm mt-2">{t.feedbackError}</p>}
                        <div className="flex justify-end gap-4 mt-4">
                            <button type="button" onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
                            <button type="submit" disabled={status === 'sending'} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-500">
                                {status === 'sending' ? t.sending : t.send}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// Main App Component
function AppContent() {
    const [lang, setLang] = useState('fa');
    const [theme, setTheme] = useState('dark');
    const [mode, setMode] = useState('generate');
    const [os, setOs] = useState('linux');
    const [osVersion, setOsVersion] = useState('');
    const [cli, setCli] = useState('');
    const [userInput, setUserInput] = useState('');
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activePanel, setActivePanel] = useState(null);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
    const [favorites, setFavorites] = useState([]);

    const { user } = useAuth();
    const t = translations[lang];

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, []);

    useEffect(() => {
        if (!user) { setFavorites([]); return; }
        const q = query(collection(db, "users", user.uid, "favorites"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Error fetching favorites:", error);
            toast.error(`Failed to fetch favorites: ${error.message}`);
        });
        return () => unsubscribe();
    }, [user]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    useEffect(() => {
        document.body.dir = lang === 'fa' ? 'rtl' : 'ltr';
    }, [lang]);

    useEffect(() => {
        setOsVersion(osDetails[os].versions[0]);
        setCli(osDetails[os].clis[0]);
        setResult(null);
    }, [os, lang, mode]);

    const handlePanelToggle = (panel) => {
        setActivePanel(activePanel === panel ? null : panel);
    };
    
    const handleHistorySelect = (item) => {
        setMode(item.mode);
        setOs(item.os);
        setOsVersion(item.osVersion);
        setCli(item.cli);
        setUserInput(item.userInput);
        setActivePanel(null);
    };

    const handleFavoriteToggle = async (itemData, itemType) => {
        if (!user) return;
        const itemIdentifier = itemData.command || (itemData.script_lines && itemData.script_lines.join('\n'));
        if (!itemIdentifier) return;
        
        const favQuery = query(collection(db, "users", user.uid, "favorites"), where("identifier", "==", itemIdentifier));
        const querySnapshot = await getDocs(favQuery);

        if (querySnapshot.empty) {
            await dbAction(user.uid, 'favorites', 'add', { ...itemData, identifier: itemIdentifier, type: itemType, userInput: userInput || itemIdentifier, mode: mode });
            toast.success(t.favorites + " added!");
        } else {
            querySnapshot.forEach(doc => {
                dbAction(user.uid, 'favorites', 'delete', { id: doc.id });
            });
            toast.success(t.favorites + " removed!");
        }
    };

    const handlePrimaryAction = async () => {
        if (!userInput.trim() || !os || !osVersion || !cli) {
            toast.error("Please fill in all required fields.");
            return;
        }
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
            } else { // mode === 'error'
                const analysisData = await fetchErrorAnalysis(userInput, os, osVersion, cli, lang);
                responseData = { type: 'error', data: analysisData };
            }
            setResult(responseData);
            await dbAction(user?.uid, 'history', 'add', { mode, os, osVersion, cli, userInput });
            
            const usageCount = parseInt(localStorage.getItem('cmdgenUsageCount') || '0') + 1;
            localStorage.setItem('cmdgenUsageCount', usageCount.toString());
            if (usageCount % 10 === 0 && !localStorage.getItem('cmdgenFeedbackDismissed')) {
                setShowFeedbackPrompt(true);
            }

        } catch (err) {
            setError(t.errorMessage);
            console.error(err);
            toast.error(t.errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyAllCommands = () => {
        const textToCopy = result.data.map(cmd => cmd.command).join('\n');
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); toast.success(t.copied); } catch (err) { console.error('Copy failed', err); toast.error("Failed to copy commands."); }
        document.body.removeChild(textArea);
    };

    const currentModeData = {
        generate: { label: t.questionLabel, placeholder: t.questionPlaceholder, button: t.generate, loading: t.generating },
        explain: { label: t.commandLabel, placeholder: t.commandPlaceholder, button: t.explain, loading: t.explaining },
        script: { label: t.taskLabel, placeholder: t.taskPlaceholder, button: t.generateScript, loading: t.generatingScript },
        error: { label: t.errorLabel, placeholder: t.errorPlaceholder, button: t.analyzeError, loading: t.analyzing },
    }[mode];

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white" style={{ fontFamily: lang === 'fa' ? 'Vazirmatn, sans-serif' : 'Inter, sans-serif' }}>
            {isAboutModalOpen && <AboutModal lang={lang} onClose={() => setIsAboutModalOpen(false)} />}
            {isFeedbackModalOpen && <FeedbackModal lang={lang} onClose={() => setIsFeedbackModalOpen(false)} />}
            <aside className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-all duration-300 ease-in-out ${activePanel ? 'w-72' : 'w-0'} ${lang === 'fa' ? 'border-l' : 'border-r'} border-gray-200 dark:border-gray-800 overflow-hidden`}>
                {activePanel === 'history' && <Panel lang={lang} onSelect={handleHistorySelect} title={t.history} icon={<History size={20}/>} collectionName="history" noItemsText={t.noHistory} />}
                {activePanel === 'favorites' && <Panel lang={lang} onSelect={handleHistorySelect} title={t.favorites} icon={<Star size={20}/>} collectionName="favorites" noItemsText={t.noFavorites} />}
            </aside>
            <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                <Header lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} onHistoryToggle={() => handlePanelToggle('history')} onFavoritesToggle={() => handlePanelToggle('favorites')} onAboutToggle={() => setIsAboutModalOpen(true)} onFeedbackToggle={() => setIsFeedbackModalOpen(true)} />
                <main className="flex-grow container mx-auto px-4 md:px-8 py-8 md:py-12">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center bg-gray-200 dark:bg-gray-800 p-1 rounded-full mb-6">
                            <button onClick={() => setMode('generate')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors ${mode === 'generate' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <Wand2 size={16} /> {t.modeGenerate} </button>
                            <button onClick={() => setMode('explain')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors ${mode === 'explain' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <Search size={16} /> {t.modeExplain} </button>
                            <button onClick={() => setMode('script')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors ${mode === 'script' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <FileCode2 size={16} /> {t.modeScript} </button>
                            <button onClick={() => setMode('error')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors ${mode === 'error' ? 'bg-cyan-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}> <ShieldAlert size={16} /> {t.modeError} </button>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{translations[lang][`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`]}</h2>
                        <p className="mt-3 text-gray-600 dark:text-gray-400 text-lg">{translations[lang][`${mode}Subheader`]}</p>
                    </div>
                
                    <div className="mt-8 max-w-3xl mx-auto bg-white/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg backdrop-blur-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-2 md:col-span-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.os}</label>
                                <div className="grid grid-cols-3 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-300 dark:border-gray-700">
                                    {Object.keys(osDetails).map(key => (
                                        <button key={key} onClick={() => setOs(key)} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${os === key ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/50'}`}>
                                            {key === 'linux' ? <Terminal size={20}/> : key === 'windows' ? <Wind size={20}/> : <Apple size={20}/>}
                                            <span className="text-sm capitalize">{key}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <CustomSelect label={t.osVersion} value={osVersion} onChange={setOsVersion} options={osDetails[os].versions} placeholder={t.selectVersion} disabled={!os} lang={lang} />
                            <CustomSelect label={t.cli} value={cli} onChange={setCli} options={osDetails[os].clis} placeholder={t.selectCli} disabled={!os} lang={lang} />
                            <div className="flex flex-col gap-2 md:col-span-3">
                                <label htmlFor="user-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentModeData.label}</label>
                                <textarea id="user-input" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={currentModeData.placeholder} className="w-full bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 resize-none" rows="3" />
                            </div>
                        </div>
                        <button onClick={handlePrimaryAction} disabled={isLoading || !osVersion || !cli} className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105">
                            {isLoading ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{currentModeData.loading}</> : currentModeData.button}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-8 max-w-3xl mx-auto bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/50 rounded-xl p-5 text-center text-red-700 dark:text-red-300">
                            <div className="flex items-center justify-center gap-2"><ServerCrash className="w-6 h-6"/><h3 className="font-bold text-lg">{t.errorTitle}</h3></div><p className="mt-2 text-sm">{error}</p>
                        </div>
                    )}
                    
                    {result && result.type === 'commands' && (
                        <div className="mt-10 max-w-3xl mx-auto space-y-4">
                            <div className="flex justify-end">
                                <button onClick={copyAllCommands} className="flex items-center gap-2 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    <CopyPlus size={16} /> {t.copyAll}
                                </button>
                            </div>
                            {result.data.map((cmd, index) => {
                                const isFavorite = favorites.some(fav => fav.identifier === cmd.command);
                                return <GeneratedCommandCard key={index} {...cmd} lang={lang} onFavoriteToggle={() => handleFavoriteToggle(cmd, 'command')} isFavorite={isFavorite} />
                            })}
                        </div>
                    )}
                    
                    {result && result.type === 'explanation' && <ExplanationCard explanation={result.data} lang={lang} />}

                    {result && result.type === 'script' && (() => {
                        const isFavorite = favorites.some(fav => fav.identifier === result.data.script_lines.join('\n'));
                        return <ScriptCard {...result.data} lang={lang} onFavoriteToggle={() => handleFavoriteToggle(result.data, 'script')} isFavorite={isFavorite} />
                    })()}
                    
                    {result && result.type === 'error' && <ErrorAnalysisCard analysis={result.data} lang={lang} />}
                    
                    {showFeedbackPrompt && (
                        <div className="fixed bottom-5 right-5 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-800 dark:text-gray-200">{t.feedbackPrompt}</p>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => { setIsFeedbackModalOpen(true); setShowFeedbackPrompt(false); }} className="flex-1 bg-cyan-500 text-white px-3 py-1 text-sm rounded-md">{t.giveFeedback}</button>
                                <button onClick={() => { setShowFeedbackPrompt(false); localStorage.setItem('cmdgenFeedbackDismissed', 'true'); }} className="flex-1 bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm rounded-md">{t.dismiss}</button>
                            </div>
                        </div>
                    )}

                </main>
                <footer className="py-6 px-4 md:px-8 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400 text-xs mt-auto">
                    <p>{t.footerLine1}</p><p className="mt-1">{t.footerLine2}</p>
                </footer>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<AppContent />} />
                    <Route path="/__/auth/handler" element={<AuthHandler />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

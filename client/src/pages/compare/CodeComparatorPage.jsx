import { useState, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";

const ANALYSIS_TYPES = [
  {
    id: "before_after",
    title: { fa: "تحلیل قبل/بعد", en: "Before/After Analysis" },
    icon: "🔄",
    description: {
      fa: "تحلیل تغییرات بین دو نسخه از یک کد (بهبودها، رفع باگ‌ها، بهینه‌سازی)",
      en: "Analyze changes between two versions of same code (improvements, bug fixes, optimizations)"
    },
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "smart_merge",
    title: { fa: "تحلیل هوشمند + کد مرج", en: "Smart Analysis + Merged Code" },
    icon: "🧠",
    description: {
      fa: "تحلیل دو کد مختلف، نقاط قوت/ضعف هر کدام و تولید یک کد مرج بهینه",
      en: "Analyze two different codes, strengths/weaknesses of each, and produce optimized merged code"
    },
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "language_specific",
    title: { fa: "تحلیل زبان‌مخصوص", en: "Language-Specific Analysis" },
    icon: "🔤",
    description: {
      fa: "تحلیل دو کد با زبان یکسان، بررسی الگوها و ارائه توصیه‌های تخصصی",
      en: "Analyze two codes in same language, check patterns and provide expert recommendations"
    },
    color: "from-green-500 to-emerald-600"
  },
  {
    id: "simple_compare",
    title: { fa: "مقایسه ساده", en: "Simple Compare" },
    icon: "🔍",
    description: {
      fa: "تشابهات و تفاوت‌های ساده بین دو کد",
      en: "Simple similarities and differences between two codes"
    },
    color: "from-orange-500 to-red-500"
  }
];

export default function CodeComparatorPage() {
  const { lang } = useLanguage();

  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisType, setAnalysisType] = useState("before_after");
  const [language, setLanguage] = useState("auto");

  const currentAnalysis = useMemo(() => 
    ANALYSIS_TYPES.find(a => a.id === analysisType) || ANALYSIS_TYPES[0],
    [analysisType]
  );

  const analyze = async () => {
    if (loading) return;
    if (!codeA.trim() && !codeB.trim()) {
      setError(lang === "fa" ? "⚠️ لطفا حداقل یک کد وارد کنید" : "⚠️ Please enter at least one code");
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const payload = buildPayload();
      console.log("📤 Sending payload:", payload);
      
      const result = await callCCG(payload);
      setOutput(result?.markdown || result?.result || "");
    } catch (e) {
      setError(e?.message || (lang === "fa" ? "❌ خطا در تحلیل کد" : "❌ Code analysis error"));
    } finally {
      setLoading(false);
    }
  };

  const buildPayload = () => {
    const basePayload = {
      mode: "analyze",
      lang,
      codeA: codeA.trim(),
      codeB: codeB.trim(),
      analysisType,
      programmingLanguage: language === "auto" ? detectLanguage(codeA || codeB) : language,
      timestamp: new Date().toISOString()
    };

    switch (analysisType) {
      case "before_after":
        return {
          ...basePayload,
          user_request: lang === "fa" 
            ? `این دو نسخه از یک کد را تحلیل کن (قبل و بعد). 
                تغییرات را دقیق شرح بده.
                بهبودهای انجام شده را لیست کن.
                اگر باگی رفع شده، توضیح بده.
                اگر بهینه‌سازی انجام شده، میزان بهبود را تخمین بزن.
                توصیه‌های بیشتری برای بهبود کد ارائه بده.`
            : `Analyze these two versions of same code (before and after).
                Describe changes in detail.
                List improvements made.
                If bugs were fixed, explain them.
                If optimizations were made, estimate improvement percentage.
                Provide additional recommendations for code improvement.`
        };

      case "smart_merge":
        return {
          ...basePayload,
          user_request: lang === "fa"
            ? `این دو کد مختلف را تحلیل کن.
                نقاط قوت و ضعف هر کدام را جداگانه بررسی کن.
                الگوهای خوب و بد هر کد را مشخص کن.
                یک کد مرج بهینه تولید کن که بهترین بخش‌های هر دو کد را ترکیب کند.
                توضیح بده چرا این کد مرج بهتر از هر دو کد اصلی است.
                اگر امکان‌پذیر است، چندین نسخه از کد مرج ارائه بده (ساده، بهینه، امن).`
            : `Analyze these two different codes.
                Examine strengths and weaknesses of each separately.
                Identify good and bad patterns in each code.
                Produce an optimized merged code that combines best parts of both.
                Explain why this merged code is better than both original codes.
                If possible, provide multiple versions of merged code (simple, optimized, secure).`
        };

      case "language_specific":
        return {
          ...basePayload,
          user_request: lang === "fa"
            ? `این دو کد را با توجه به زبان برنامه‌نویسی آن‌ها تحلیل کن.
                الگوهای خاص زبان را بررسی کن.
                بهترین روش‌های زبان (best practices) را اعمال کن.
                کد هر کدام را جداگانه بهبود بده.
                سپس یک کد مرج با استفاده از ویژگی‌های پیشرفته زبان ارائه بده.
                برای هر بهبود، دلیل و سینتکس صحیح را توضیح بده.`
            : `Analyze these two codes considering their programming language.
                Check language-specific patterns.
                Apply language best practices.
                Improve each code separately.
                Then provide a merged code using advanced language features.
                For each improvement, explain reason and correct syntax.`
        };

      default: // simple_compare
        return {
          ...basePayload,
          user_request: lang === "fa"
            ? "این دو کد را مقایسه کن. تشابهات و تفاوت‌های اصلی را لیست کن."
            : "Compare these two codes. List main similarities and differences."
        };
    }
  };

  const detectLanguage = (code) => {
    const codeStr = code.toLowerCase();
    if (codeStr.includes("def ") || codeStr.includes("import ") || codeStr.includes("print(")) return "python";
    if (codeStr.includes("function ") || codeStr.includes("const ") || codeStr.includes("let ")) return "javascript";
    if (codeStr.includes("public class") || codeStr.includes("System.out")) return "java";
    if (codeStr.includes("#include") || codeStr.includes("int main")) return "c++";
    if (codeStr.includes("<?php") || codeStr.includes("echo ")) return "php";
    if (codeStr.includes("func ") || codeStr.includes("package ")) return "go";
    if (codeStr.includes("fn ") || codeStr.includes("let mut")) return "rust";
    return "unknown";
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert(lang === "fa" ? "✅ کپی شد!" : "✅ Copied!");
    });
  };

  const clearAll = () => {
    setCodeA("");
    setCodeB("");
    setOutput("");
    setError("");
  };

  const swapCodes = () => {
    setCodeA(codeB);
    setCodeB(codeA);
  };

  const insertExample = () => {
    if (analysisType === "before_after") {
      setCodeA(`// Before: Simple function to calculate factorial
function factorial(n) {
  let result = 1;
  for (let i = 1; i <= n; i++) {
    result = result * i;
  }
  return result;
}`);
      
      setCodeB(`// After: Optimized with recursion and error handling
function factorial(n) {
  if (typeof n !== 'number' || n < 0) {
    throw new Error('Input must be a non-negative number');
  }
  
  if (n === 0 || n === 1) {
    return 1;
  }
  
  // Use recursion for cleaner code
  return n * factorial(n - 1);
}`);
    } else if (analysisType === "smart_merge") {
      setCodeA(`// Code A: Using for loop
function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`);

      setCodeB(`// Code B: Using reduce with error handling
function sumArray(arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('Input must be an array');
  }
  
  return arr.reduce((total, current) => {
    if (typeof current !== 'number') {
      throw new TypeError('Array must contain only numbers');
    }
    return total + current;
  }, 0);
}`);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h1 className="text-lg md:text-xl font-bold mb-2">
            {lang === "fa" ? "🧠 تحلیل‌گر پیشرفته کد" : "🧠 Advanced Code Analyzer"}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            {lang === "fa" 
              ? "۴ نوع تحلیل تخصصی کد با خروجی‌های متفاوت"
              : "4 specialized code analysis types with different outputs"}
          </p>
        </div>
      </div>

      {/* Analysis Type Selection */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h2 className="font-semibold text-sm mb-3">
            {lang === "fa" ? "🎯 نوع تحلیل را انتخاب کنید" : "🎯 Select Analysis Type"}
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {ANALYSIS_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setAnalysisType(type.id)}
                className={`
                  flex flex-col items-center p-3 rounded-lg text-center transition-all
                  ${analysisType === type.id
                    ? `bg-gradient-to-br ${type.color} text-white shadow-md`
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className="text-lg mb-1">{type.icon}</span>
                <span className="text-xs font-medium mb-1">
                  {typeof type.title === 'object' ? type.title[lang] || type.title.en : type.title}
                </span>
              </button>
            ))}
          </div>
          
          {/* Analysis Description */}
          <div className={`p-3 rounded-lg bg-gradient-to-r ${currentAnalysis.color} bg-opacity-10`}>
            <div className="text-xs md:text-sm">
              <span className="font-medium">
                {typeof currentAnalysis.title === 'object' 
                  ? currentAnalysis.title[lang] || currentAnalysis.title.en
                  : currentAnalysis.title}:
              </span>
              <span className="mr-2">
                {typeof currentAnalysis.description === 'object'
                  ? currentAnalysis.description[lang] || currentAnalysis.description.en
                  : currentAnalysis.description}
              </span>
            </div>
          </div>
          
          {/* Language Selection for language-specific analysis */}
          {analysisType === "language_specific" && (
            <div className="mt-3">
              <label className="block text-xs font-medium mb-1">
                {lang === "fa" ? "زبان برنامه‌نویسی" : "Programming Language"}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="auto">{lang === "fa" ? "تشخیص خودکار" : "Auto Detect"}</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript/TypeScript</option>
                <option value="java">Java</option>
                <option value="c++">C/C++</option>
                <option value="php">PHP</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="bash">Bash/Shell</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Code Inputs */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Code A */}
          <div className="ccg-card p-3 md:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-sm">
                {analysisType === "before_after" 
                  ? (lang === "fa" ? "📝 کد قبل" : "📝 Code Before")
                  : (lang === "fa" ? "📝 کد اول" : "📝 Code A")
                }
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(codeA)}
                  disabled={!codeA.trim()}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  📋 {lang === "fa" ? "کپی" : "Copy"}
                </button>
              </div>
            </div>
            <textarea
              value={codeA}
              onChange={(e) => setCodeA(e.target.value)}
              placeholder={lang === "fa" 
                ? "کد خود را اینجا وارد کنید..."
                : "Enter your code here..."}
              className="w-full h-48 md:h-56 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg font-mono resize-none focus:ring-1 focus:ring-blue-500"
              spellCheck="false"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {codeA.trim().length} {lang === "fa" ? "کاراکتر" : "chars"} • {codeA.trim().split('\n').length} {lang === "fa" ? "خط" : "lines"}
            </div>
          </div>

          {/* Code B */}
          <div className="ccg-card p-3 md:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-sm">
                {analysisType === "before_after" 
                  ? (lang === "fa" ? "✨ کد بعد" : "✨ Code After")
                  : (lang === "fa" ? "✨ کد دوم" : "✨ Code B")
                }
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(codeB)}
                  disabled={!codeB.trim()}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  📋 {lang === "fa" ? "کپی" : "Copy"}
                </button>
                <button
                  onClick={swapCodes}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  title={lang === "fa" ? "جابجایی کدها" : "Swap codes"}
                >
                  ↔️
                </button>
              </div>
            </div>
            <textarea
              value={codeB}
              onChange={(e) => setCodeB(e.target.value)}
              placeholder={lang === "fa" 
                ? analysisType === "before_after"
                  ? "کد بهبود یافته را اینجا وارد کنید..."
                  : "کد دوم را اینجا وارد کنید..."
                : analysisType === "before_after"
                  ? "Enter improved code here..."
                  : "Enter second code here..."
              }
              className="w-full h-48 md:h-56 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg font-mono resize-none focus:ring-1 focus:ring-blue-500"
              spellCheck="false"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {codeB.trim().length} {lang === "fa" ? "کاراکتر" : "chars"} • {codeB.trim().split('\n').length} {lang === "fa" ? "خط" : "lines"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="ccg-container">
        <div className="ccg-card p-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <button
              onClick={analyze}
              disabled={loading || (!codeA.trim() && !codeB.trim())}
              className={`col-span-2 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition
                ${loading || (!codeA.trim() && !codeB.trim())
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  : `bg-gradient-to-r ${currentAnalysis.color} text-white hover:opacity-90`
                }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{lang === "fa" ? "در حال تحلیل..." : "Analyzing..."}</span>
                </>
              ) : (
                <>
                  <span className="text-base">🚀</span>
                  <span>
                    {lang === "fa" ? "شروع تحلیل" : "Start Analysis"} 
                    {analysisType === "smart_merge" && " 🧠"}
                    {analysisType === "before_after" && " 🔄"}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={insertExample}
              className="py-3 rounded-lg flex items-center justify-center gap-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <span>📋</span>
              <span>{lang === "fa" ? "مثال" : "Example"}</span>
            </button>

            <button
              onClick={clearAll}
              className="py-3 rounded-lg flex items-center justify-center gap-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <span>🗑️</span>
              <span>{lang === "fa" ? "پاک کردن" : "Clear"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="ccg-container">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 animate-fadeIn">
            <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
              ⚠️ {lang === "fa" ? "خطا" : "Error"}
            </div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {/* Output Display */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-base">
              {lang === "fa" ? "📊 نتیجه تحلیل" : "📊 Analysis Result"}
              <span className="mr-2 text-xs font-normal text-gray-500">
                ({typeof currentAnalysis.title === 'object' 
                  ? currentAnalysis.title[lang] || currentAnalysis.title.en
                  : currentAnalysis.title})
              </span>
            </h2>
            {output && (
              <button
                onClick={() => copyToClipboard(output)}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition flex items-center gap-1"
              >
                <span>📋</span>
                <span>{lang === "fa" ? "کپی نتیجه" : "Copy Result"}</span>
              </button>
            )}
          </div>

          {output ? (
            <div className="space-y-3 animate-fadeIn">
              <CodeBlock 
                code={output} 
                language="markdown" 
                showCopy={false}
                maxHeight="400px"
              />
              
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg">
                <div className="text-xs font-medium mb-1">
                  💡 {lang === "fa" ? "نکات استفاده از نتیجه" : "Result Usage Tips"}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {getResultTips(analysisType, lang)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-3xl mb-3">🔍</div>
              <div className="text-sm mb-2">
                {lang === "fa" ? "هنوز تحلیلی انجام نشده" : "No analysis yet"}
              </div>
              <div className="text-xs max-w-md mx-auto">
                {lang === "fa" 
                  ? "کد خود را وارد کنید یا دکمه 'مثال' را بزنید، سپس تحلیل را شروع کنید"
                  : "Enter your code or click 'Example', then start analysis"
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getResultTips(analysisType, lang) {
  const tips = {
    before_after: {
      fa: "۱. تغییرات را مرحله‌به‌مرحله اعمال کنید ۲. تست‌های واحد بنویسید ۳. عملکرد را اندازه‌گیری کنید",
      en: "1. Apply changes step by step 2. Write unit tests 3. Measure performance"
    },
    smart_merge: {
      fa: "۱. کد مرج را بررسی و اصلاح کنید ۲. تست‌های امنیتی انجام دهید ۳. مستندات بنویسید",
      en: "1. Review and refine merged code 2. Perform security tests 3. Write documentation"
    },
    language_specific: {
      fa: "۱. سینتکس را با مستندات زبان چک کنید ۲. الگوهای پیشنهادی را تست کنید ۳. بهترین روش‌ها را رعایت کنید",
      en: "1. Check syntax with language docs 2. Test suggested patterns 3. Follow best practices"
    },
    simple_compare: {
      fa: "۱. تفاوت‌ها را در محیط واقعی تست کنید ۲. سازگاری با سیستم خود را بررسی کنید",
      en: "1. Test differences in real environment 2. Check compatibility with your system"
    }
  };
  
  return tips[analysisType]?.[lang] || tips[analysisType]?.en || '';
}

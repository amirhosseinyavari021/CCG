import { useState, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState, usePersistComplexState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import AdvancedSettings from "../../components/generator/AdvancedSettings";
import FeedbackButton from "../../components/ui/FeedbackButton";

const PLATFORMS = [
  { value: "linux", label: "Linux", icon: "🐧", shortLabel: { fa: "لینوکس", en: "Linux" } },
  { value: "windows", label: "Windows", icon: "🪟", shortLabel: { fa: "ویندوز", en: "Windows" } },
  { value: "mac", label: "macOS", icon: "🍎", shortLabel: { fa: "مک", en: "macOS" } },
  { value: "network", label: "Network", icon: "🌐", shortLabel: { fa: "شبکه", en: "Network" } }
];

// لیست سیستم‌عامل‌های پشتیبانی شده برای Other
const SUPPORTED_OTHER_OS = [
  { value: "freebsd", label: "FreeBSD", icon: "🐡", description: { fa: "سیستم عامل FreeBSD", en: "FreeBSD OS" } },
  { value: "openbsd", label: "OpenBSD", icon: "🐡", description: { fa: "سیستم عامل OpenBSD", en: "OpenBSD OS" } },
  { value: "netbsd", label: "NetBSD", icon: "🐡", description: { fa: "سیستم عامل NetBSD", en: "NetBSD OS" } },
  { value: "solaris", label: "Solaris", icon: "☀️", description: { fa: "Oracle Solaris", en: "Oracle Solaris" } },
  { value: "aix", label: "AIX", icon: "🖥️", description: { fa: "IBM AIX", en: "IBM AIX" } },
  { value: "hpux", label: "HP-UX", icon: "💻", description: { fa: "HP-UX", en: "HP-UX" } },
  { value: "zos", label: "z/OS", icon: "💾", description: { fa: "IBM z/OS", en: "IBM z/OS" } },
  { value: "android", label: "Android", icon: "🤖", description: { fa: "سیستم عامل Android", en: "Android OS" } },
  { value: "ios", label: "iOS", icon: "📱", description: { fa: "سیستم عامل iOS", en: "iOS" } },
  { value: "chromeos", label: "ChromeOS", icon: "🌐", description: { fa: "Chrome OS", en: "Chrome OS" } }
];

const OUTPUT_TYPES = [
  { 
    value: "tool", 
    label: { fa: "ابزار کامل", en: "Full Tool" },
    icon: "🛠️",
    description: { 
      fa: "دستور + توضیح + هشدار", 
      en: "Command + Explanation + Warnings" 
    }
  },
  { 
    value: "command", 
    label: { fa: "فقط دستور", en: "Command Only" },
    icon: "💻",
    description: { 
      fa: "دستور اجرایی خالص", 
      en: "Pure executable command" 
    }
  },
  { 
    value: "python", 
    label: { fa: "اسکریپت پایتون", en: "Python Script" },
    icon: "🐍",
    description: { 
      fa: "اسکریپت پایتون قابل اجرا", 
      en: "Executable Python script" 
    }
  }
];

export default function GeneratorPage() {
  const { lang } = useLanguage();
  
  // State management با persistence
  const [platform, setPlatform] = usePersistState("platform", "linux");
  const [otherOS, setOtherOS] = usePersistState("other_os", "freebsd");
  const [outputType, setOutputType] = usePersistState("output_type", "tool");
  const [knowledgeLevel, setKnowledgeLevel] = usePersistState("knowledge_level", "intermediate");
  const [input, setInput] = usePersistState("input", "");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = usePersistState("show_advanced", false);
  const [advancedSettings, setAdvancedSettings] = usePersistComplexState("advanced_settings", {});
  
  // محاسبه پلتفرم نهایی (اگر other انتخاب شده، otherOS استفاده شود)
  const finalPlatform = platform === "other" ? `other:${otherOS}` : platform;
  
  // Platform description
  const platformDescriptions = useMemo(() => ({
    linux: {
      fa: "توزیع‌های لینوکس (Ubuntu, Debian, CentOS, ...)",
      en: "Linux distributions (Ubuntu, Debian, CentOS, ...)"
    },
    windows: {
      fa: "ویندوز ۱۰/۱۱، ویندوز سرور",
      en: "Windows 10/11, Windows Server"
    },
    mac: {
      fa: "سیستم عامل مک (macOS)",
      en: "Apple macOS"
    },
    network: {
      fa: "تجهیزات شبکه (روتر، سوئیچ، فایروال)",
      en: "Network equipment (routers, switches, firewalls)"
    },
    other: {
      fa: "سیستم‌عامل‌های دیگر پشتیبانی شده",
      en: "Other supported operating systems"
    }
  }), []);
  
  // Generate function
  const generate = async () => {
    if (!input.trim()) {
      setError(lang === "fa" ? "⚠️ لطفا درخواست خود را وارد کنید" : "⚠️ Please enter your request");
      return;
    }
    
    setLoading(true);
    setError("");
    setOutput("");
    
    try {
      const payload = {
        mode: "generate",
        lang,
        user_request: input.trim(),
        outputType,
        knowledgeLevel,
        platform: finalPlatform,
        advanced: advancedSettings,
        timestamp: new Date().toISOString()
      };
      
      const result = await callCCG(payload);
      setOutput(result?.markdown || result?.result || "");
    } catch (err) {
      setError(err.message || (lang === "fa" ? "❌ خطا در ارتباط با سرور" : "❌ Server connection error"));
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert(lang === "fa" ? "✅ کپی شد!" : "✅ Copied!");
    });
  };
  
  const clearAll = () => {
    setInput("");
    setOutput("");
    setError("");
  };
  
  const getPlatformColor = (plat) => {
    const colors = {
      linux: "from-orange-500 to-red-500",
      windows: "from-blue-500 to-cyan-500",
      mac: "from-gray-400 to-gray-600",
      network: "from-green-500 to-emerald-600",
      other: "from-purple-500 to-pink-500"
    };
    return colors[plat] || "from-blue-500 to-purple-600";
  };
  
  // رندر دکمه‌های پلتفرم (شامل other)
  const renderPlatformButtons = () => {
    const allPlatforms = [...PLATFORMS, { value: "other", label: "Other OS", icon: "🔧", shortLabel: { fa: "سایر", en: "Other" } }];
    
    return (
      <div className="grid grid-cols-5 gap-2 mb-3">
        {allPlatforms.map(p => (
          <button
            key={p.value}
            onClick={() => setPlatform(p.value)}
            className={`
              flex flex-col items-center p-2 rounded-lg transition-all
              ${platform === p.value 
                ? `bg-gradient-to-b ${getPlatformColor(p.value)} text-white shadow` 
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            title={p.label}
          >
            <span className="text-lg">{p.icon}</span>
            <span className="text-xs mt-1">
              {typeof p.shortLabel === 'object' ? p.shortLabel[lang] || p.shortLabel.en : p.shortLabel}
            </span>
          </button>
        ))}
      </div>
    );
  };
  
  // رندر انتخاب Other OS
  const renderOtherOSSelector = () => {
    if (platform !== "other") return null;
    
    return (
      <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <h3 className="text-sm font-medium mb-2">
          {lang === "fa" ? "🔧 انتخاب سیستم عامل دیگر" : "🔧 Select Other OS"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {SUPPORTED_OTHER_OS.map(os => (
            <button
              key={os.value}
              onClick={() => setOtherOS(os.value)}
              className={`
                flex flex-col items-center p-2 rounded transition text-center
                ${otherOS === os.value
                  ? 'bg-gradient-to-b from-purple-500 to-pink-500 text-white shadow'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }
              `}
              title={typeof os.description === 'object' ? os.description[lang] || os.description.en : os.description}
            >
              <span className="text-lg mb-1">{os.icon}</span>
              <span className="text-xs">{os.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {lang === "fa" 
            ? "سیستم عامل خود را از لیست پشتیبانی شده انتخاب کنید"
            : "Select your OS from supported list"}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Feedback Button */}
      <div className="ccg-container">
        <FeedbackButton />
      </div>
      
      {/* Platform Selection */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h2 className="font-bold text-base mb-3">
            {lang === "fa" ? "🎯 پلتفرم هدف" : "🎯 Target Platform"}
          </h2>
          
          {renderPlatformButtons()}
          {renderOtherOSSelector()}
          
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
            <div className="text-xs">
              <span className="font-medium">
                {platform === "other" 
                  ? SUPPORTED_OTHER_OS.find(os => os.value === otherOS)?.label || "Other OS"
                  : platformDescriptions[platform]?.[lang] || platformDescriptions[platform]?.en
                }
              </span>
              <span className="mr-2 text-gray-500">
                {platform === "other" && (
                  <> • {SUPPORTED_OTHER_OS.find(os => os.value === otherOS)?.description?.[lang]}</>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Advanced Settings Toggle */}
      <div className="ccg-container">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full ccg-card p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${showAdvanced ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <span className="text-white text-sm">⚙️</span>
              </div>
              <div>
                <div className="text-sm font-medium text-left">
                  {lang === "fa" ? "تنظیمات پیشرفته" : "Advanced Settings"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                  {showAdvanced 
                    ? (lang === "fa" ? "برای مخفی کردن کلیک کنید" : "Click to hide")
                    : (lang === "fa" ? "برای تنظیمات دقیق‌تر کلیک کنید" : "Click for detailed settings")
                  }
                </div>
              </div>
            </div>
            <span className="text-sm">{showAdvanced ? "▲" : "▼"}</span>
          </div>
        </button>
        
        {/* Advanced Settings Content */}
        {showAdvanced && (
          <div className="mt-3 animate-fadeIn">
            <div className="ccg-card p-4">
              <AdvancedSettings 
                platform={platform === "other" ? "other" : platform}
                settings={advancedSettings}
                onChange={setAdvancedSettings}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Main Input/Output Grid */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Input Column */}
          <div className="ccg-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">
                {lang === "fa" ? "📝 درخواست شما" : "📝 Your Request"}
              </h2>
              <button
                onClick={clearAll}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                🗑️ {lang === "fa" ? "پاک کردن" : "Clear"}
              </button>
            </div>
            
            {/* Output Type Selection */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-2">
                {lang === "fa" ? "نوع خروجی" : "Output Type"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OUTPUT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setOutputType(type.value)}
                    className={`
                      flex flex-col items-center p-2 rounded transition text-center
                      ${outputType === type.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                    title={typeof type.description === 'object' 
                      ? type.description[lang] || type.description.en
                      : type.description
                    }
                  >
                    <span className="text-base">{type.icon}</span>
                    <span className="text-xs mt-1">
                      {typeof type.label === 'object' 
                        ? type.label[lang] || type.label.en
                        : type.label
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Knowledge Level */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-2">
                {lang === "fa" ? "سطح دانش" : "Knowledge Level"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setKnowledgeLevel("beginner")}
                  className={`p-2 rounded text-xs ${knowledgeLevel === "beginner" ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  👶 {lang === "fa" ? "مبتدی" : "Beginner"}
                </button>
                <button
                  onClick={() => setKnowledgeLevel("intermediate")}
                  className={`p-2 rounded text-xs ${knowledgeLevel === "intermediate" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  👨‍💻 {lang === "fa" ? "متوسط" : "Intermediate"}
                </button>
                <button
                  onClick={() => setKnowledgeLevel("expert")}
                  className={`p-2 rounded text-xs ${knowledgeLevel === "expert" ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                >
                  🧠 {lang === "fa" ? "حرفه‌ای" : "Expert"}
                </button>
              </div>
            </div>
            
            {/* Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "fa" 
                ? "مثال: چگونه فضای دیسک روی سرور لینوکس را بررسی و پاکسازی کنم؟"
                : "Example: How to check and clean disk space on Linux server?"}
              className="w-full h-40 p-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-1 focus:ring-blue-500"
              rows={4}
            />
            
            {/* Error Display */}
            {error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded animate-fadeIn">
                <div className="text-xs font-medium text-red-700 dark:text-red-300">{error}</div>
              </div>
            )}
            
            {/* Generate Button */}
            <button
              onClick={generate}
              disabled={loading || !input.trim()}
              className={`
                mt-4 w-full py-3 rounded-lg font-medium text-sm transition
                ${loading || !input.trim()
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  : `bg-gradient-to-r ${getPlatformColor(platform)} text-white hover:opacity-90`
                }
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{lang === "fa" ? "در حال تولید..." : "Generating..."}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base">🚀</span>
                  <span>{lang === "fa" ? "تولید دستور" : "Generate Command"}</span>
                </div>
              )}
            </button>
          </div>
          
          {/* Output Column */}
          <div className="ccg-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">
                {lang === "fa" ? "✨ نتیجه" : "✨ Result"}
              </h2>
              {output && (
                <button
                  onClick={() => copyToClipboard(output)}
                  className="px-3 py-1 text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded hover:opacity-90 transition flex items-center gap-1"
                >
                  <span>📋</span>
                  <span>{lang === "fa" ? "کپی" : "Copy"}</span>
                </button>
              )}
            </div>
            
            {output ? (
              <div className="space-y-3 animate-fadeIn">
                <CodeBlock 
                  code={output} 
                  language={outputType === "python" ? "python" : "bash"}
                  showCopy={false}
                  maxHeight="300px"
                />
                
                {/* Additional Info */}
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                  <div className="text-xs font-medium mb-1">
                    {lang === "fa" ? "📊 اطلاعات تولید" : "📊 Generation Info"}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">{lang === "fa" ? "پلتفرم" : "Platform"}</div>
                      <div className="font-medium">
                        {platform === "other" 
                          ? SUPPORTED_OTHER_OS.find(os => os.value === otherOS)?.label || "Other OS"
                          : platform
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">{lang === "fa" ? "نوع خروجی" : "Output Type"}</div>
                      <div className="font-medium">{outputType}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-3xl mb-2">✨</div>
                <div className="text-sm mb-1">
                  {lang === "fa" ? "آماده برای تولید!" : "Ready to generate!"}
                </div>
                <div className="text-xs">
                  {lang === "fa" 
                    ? "درخواست خود را بنویسید و دکمه تولید را بزنید"
                    : "Write your request and click Generate"
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Status Info */}
      <div className="ccg-container">
        <div className="ccg-card p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              {lang === "fa" 
                ? "وضعیت شما ذخیره شد. بعد از ریفرش تنظیمات حفظ می‌شوند."
                : "Your status is saved. Settings will persist after refresh."
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

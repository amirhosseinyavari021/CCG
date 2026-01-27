import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";
import CodeBlock from "../../components/ui/CodeBlock";
import Tooltip from "../../components/ui/Tooltip";

const PLATFORM_OPTIONS = [
  { value: "linux", label: "Linux", tips: {
    fa: "توزیع‌های لینوکس مانند Ubuntu, CentOS, Debian",
    en: "Linux distributions like Ubuntu, CentOS, Debian"
  }},
  { value: "windows", label: "Windows", tips: {
    fa: "ویندوز ۱۰/۱۱، ویندوز سرور",
    en: "Windows 10/11, Windows Server"
  }},
  { value: "mac", label: "macOS", tips: {
    fa: "سیستم عامل مک (macOS)",
    en: "Apple macOS"
  }},
  { value: "network", label: "Network Device", tips: {
    fa: "تجهیزات شبکه مانند روتر، سوئیچ، فایروال",
    en: "Network equipment like routers, switches, firewalls"
  }},
  { value: "other", label: "Other OS", tips: {
    fa: "سیستم‌عامل‌های دیگر مانند FreeBSD, Solaris",
    en: "Other OS like FreeBSD, Solaris"
  }},
];

const OUTPUT_TYPES = [
  { value: "tool", label: "Tool (Full)", icon: "🛠️", tips: {
    fa: "دستور کامل + توضیح + هشدار + جایگزین",
    en: "Full command + explanation + warnings + alternatives"
  }},
  { value: "command", label: "Command Only", icon: "💻", tips: {
    fa: "فقط دستور خالص بدون توضیح اضافه",
    en: "Only the command without extra explanation"
  }},
  { value: "python", label: "Python Script", icon: "🐍", tips: {
    fa: "اسکریپت پایتون برای اتوماسیون",
    en: "Python script for automation"
  }},
];

const KNOWLEDGE_LEVELS = [
  { value: "beginner", label: "Beginner", tips: {
    fa: "توضیحات کامل و گام به گام",
    en: "Full step-by-step explanations"
  }},
  { value: "intermediate", label: "Intermediate", tips: {
    fa: "توضیحات متوسط - مناسب کاربران با تجربه",
    en: "Moderate explanations - for experienced users"
  }},
  { value: "expert", label: "Expert", tips: {
    fa: "دستورات مختصر و پیشرفته",
    en: "Concise advanced commands"
  }},
];

export default function GeneratorPage() {
  const { t, lang } = useLanguage();
  
  // حالت‌ها
  const [platform, setPlatform] = useState("linux");
  const [outputType, setOutputType] = useState("tool");
  const [knowledgeLevel, setKnowledgeLevel] = useState("intermediate");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState({ markdown: "", tool: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [swapLayout, setSwapLayout] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // توابع
  const generate = async () => {
    if (!input.trim()) {
      setError(lang === "fa" ? "لطفا درخواست خود را وارد کنید" : "Please enter your request");
      return;
    }
    
    setLoading(true);
    setError("");
    setOutput({ markdown: "", tool: null });
    
    try {
      const payload = {
        mode: "generate",
        lang,
        user_request: input.trim(),
        outputType,
        knowledgeLevel,
        platform,
        os: platform,
        cli: platform === "windows" ? "powershell" : "bash",
}
      
      const result = await callCCG(payload);
      setOutput(result);
    } catch (err) {
      setError(err.message || (lang === "fa" ? "خطا در ارتباط با سرور" : "Server connection error"));
    } finally {
      setLoading(false);
    }
}
  
  const explain = async () => {
    if (!input.trim()) {
      setError(lang === "fa" ? "لطفا دستور یا خطا را وارد کنید" : "Please enter command or error");
      return;
    }
    
    setLoading(true);
    setError("");
    setOutput({ markdown: "", tool: null });
    
    try {
      const payload = {
        mode: "explain",
        lang,
        user_request: input.trim(),
        targetCommand: input.trim(),
        knowledgeLevel,
}
      
      const result = await callCCG(payload);
      setOutput(result);
    } catch (err) {
      setError(err.message || (lang === "fa" ? "خطا در توضیح دستور" : "Command explanation error"));
    } finally {
      setLoading(false);
    }
}
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(lang === "fa" ? "کپی شد!" : "Copied!");
    });
}
  
  const clearAll = () => {
    setInput("");
    setOutput({ markdown: "", tool: null });
    setError("");
}
  
  return (
    <div className="space-y-6">
      {/* نوار ابزار بالا */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* پلتفرم */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("platform") || "Platform"}</span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="ccg-select text-sm"
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Tooltip text={PLATFORM_OPTIONS.find(p => p.value === platform)?.tips[lang] || ""}>
                <button className="ccg-btn-ghost p-1 text-xs">ℹ️</button>
              </Tooltip>
            </div>
            
            {/* نوع خروجی */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("outputType") || "Output"}</span>
              <select
                value={outputType}
                onChange={(e) => setOutputType(e.target.value)}
                className="ccg-select text-sm"
              >
                {OUTPUT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
              <Tooltip text={OUTPUT_TYPES.find(o => o.value === outputType)?.tips[lang] || ""}>
                <button className="ccg-btn-ghost p-1 text-xs">ℹ️</button>
              </Tooltip>
            </div>
            
            {/* سطح دانش */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("knowledge") || "Level"}</span>
              <select
                value={knowledgeLevel}
                onChange={(e) => setKnowledgeLevel(e.target.value)}
                className="ccg-select text-sm"
              >
                {KNOWLEDGE_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Tooltip text={KNOWLEDGE_LEVELS.find(k => k.value === knowledgeLevel)?.tips[lang] || ""}>
                <button className="ccg-btn-ghost p-1 text-xs">ℹ️</button>
              </Tooltip>
            </div>
            
            {/* دکمه‌های اکشن */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="ccg-btn px-3 py-1.5 text-sm"
              >
                {showAdvanced ? "▼ Advanced" : "▶ Advanced"}
              </button>
              <button
                onClick={() => setSwapLayout(!swapLayout)}
                className="ccg-btn px-3 py-1.5 text-sm"
              >
                ↔ {t("swapIO") || "Swap"}
              </button>
            </div>
          </div>
          
          {/* تنظیمات پیشرفته */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted)]">Shell</label>
                  <select className="ccg-select text-sm w-full">
                    <option>bash</option>
                    <option>zsh</option>
                    <option>powershell</option>
                    <option>cmd</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Version</label>
                  <input type="text" className="ccg-input text-sm w-full" placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Network Vendor</label>
                  <select className="ccg-select text-sm w-full">
                    <option>Cisco</option>
                    <option>MikroTik</option>
                    <option>Fortinet</option>
                    <option>Juniper</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Device Type</label>
                  <select className="ccg-select text-sm w-full">
                    <option>Router</option>
                    <option>Switch</option>
                    <option>Firewall</option>
                    <option>AP</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* شبکه اصلی */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ستون چپ - ورودی */}
          <div className={`ccg-card p-5 ${swapLayout ? "order-2" : "order-1"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{t("inputs") || "Input"}</h2>
              <button
                onClick={clearAll}
                className="ccg-btn-ghost text-sm px-3 py-1"
              >
                🗑️ Clear
              </button>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholderReq") || "Describe what you want to do..."}
              className="ccg-textarea w-full h-64 resize-none p-4 text-sm"
              rows={8}
            />
            
            {error && (
              <div className="mt-3 ccg-error p-3">
                <div className="font-medium">⚠️ {lang === "fa" ? "خطا" : "Error"}</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
            )}
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={generate}
                disabled={loading || !input.trim()}
                className="ccg-btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {lang === "fa" ? "در حال تولید..." : "Generating..."}
                  </>
                ) : (
                  <>
                    🚀 {t("generate") || "Generate"}
                  </>
                )}
              </button>
              
              <button
                onClick={explain}
                disabled={loading || !input.trim()}
                className="ccg-btn py-3 flex items-center justify-center gap-2"
              >
                📖 {lang === "fa" ? "توضیح دستور" : "Explain Command"}
              </button>
            </div>
            
            <div className="mt-4 text-xs text-[var(--muted)]">
              {lang === "fa" 
                ? "💡 نکته: برای بهترین نتایج، درخواست خود را به طور کامل توضیح دهید" 
                : "💡 Tip: Describe your request in detail for best results"}
            </div>
          </div>
          
          {/* ستون راست - خروجی */}
          <div className={`ccg-card p-5 ${swapLayout ? "order-1" : "order-2"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{t("output") || "Output"}</h2>
              {output.markdown && (
                <button
                  onClick={() => copyToClipboard(output.markdown)}
                  className="ccg-btn-ghost text-sm px-3 py-1"
                >
                  📋 Copy
                </button>
              )}
            </div>
            
            {output.tool ? (
              <div className="space-y-4">
                {/* دستور اصلی */}
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
                    <div className="text-xs text-gray-300 font-mono">Command</div>
                    <button
                      onClick={() => copyToClipboard(output.tool.primary?.command || output.markdown)}
                      className="text-xs text-gray-300 hover:text-white px-2 py-1"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto">
                    {output.tool.primary?.command || output.markdown}
                  </pre>
                </div>
                
                {/* توضیحات */}
                {output.tool.explanation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-sm font-medium mb-2">💡 Explanation</div>
                    <div className="text-sm">{output.tool.explanation}</div>
                  </div>
                )}
                
                {/* هشدارها */}
                {output.tool.warnings && output.tool.warnings.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="text-sm font-medium mb-2">⚠️ Warnings</div>
                    <ul className="text-sm space-y-1">
                      {output.tool.warnings.map((warn, i) => (
                        <li key={i}>• {warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : output.markdown ? (
              outputType === "command" || outputType === "python" ? (
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
                    <div className="text-xs text-gray-300 font-mono">
                      {outputType === "python" ? "Python" : "Command"}
                    </div>
                    <button
                      onClick={() => copyToClipboard(output.markdown)}
                      className="text-xs text-gray-300 hover:text-white px-2 py-1"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto">
                    {output.markdown}
                  </pre>
                </div>
              ) : (
                <div className="space-y-4">
                  <SectionedMarkdown markdown={output.markdown} lang={lang} />
                  <button
                    onClick={() => copyToClipboard(output.markdown)}
                    className="ccg-btn w-full py-2"
                  >
                    📋 Copy All Text
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-12 text-[var(--muted)]">
                <div className="text-4xl mb-4">✨</div>
                <div>{t("outputPlaceholder") || "Output will appear here"}</div>
                <div className="text-xs mt-2">
                  {lang === "fa" 
                    ? "یک درخواست وارد کنید و دکمه Generate را بزنید" 
                    : "Enter a request and click Generate"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

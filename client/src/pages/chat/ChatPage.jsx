import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import FeedbackButton from "../../components/ui/FeedbackButton";

const CHAT_MODES = [
  {
    id: "explain",
    title: { fa: "📖 توضیح دستور/کد", en: "📖 Explain Command/Code" },
    icon: "📖",
    description: {
      fa: "هر دستور یا قطعه کدی را برایتان توضیح می‌دهم",
      en: "I'll explain any command or code snippet for you"
    },
    placeholder: {
      fa: "دستور یا کدی که نیاز به توضیح دارید را وارد کنید...",
      en: "Enter command or code you need explained..."
    },
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "debug",
    title: { fa: "🐛 اشکال‌زدایی و خطایابی", en: "🐛 Debug & Error Analysis" },
    icon: "🐛",
    description: {
      fa: "خطاهای شما را تحلیل و راه حل ارائه می‌دهم",
      en: "I'll analyze your errors and provide solutions"
    },
    placeholder: {
      fa: "خطا یا مشکلی که با آن مواجه شدید را وارد کنید...",
      en: "Enter error or issue you're facing..."
    },
    color: "from-red-500 to-orange-500"
  },
  {
    id: "optimize",
    title: { fa: "⚡ بهینه‌سازی کد/اسکریپت", en: "⚡ Code/Script Optimization" },
    icon: "⚡",
    description: {
      fa: "کد یا اسکریپت شما را بررسی و بهینه می‌کنم",
      en: "I'll review and optimize your code or script"
    },
    placeholder: {
      fa: "کد یا اسکریپتی که نیاز به بهینه‌سازی دارد...",
      en: "Code or script that needs optimization..."
    },
    color: "from-green-500 to-emerald-600"
  },
  {
    id: "general",
    title: { fa: "💬 گفتگوی عمومی DevOps", en: "💬 General DevOps Chat" },
    icon: "💬",
    description: {
      fa: "همراه همیشگی شما برای سوالات DevOps",
      en: "Your constant companion for DevOps questions"
    },
    placeholder: {
      fa: "هر سوال DevOps دارید بپرسید...",
      en: "Ask any DevOps question..."
    },
    color: "from-purple-500 to-pink-500"
  }
];

const INITIAL_MESSAGES = {
  fa: [
    {
      id: "welcome",
      type: "bot",
      content: "سلام! من دستیار DevOps شما هستم. 🤖\n\nمی‌توانم در زمینه‌های زیر کمک کنم:\n• 📖 توضیح دستورات و کدها\n• 🐛 تحلیل و رفع خطاها\n• ⚡ بهینه‌سازی اسکریپت‌ها\n• 💬 پاسخ به سوالات DevOps\n\nلطفا حالت مورد نظر را انتخاب کرده و سوال خود را بپرسید."
    }
  ],
  en: [
    {
      id: "welcome",
      type: "bot",
      content: "Hello! I'm your DevOps assistant. 🤖\n\nI can help with:\n• 📖 Explaining commands and code\n• 🐛 Analyzing and fixing errors\n• ⚡ Optimizing scripts\n• 💬 Answering DevOps questions\n\nPlease select a mode and ask your question."
    }
  ]
};

export default function ChatPage() {
  const { lang } = useLanguage();
  const messagesEndRef = useRef(null);
  
  // State management با persistence
  const [messages, setMessages] = useState(INITIAL_MESSAGES[lang] || INITIAL_MESSAGES.en);
  const [input, setInput] = usePersistState("chat_input", "");
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = usePersistState("chat_mode", "explain");
  const [chatHistory, setChatHistory] = usePersistState("chat_history", []);
  
  const currentMode = CHAT_MODES.find(mode => mode.id === chatMode) || CHAT_MODES[0];

  // اسکرول به پایین هنگام اضافه شدن پیام جدید
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ذخیره تاریخچه چت
  useEffect(() => {
    if (messages.length > 1) {
      const userMessages = messages
        .filter(msg => msg.type === "user")
        .slice(-5); // فقط ۵ پیام آخر کاربر را ذخیره کن
      setChatHistory(userMessages);
    }
  }, [messages, setChatHistory]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
      mode: chatMode
    };

    // اضافه کردن پیام کاربر
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setLoading(true);

    try {
      const payload = {
        mode: "chat",
        lang,
        user_request: currentInput,
        chat_mode: chatMode,
        chat_history: chatHistory,
        context: `Chat mode: ${chatMode}, Language: ${lang}`
      };

      const result = await callCCG(payload);
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: result?.markdown || result?.result || "I couldn't generate a response. Please try again.",
        timestamp: new Date().toISOString(),
        mode: chatMode
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: lang === "fa" 
          ? "❌ متاسفانه در پردازش درخواست شما مشکلی پیش آمد. لطفا دوباره تلاش کنید."
          : "❌ Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES[lang] || INITIAL_MESSAGES.en);
    setInput("");
    setChatHistory([]);
  };

  const insertExample = () => {
    const examples = {
      explain: lang === "fa" 
        ? "این دستور لینوکس را توضیح بده: 'find /var/log -name \"*.log\" -mtime +7 -delete'"
        : "Explain this Linux command: 'find /var/log -name \"*.log\" -mtime +7 -delete'",
      debug: lang === "fa"
        ? "این خطای Docker را تحلیل کن: 'ERROR: unable to prepare context: unable to evaluate symlinks in Dockerfile path'"
        : "Analyze this Docker error: 'ERROR: unable to prepare context: unable to evaluate symlinks in Dockerfile path'",
      optimize: lang === "fa"
        ? "این اسکریپت Bash را بهینه کن: 'for file in *.txt; do cat \"$file\" >> combined.txt; done'"
        : "Optimize this Bash script: 'for file in *.txt; do cat \"$file\" >> combined.txt; done'",
      general: lang === "fa"
        ? "بهترین روش برای مانیتورینگ سرور لینوکس چیست؟"
        : "What's the best way to monitor a Linux server?"
    };
    
    setInput(examples[chatMode] || examples.explain);
  };

  const renderMessage = (message) => {
    const isBot = message.type === "bot";
    const isError = message.isError;
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isBot ? "" : "flex-row-reverse"}`}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot 
            ? isError ? "bg-red-500" : "bg-gradient-to-br from-blue-500 to-cyan-500"
            : "bg-gradient-to-br from-purple-500 to-pink-500"
        }`}>
          <span className="text-white text-sm">
            {isBot ? (isError ? "❌" : "🤖") : "👤"}
          </span>
        </div>
        
        {/* Message Content */}
        <div className={`flex-1 ${isBot ? "" : "text-right"}`}>
          <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 ${
            isBot
              ? isError 
                ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                : "bg-gray-100 dark:bg-gray-800"
              : "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          }`}>
            {/* Render content with code blocks */}
            <MessageContent content={message.content} isBot={isBot} />
            
            {/* Timestamp */}
            {message.timestamp && (
              <div className={`mt-2 text-xs ${
                isBot 
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-blue-100"
              }`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MessageContent = ({ content, isBot }) => {
    // تشخیص کد در متن
    const hasCode = content.includes("```");
    
    if (!hasCode) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }
    
    // جدا کردن کد از متن
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const code = part.slice(3, -3);
            const language = code.split("\n")[0] || "bash";
            const codeContent = code.replace(language, "").trim();
            
            return (
              <div key={index} className="my-2">
                <CodeBlock 
                  code={codeContent}
                  language={language}
                  showCopy={true}
                  maxHeight="250px"
                />
              </div>
            );
          }
          return <div key={index} className="whitespace-pre-wrap">{part}</div>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Feedback Button */}
      <div className="ccg-container">
        <FeedbackButton />
      </div>
      
      {/* Header */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h1 className="text-lg md:text-xl font-bold mb-3">
            {lang === "fa" ? "💬 دستیار DevOps هوشمند" : "💬 Smart DevOps Assistant"}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            {lang === "fa" 
              ? "همراه همیشگی شما برای حل مشکلات DevOps - توضیح، خطایابی، بهینه‌سازی"
              : "Your constant companion for DevOps problems - Explain, Debug, Optimize"
            }
          </p>
        </div>
      </div>

      {/* Chat Mode Selection */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h2 className="text-sm font-medium mb-3">
            {lang === "fa" ? "🎯 حالت گفتگو" : "🎯 Chat Mode"}
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {CHAT_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setChatMode(mode.id)}
                className={`
                  flex flex-col items-center p-3 rounded-lg text-center transition-all
                  ${chatMode === mode.id
                    ? `bg-gradient-to-br ${mode.color} text-white shadow-md`
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className="text-lg mb-1">{mode.icon}</span>
                <span className="text-xs font-medium">
                  {typeof mode.title === 'object' ? mode.title[lang] || mode.title.en : mode.title}
                </span>
              </button>
            ))}
          </div>
          
          {/* Mode Description */}
          <div className={`p-3 rounded-lg bg-gradient-to-r ${currentMode.color} bg-opacity-10`}>
            <div className="text-xs md:text-sm">
              <span className="font-medium">
                {typeof currentMode.title === 'object' 
                  ? currentMode.title[lang] || currentMode.title.en
                  : currentMode.title}:
              </span>
              <span className="mr-2">
                {typeof currentMode.description === 'object'
                  ? currentMode.description[lang] || currentMode.description.en
                  : currentMode.description}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          {/* Chat Messages */}
          <div className="h-[400px] overflow-y-auto mb-4 space-y-4 p-2">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
            
            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={typeof currentMode.placeholder === 'object'
                ? currentMode.placeholder[lang] || currentMode.placeholder.en
                : currentMode.placeholder
              }
              className="w-full h-24 p-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              disabled={loading}
            />
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2
                  ${loading || !input.trim()
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : `bg-gradient-to-r ${currentMode.color} text-white hover:opacity-90`
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{lang === "fa" ? "در حال پردازش..." : "Processing..."}</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>{lang === "fa" ? "ارسال پیام" : "Send Message"}</span>
                  </>
                )}
              </button>
              
              <button
                onClick={insertExample}
                disabled={loading}
                className="py-3 rounded-lg font-medium text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>{lang === "fa" ? "مثال بزن" : "Give Example"}</span>
              </button>
              
              <button
                onClick={clearChat}
                className="py-3 rounded-lg font-medium text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
              >
                <span>🗑️</span>
                <span>{lang === "fa" ? "پاک کردن چت" : "Clear Chat"}</span>
              </button>
            </div>
            
            {/* Helper Text */}
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {lang === "fa" 
                ? "می‌توانید با Enter ارسال کنید. Shift+Enter برای خط جدید."
                : "Press Enter to send. Shift+Enter for new line."
              }
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Tips */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h3 className="text-sm font-medium mb-2">
            💡 {lang === "fa" ? "نکات استفاده از چت" : "Chat Usage Tips"}
          </h3>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• {lang === "fa" ? "برای کدها از ``` استفاده کنید" : "Use ``` for code blocks"}</li>
            <li>• {lang === "fa" ? "خطاها را کامل کپی کنید" : "Copy errors completely"}</li>
            <li>• {lang === "fa" ? "محدوده سوال خود را مشخص کنید" : "Specify your question scope"}</li>
            <li>• {lang === "fa" ? "از مثال‌ها برای شروع سریع استفاده کنید" : "Use examples for quick start"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

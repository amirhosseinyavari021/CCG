// client/src/pages/chat/ChatPage.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState } from "../../hooks/usePersistState";
import { callChat } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import FeedbackButton from "../../components/ui/FeedbackButton";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CHAT_MODES = [
  {
    id: "debug",
    title: { fa: "🐛 تحلیل ارور/لاگ", en: "🐛 Error/Log Analysis" },
    description: {
      fa: "ارور، لاگ، خروجی ترمینال یا StackTrace رو بفرست تا مرحله‌به‌مرحله حل کنیم.",
      en: "Send error/log/terminal output/stack trace and we'll fix it step-by-step.",
    },
    placeholder: {
      fa: "ارور/لاگ را اینجا وارد کن… (ترجیحاً داخل ```) ",
      en: "Paste error/log here… (preferably inside ```) ",
    },
  },
  {
    id: "analyze",
    title: { fa: "🔎 تحلیل کد/اسکریپت", en: "🔎 Code/Script Analysis" },
    description: {
      fa: "کد یا اسکریپتت رو بفرست تا مشکل‌ها/بهینه‌سازی/امنیت رو پیشنهاد بدم.",
      en: "Send your code/script for review, fixes, optimization and security notes.",
    },
    placeholder: {
      fa: "کد/اسکریپت را اینجا وارد کن… (داخل ``` بهتره)",
      en: "Paste code/script here… (``` recommended)",
    },
  },
];

const INITIAL_MESSAGES = {
  fa: [
    {
      id: "init-fa",
      type: "bot",
      content:
        "سلام! 👋\n\nمن **دستیار فنی CCG** هستم.\n\n✅ فقط این دو کار را انجام می‌دهم:\n- 🐛 تحلیل **ارور/لاگ**\n- 🔎 تحلیل **کد/اسکریپت**\n\nلطفاً ارور/لاگ یا کد را ارسال کن (ترجیحاً داخل ```).",
      timestamp: new Date().toISOString(),
    },
  ],
  en: [
    {
      id: "init-en",
      type: "bot",
      content:
        "Hi 👋\n\nI'm **CCG Technical Assistant**.\n\n✅ I only do:\n- 🐛 **Error/log** analysis\n- 🔎 **Code/script** analysis\n\nPlease send an error/log or code (preferably inside ```).",
      timestamp: new Date().toISOString(),
    },
  ],
};

function isLikelyCodeOrLog(text) {
  const t = String(text || "");
  if (!t.trim()) return false;
  if (t.includes("```")) return true;
  if (/(exception|traceback|stack trace|error:|fatal:|permission denied|panic:)/i.test(t)) return true;
  if (/[{}()[\]=<>]|=>|::|->/.test(t) && t.length > 30) return true;
  if (/(sudo|apt|yum|dnf|pacman|systemctl|journalctl|docker|kubectl|npm|node|python|pip|git)\b/i.test(t)) return true;
  return false;
}

function TypingDots({ text }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-90">{text}</span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-current opacity-40 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-current opacity-40 animate-pulse [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-current opacity-40 animate-pulse [animation-delay:300ms]" />
      </span>
    </div>
  );
}

function streamText({ fullText, onChunk, onDone, chunkMs = 8, chunkSize = 4 }) {
  const text = String(fullText || "");
  let i = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    i = Math.min(text.length, i + chunkSize);
    onChunk(text.slice(0, i));
    if (i < text.length) setTimeout(tick, chunkMs);
    else onDone?.();
  };

  setTimeout(tick, chunkMs);
  return () => {
    stopped = true;
  };
}

/** ---- ChatGPT-like rules (behavior) but keep CCG theme (visual) ---- */
function looksLikeTinySnippet(code) {
  const t = String(code || "").trim();
  if (!t) return true;
  const lines = t.split("\n").filter(Boolean);
  if (lines.length > 2) return false;
  if (t.length > 120) return false;
  return true;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** ✅ NEW: user messages render as plain text (no markdown -> no <hr> from '---') */
function UserText({ text, lang }) {
  return (
    <div
      className={[
        "whitespace-pre-wrap break-words overflow-x-hidden",
        "text-sm leading-7",
        lang === "fa" ? "rtl-text" : "ltr-text",
      ].join(" ")}
      dir="auto"
    >
      {String(text || "")}
    </div>
  );
}

export default function ChatPage() {
  const { lang } = useLanguage();

  const [messages, setMessages] = useState(INITIAL_MESSAGES[lang] || INITIAL_MESSAGES.en);
  const [input, setInput] = usePersistState("chat_input", "");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = usePersistState("chat_session_id", "");
  const [chatMode, setChatMode] = usePersistState("chat_mode", "debug");
  const [errorText, setErrorText] = useState("");

  const activeStreamCancelRef = useRef(null);

  // Scroll behavior
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNavBtn, setShowNavBtn] = useState(false);

  const currentMode = useMemo(
    () => CHAT_MODES.find((m) => m.id === chatMode) || CHAT_MODES[0],
    [chatMode]
  );

  const computeScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const threshold = 140; // px
    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const atBottom = distanceToBottom <= threshold;

    setIsAtBottom(atBottom);

    // show button when user scrolled a bit or not at bottom
    const scrolledEnough = el.scrollTop >= 220;
    setShowNavBtn(scrolledEnough || !atBottom);
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const scrollToTop = useCallback((behavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior });
  }, []);

  // Initial compute
  useEffect(() => {
    computeScrollState();
  }, [computeScrollState]);

  // Auto-scroll like ChatGPT: only if user is near bottom
  useEffect(() => {
    if (isAtBottom) scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const onScroll = () => {
    computeScrollState();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    setErrorText("");

    const currentInput = input.trim();

    // Client-side guard for UX (server also blocks)
    if (!isLikelyCodeOrLog(currentInput)) {
      const msg =
        lang === "fa"
          ? "این چت فقط برای تحلیل ارور/لاگ یا تحلیل کد/اسکریپت است. لطفاً ارور/لاگ یا کد را ارسال کن (داخل ``` بهتره)."
          : "This chat only supports error/log or code/script analysis. Please paste error/log or code (``` recommended).";
      setErrorText(msg);
      return;
    }

    // stop any previous stream
    if (typeof activeStreamCancelRef.current === "function") {
      activeStreamCancelRef.current();
      activeStreamCancelRef.current = null;
    }

    // When user sends, we should go to bottom
    setIsAtBottom(true);
    setInput("");
    setLoading(true);

    const userMessage = {
      id: `u-${Date.now()}`,
      type: "user",
      content: currentInput,
      timestamp: new Date().toISOString(),
    };

    const botId = `b-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: botId,
        type: "bot",
        content: "",
        timestamp: new Date().toISOString(),
        isThinking: true,
        streaming: false,
      },
    ]);

    // Ensure UI goes bottom
    setTimeout(() => scrollToBottom("smooth"), 30);

    try {
      const payload = {
        sessionId: sessionId || undefined,
        lang,
        chat_mode: chatMode, // debug | analyze
        message: currentInput,
        profile: {
          lang,
          os: "linux",
          cli: "bash",
          chat_mode: chatMode,
        },
      };

      const result = await callChat(payload, { timeoutMs: 60_000 });

      if (result?.sessionId && result.sessionId !== sessionId) setSessionId(result.sessionId);

      const finalText =
        result?.markdown ||
        result?.output ||
        result?.result?.markdown ||
        (lang === "fa" ? "پاسخی دریافت نشد. دوباره تلاش کن." : "No response received. Please try again.");

      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { ...m, isThinking: false, streaming: true, content: "" } : m))
      );

      // streaming: while streaming, keep autoscroll ONLY if user is at bottom
      activeStreamCancelRef.current = streamText({
        fullText: finalText,
        onChunk: (partial) => {
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, content: partial, streaming: true } : m)));
          // keep at bottom while streaming if user hasn't moved away
          const el = scrollRef.current;
          if (el) {
            const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
            if (dist <= 180) scrollToBottom("auto");
          }
        },
        onDone: () => {
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, content: finalText, streaming: false } : m)));
          activeStreamCancelRef.current = null;
          // final snap if user is at bottom
          setTimeout(() => {
            const el = scrollRef.current;
            if (!el) return;
            const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
            if (dist <= 200) scrollToBottom("smooth");
          }, 30);
        },
      });
    } catch (e) {
      const status = e?.status;
      const data = e?.data;
      const code = data?.error?.code;

      // OUT_OF_SCOPE from server (no token burn)
      if (status === 400 && code === "OUT_OF_SCOPE") {
        const msg = data?.error?.userMessage || (lang === "fa" ? "خارج از محدوده." : "Out of scope.");
        setErrorText(msg);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, content: msg, streaming: false, isThinking: false, isError: true } : m
          )
        );
      } else {
        const msg =
          String(e?.message || "") === "REQUEST_TIMEOUT"
            ? lang === "fa"
              ? "⏳ زمان پاسخ‌دهی طولانی شد. دوباره تلاش کن."
              : "⏳ Request timed out. Please retry."
            : lang === "fa"
            ? "❌ در پردازش درخواست مشکلی پیش آمد. دوباره تلاش کن."
            : "❌ Error processing request. Please retry.";

        setErrorText(msg);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, content: msg, streaming: false, isThinking: false, isError: true } : m
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (typeof activeStreamCancelRef.current === "function") {
      activeStreamCancelRef.current();
      activeStreamCancelRef.current = null;
    }
    setMessages(INITIAL_MESSAGES[lang] || INITIAL_MESSAGES.en);
    setInput("");
    setSessionId("");
    setErrorText("");
    setTimeout(() => scrollToBottom("auto"), 0);
  };

  /** Chat markdown renderer:
   * - Keeps CCG theme
   * - Prevents "everything becomes copy-block"
   * - Code fences:
   *   - tiny => inline-highlight
   *   - normal => CodeBlock + copy
   */
  const ChatMarkdown = ({ text, isBot }) => {
    const content = String(text || "");

    // Slightly different prose sizing per bubble type
    const prose =
      "prose prose-invert max-w-none prose-p:leading-7 prose-li:leading-7 " +
      "prose-pre:p-0 prose-pre:m-0 prose-code:before:content-none prose-code:after:content-none";

    return (
      <div
        className={[
          prose,
          // critical: no horizontal scroll in normal text
          "overflow-x-hidden break-words",
          // keep rtl/ltr readability
          lang === "fa" ? "rtl-text" : "ltr-text",
        ].join(" ")}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Inline & block code handling
            code({ inline, className, children }) {
              const raw = String(children || "").replace(/\n$/, "");
              const match = /language-(\w+)/.exec(className || "");
              const language = match?.[1] || "bash";

              if (inline) {
                return (
                  <code
                    dir="ltr"
                    className={[
                      "px-1 py-0.5 rounded-md",
                      // keep CCG glass vibe
                      isBot ? "bg-white/10 border border-white/10" : "bg-black/20 border border-white/10",
                      "text-[0.95em] whitespace-nowrap",
                    ].join(" ")}
                  >
                    {children}
                  </code>
                );
              }

              // If fenced block is very small, don't turn it into a big copy-card
              if (looksLikeTinySnippet(raw)) {
                return (
                  <code
                    dir="ltr"
                    className={[
                      "px-1 py-0.5 rounded-md",
                      isBot ? "bg-white/10 border border-white/10" : "bg-black/20 border border-white/10",
                      "text-[0.95em] whitespace-pre-wrap break-words",
                    ].join(" ")}
                  >
                    {raw}
                  </code>
                );
              }

              // Normal block code => CodeBlock with copy (only where it makes sense)
              return (
                <div className="my-3">
                  <CodeBlock code={raw} language={language} showCopy={true} maxHeight="340px" />
                </div>
              );
            },

            // Links: prevent overflow
            a({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline underline-offset-4 hover:opacity-90"
                >
                  {children}
                </a>
              );
            },

            // Pre: keep it safe (in case of nested pre)
            pre({ children }) {
              return <div className="overflow-x-auto">{children}</div>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const renderMessage = (message) => {
    const isBot = message.type === "bot";
    const isError = message.isError;

    return (
      <div key={message.id} className={`flex gap-3 ${isBot ? "" : "flex-row-reverse"}`}>
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isBot
              ? isError
                ? "bg-red-500"
                : "bg-gradient-to-br from-blue-500 to-cyan-500"
              : "bg-gradient-to-br from-purple-500 to-pink-500"
          }`}
        >
          <span className="text-white text-sm">{isBot ? (isError ? "❌" : "🤖") : "👤"}</span>
        </div>

        <div className={`flex-1 ${isBot ? "" : "text-right"}`}>
          <div
            className={[
              "inline-block rounded-2xl px-4 py-3 shadow-sm",
              // Slightly tighter max-width for readability like popular chats (no super-wide paragraphs)
              "max-w-[92%] md:max-w-[78%] lg:max-w-[72ch]",
              isBot
                ? isError
                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  : "bg-gray-100 dark:bg-gray-800"
                : "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
            ].join(" ")}
          >
            {isBot && message.isThinking ? (
              <TypingDots text={lang === "fa" ? "در حال فکر کردن" : "Thinking"} />
            ) : isBot ? (
              <ChatMarkdown text={message.content} isBot />
            ) : (
              <UserText text={message.content} lang={lang} />
            )}

            {message.timestamp && (
              <div className={`mt-2 text-xs ${isBot ? "text-gray-500 dark:text-gray-400" : "text-blue-100"}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {isBot && message.streaming ? (
                  <span className="ml-2 opacity-70">{lang === "fa" ? "در حال تایپ…" : "typing…"}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const navBtnLabel = lang === "fa" ? (isAtBottom ? "بالا" : "پایین") : isAtBottom ? "Top" : "Bottom";

  const onNavClick = () => {
    if (isAtBottom) scrollToTop("smooth");
    else scrollToBottom("smooth");
  };

  // Icon: up/down
  const arrow = isAtBottom ? "⬆️" : "⬇️";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="ccg-container">
        <FeedbackButton />
      </div>

      <div className="ccg-container">
        <div className="ccg-card p-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold mb-1">
              {lang === "fa" ? "💬 دستیار فنی CCG" : "💬 CCG Technical Assistant"}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {lang === "fa" ? "فقط تحلیل ارور/لاگ و تحلیل کد/اسکریپت" : "Only error/log analysis and code/script analysis"}
            </p>
          </div>

          <button
            onClick={clearChat}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-xs md:text-sm"
          >
            {lang === "fa" ? "پاک‌کردن" : "Clear"}
          </button>
        </div>
      </div>

      {/* Modes (only 2) */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            {CHAT_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setChatMode(m.id)}
                className={`p-3 rounded-xl text-sm transition ${
                  chatMode === m.id
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <div className="font-semibold">{m.title[lang] || m.title.en}</div>
                <div className={`mt-1 text-xs ${chatMode === m.id ? "text-white/90" : "text-gray-500 dark:text-gray-400"}`}>
                  {m.description[lang] || m.description.en}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorText ? (
        <div className="ccg-container">
          <div className="ccg-card p-3 border border-red-500/30 bg-red-500/10 text-red-200 text-sm">{errorText}</div>
        </div>
      ) : null}

      <div className="ccg-container">
        <div className="ccg-card p-4 relative">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="max-h-[62vh] md:max-h-[68vh] overflow-y-auto overflow-x-hidden space-y-4 pr-1"
          >
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>

          {/* Smart scroll button (Bottom when away, Top when at bottom) */}
          {showNavBtn ? (
            <button
              type="button"
              onClick={onNavClick}
              className={[
                "absolute z-10",
                // position near bottom-right inside card
                "right-4 bottom-24 md:bottom-28",
                "rounded-full px-3 py-2",
                // keep CCG look
                "bg-black/30 hover:bg-black/40 dark:bg-white/10 dark:hover:bg-white/15",
                "border border-white/10",
                "backdrop-blur-xl shadow-lg",
                "text-xs md:text-sm flex items-center gap-2",
                "transition",
              ].join(" ")}
              title={navBtnLabel}
            >
              <span>{arrow}</span>
              <span className="opacity-90">{navBtnLabel}</span>
            </button>
          ) : null}

          <div className="mt-4 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={currentMode.placeholder[lang] || currentMode.placeholder.en}
              className="flex-1 rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`px-4 py-3 rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 ${
                loading || !input.trim()
                  ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{lang === "fa" ? "ارسال…" : "Sending…"}</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>{lang === "fa" ? "ارسال" : "Send"}</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {lang === "fa" ? "Enter برای ارسال • Shift+Enter برای خط جدید" : "Enter to send • Shift+Enter for new line"}
          </div>
        </div>
      </div>
    </div>
  );
}

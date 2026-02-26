// client/src/pages/chat/ChatPage.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState } from "../../hooks/usePersistState";

import {
  getChatRetention,
  listChatThreads,
  createChatThread,
  getChatMessages,
  renameChatThread,
  deleteChatThread,
  sendChatMessage,
} from "../../services/aiService";

import CodeBlock from "../../components/ui/CodeBlock";
import CopyButton from "../../components/ui/CopyButton";
import Tooltip from "../../components/ui/Tooltip";
import FeedbackButton from "../../components/ui/FeedbackButton";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function toThreadId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const cand = v._id ?? v.id ?? v.threadId;
    if (cand) return String(cand);
  }
  return String(v);
}

function looksLikeTinySnippet(code) {
  const t = String(code || "").trim();
  if (!t) return true;
  const lines = t.split("\n").filter(Boolean);
  if (lines.length > 2) return false;
  if (t.length > 120) return false;
  return true;
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
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

function IconBtn({ title, onClick, children, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl px-2.5 py-1.5 text-xs",
        "border border-white/10",
        "bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/15",
        "backdrop-blur-xl transition",
        disabled ? "opacity-50 cursor-not-allowed" : "opacity-95",
        className,
      ].join(" ")}
      title={title}
    >
      {children}
    </button>
  );
}

function Modal({ open, title, children, lang, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 flex items-center justify-center p-4" dir={lang === "fa" ? "rtl" : "ltr"}>
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 dark:bg-white/10 backdrop-blur-2xl shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[var(--text)] truncate">{title}</div>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-black/20 dark:bg-white/10 px-3 py-1.5 text-xs hover:opacity-90"
              onClick={onClose}
            >
              {lang === "fa" ? "بستن" : "Close"}
            </button>
          </div>
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ThreadMenuPortal({ open, x, y, lang, pinned, onClose, onRename, onTogglePin, onDelete }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    const onMouse = (e) => {
      const el = document.getElementById("ccg-thread-menu");
      if (el && !el.contains(e.target)) onClose?.();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouse);
    };
  }, [open, onClose]);

  if (!open) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const menuW = 220;
  const menuH = 156;

  const left = Math.max(12, Math.min(x, vw - menuW - 12));
  const top = Math.max(12, Math.min(y, vh - menuH - 12));

  const t = {
    rename: lang === "fa" ? "تغییر نام" : "Rename",
    pin: lang === "fa" ? "پین" : "Pin",
    unpin: lang === "fa" ? "برداشتن پین" : "Unpin",
    del: lang === "fa" ? "حذف" : "Delete",
  };

  return createPortal(
    <div id="ccg-thread-menu" dir={lang === "fa" ? "rtl" : "ltr"} className="fixed z-[9999]" style={{ left, top }}>
      <div className="w-[220px] rounded-2xl border border-white/10 bg-black/75 dark:bg-white/10 backdrop-blur-2xl shadow-xl overflow-hidden">
        <button
          type="button"
          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition"
          onClick={() => {
            onClose?.();
            onRename?.();
          }}
        >
          ✏️ {t.rename}
        </button>

        <button
          type="button"
          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition"
          onClick={() => {
            onClose?.();
            onTogglePin?.();
          }}
        >
          📌 {pinned ? t.unpin : t.pin}
        </button>

        <div className="h-px bg-white/10" />

        <button
          type="button"
          className="w-full text-left px-3 py-2 text-sm hover:bg-red-500/15 transition text-red-200"
          onClick={() => {
            onClose?.();
            onDelete?.();
          }}
        >
          🗑️ {t.del}
        </button>
      </div>
    </div>,
    document.body
  );
}

function MobileSidebar({ open, lang, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <div className={`fixed inset-0 z-[9998] ${open ? "" : "pointer-events-none"}`} dir={lang === "fa" ? "rtl" : "ltr"}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onMouseDown={onClose} />
      <div
        className={[
          "absolute top-0 bottom-0 w-[86%] max-w-[320px]",
          lang === "fa" ? "right-0" : "left-0",
          "transition-transform duration-200",
          open ? "translate-x-0" : lang === "fa" ? "translate-x-full" : "-translate-x-full",
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-full border border-white/10 bg-black/70 dark:bg-white/10 backdrop-blur-2xl">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function ChatPage() {
  const { lang } = useLanguage();

  const [activeThreadId, setActiveThreadId] = usePersistState("chat_thread_id", "");
  const [input, setInput] = usePersistState("chat_input", "");
  const [pinnedIds, setPinnedIds] = usePersistState("ccg_chat_pins", []);
  const [sidebarOpen, setSidebarOpen] = usePersistState("ccg_chat_sidebar_open", true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [threads, setThreads] = useState([]);
  const [threadsQuery, setThreadsQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [retentionDays, setRetentionDays] = useState(14);

  const [loading, setLoading] = useState(false);

  const [editTargetMessageId, setEditTargetMessageId] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [regenCount, setRegenCount] = useState(0);

  const inFlightAbortRef = useRef(null);
  const activeStreamCancelRef = useRef(null);
  const stopByUserRef = useRef(false);

  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const [threadMenu, setThreadMenu] = useState({ open: false, x: 0, y: 0, threadId: "" });
  const [renameModal, setRenameModal] = useState({ open: false, threadId: "", value: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, threadId: "" });

  const pinnedSet = useMemo(() => new Set((pinnedIds || []).map(String)), [pinnedIds]);

  const computeScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 140;
    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsAtBottom(distanceToBottom <= threshold);
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => computeScrollState(), [computeScrollState]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const onScroll = () => computeScrollState();

  const filteredThreads = useMemo(() => {
    const q = threadsQuery.trim().toLowerCase();
    const list = !q ? threads : threads.filter((t) => s(t.title).toLowerCase().includes(q));

    const pinned = [];
    const normal = [];
    for (const t of list) {
      if (pinnedSet.has(String(t._id))) pinned.push(t);
      else normal.push(t);
    }
    return [...pinned, ...normal];
  }, [threads, threadsQuery, pinnedSet]);

  const activeThread = useMemo(() => {
    const a = toThreadId(activeThreadId);
    return threads.find((t) => String(t._id) === a) || null;
  }, [threads, activeThreadId]);

  async function refreshThreads(nextActiveId) {
    const r = await listChatThreads({ lang });
    const list = r?.threads || [];
    setThreads(list);

    if (nextActiveId) {
      setActiveThreadId(String(nextActiveId));
      return;
    }
    if (!activeThreadId && list.length) setActiveThreadId(String(list[0]._id));
  }

  async function loadRetention() {
    try {
      const r = await getChatRetention();
      if (r?.retentionDays) setRetentionDays(Number(r.retentionDays) || 14);
    } catch {}
  }

  async function loadMessages(threadId) {
    const tid = toThreadId(threadId);
    if (!tid) return;

    // ✅ IMPORTANT: aiService expects (threadId), not ({threadId})
    const r = await getChatMessages(tid, { lang });
    const msgs = r?.messages || [];
    setMessages(
      msgs.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        ts: m.createdAt || m.ts || new Date().toISOString(),
        editedFromMessageId: m.editedFromMessageId || null,
      }))
    );
    setRegenCount(Number(r?.thread?.regenCount || 0));
  }

  useEffect(() => {
    loadRetention();
    refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const tid = toThreadId(activeThreadId);
    if (tid) loadMessages(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  const stopAll = () => {
    stopByUserRef.current = true;

    if (inFlightAbortRef.current) {
      try {
        inFlightAbortRef.current.abort();
      } catch {}
      inFlightAbortRef.current = null;
    }

    if (typeof activeStreamCancelRef.current === "function") {
      activeStreamCancelRef.current();
      activeStreamCancelRef.current = null;
    }

    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i]?.role === "assistant" && (next[i]?.isThinking || next[i]?.streaming)) {
          next[i] = {
            ...next[i],
            isThinking: false,
            streaming: false,
            content: lang === "fa" ? "⛔ متوقف شد" : "⛔ Stopped",
            isError: false,
          };
          break;
        }
      }
      return next;
    });

    setLoading(false);
  };

  const newChat = async () => {
    stopByUserRef.current = false;
    stopAll();

    const r = await createChatThread({ lang });
    const id = toThreadId(r?.thread?._id);

    if (id) {
      await refreshThreads(id);
      await loadMessages(id);
      setMobileSidebarOpen(false);
      setInput("");
      setEditMode(false);
      setEditTargetMessageId(null);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: lang === "fa" ? "❌ ساخت چت جدید ناموفق بود." : "❌ Failed to create a new chat.",
          ts: new Date().toISOString(),
          isError: true,
        },
      ]);
    }
  };

  const togglePin = (threadId) => {
    const id = String(threadId);
    setPinnedIds((prev) => {
      const arr = Array.isArray(prev) ? prev.map(String) : [];
      if (arr.includes(id)) return arr.filter((x) => x !== id);
      return [id, ...arr].slice(0, 50);
    });
  };

  const openThreadMenu = (e, threadId) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setThreadMenu({
      open: true,
      x: rect.left + rect.width - 220,
      y: rect.bottom + 8,
      threadId: String(threadId),
    });
  };

  const closeThreadMenu = () => setThreadMenu((p) => ({ ...p, open: false }));

  const openRenameModal = (threadId) => {
    const tid = String(threadId);
    const t = threads.find((x) => String(x._id) === tid);
    const title = String(t?.title || "").trim() || (lang === "fa" ? "چت جدید" : "New chat");
    setRenameModal({ open: true, threadId: tid, value: title });
  };

  const submitRename = async () => {
    const tid = toThreadId(renameModal.threadId);
    const title = String(renameModal.value || "").trim().slice(0, 44);
    if (!tid || !title) return;

    try {
      // ✅ IMPORTANT: aiService expects (threadId, title)
      await renameChatThread(tid, title, { lang });
      setRenameModal({ open: false, threadId: "", value: "" });
      await refreshThreads();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: lang === "fa" ? "❌ تغییر نام ناموفق بود." : "❌ Rename failed.",
          ts: new Date().toISOString(),
          isError: true,
        },
      ]);
    }
  };

  const openDeleteModal = (threadId) => setDeleteModal({ open: true, threadId: String(threadId) });

  const confirmDelete = async () => {
    const threadId = toThreadId(deleteModal.threadId);
    if (!threadId) return;

    stopByUserRef.current = false;
    stopAll();

    try {
      // ✅ IMPORTANT: aiService expects (threadId)
      await deleteChatThread(threadId, { lang });

      if (pinnedSet.has(String(threadId))) {
        setPinnedIds((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x) !== String(threadId)) : []));
      }

      setDeleteModal({ open: false, threadId: "" });

      // refresh then decide next active
      const r = await listChatThreads({ lang });
      const list = r?.threads || [];
      setThreads(list);

      const nextActive = list[0]?._id ? String(list[0]._id) : "";
      setActiveThreadId(nextActive);
      setMobileSidebarOpen(false);

      if (nextActive) await loadMessages(nextActive);
      else setMessages([]);
    } catch {
      setDeleteModal({ open: false, threadId: "" });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: lang === "fa" ? "❌ حذف گفتگو ناموفق بود." : "❌ Delete failed.",
          ts: new Date().toISOString(),
          isError: true,
        },
      ]);
    }
  };

  const canRegen = useMemo(() => {
    const last = messages[messages.length - 1];
    return !loading && last?.role === "assistant" && regenCount < 3;
  }, [messages, loading, regenCount]);

  const ChatMarkdown = ({ text, isBot }) => {
    const content = String(text || "");
    const prose =
      "prose prose-invert max-w-none prose-p:leading-7 prose-li:leading-7 " +
      "prose-pre:p-0 prose-pre:m-0 prose-code:before:content-none prose-code:after:content-none";

    return (
      <div className={[prose, "overflow-x-hidden break-words", lang === "fa" ? "rtl-text" : "ltr-text"].join(" ")}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
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
                      isBot ? "bg-white/10 border border-white/10" : "bg-black/20 border border-white/10",
                      "text-[0.95em] whitespace-nowrap",
                    ].join(" ")}
                  >
                    {children}
                  </code>
                );
              }

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

              return (
                <div className="my-3">
                  <CodeBlock code={raw} language={language} showCopy={true} maxHeight="340px" />
                </div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const renderMessage = (m, idx) => {
    const isBot = m.role === "assistant";
    const isLast = idx === messages.length - 1;

    return (
      <div key={m.id || idx} className={`flex gap-3 ${isBot ? "" : "flex-row-reverse"}`}>
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isBot
              ? m.isError
                ? "bg-gradient-to-br from-red-500 to-rose-500"
                : "bg-gradient-to-br from-blue-500 to-cyan-500"
              : "bg-gradient-to-br from-purple-500 to-pink-500"
          }`}
        >
          <span className="text-white text-sm">{isBot ? "🤖" : "👤"}</span>
        </div>

        <div className={`flex-1 ${isBot ? "" : "text-right"}`}>
          <div
            className={[
              "inline-block rounded-2xl px-4 py-3 shadow-sm",
              "max-w-[96%] md:max-w-[80%] lg:max-w-[76ch]",
              isBot
                ? m.isError
                  ? "bg-red-500/10 border border-red-500/25"
                  : "bg-gray-100 dark:bg-gray-800 border border-white/5"
                : "bg-gradient-to-r from-blue-500 to-purple-600 text-white border border-white/5",
            ].join(" ")}
          >
            {m.isThinking ? (
              <TypingDots text={lang === "fa" ? "در حال فکر کردن" : "Thinking"} />
            ) : isBot ? (
              <ChatMarkdown text={m.content} isBot />
            ) : (
              <UserText text={m.content} lang={lang} />
            )}

            <div className={`mt-3 flex items-center justify-between gap-2 ${isBot ? "text-gray-500 dark:text-gray-400" : "text-blue-100"}`}>
              <div className="text-xs">{fmtTime(m.ts)}</div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <CopyButton text={m.content} lang={lang} />
                </div>

                {!isBot ? (
                  <Tooltip text={lang === "fa" ? "ویرایش و ادامه از اینجا" : "Edit and continue from here"} position="top">
                    <span>
                      <IconBtn
                        title={lang === "fa" ? "ویرایش" : "Edit"}
                        onClick={() => {
                          setEditMode(true);
                          setEditTargetMessageId(m.id);
                          setInput(m.content || "");
                          setTimeout(() => scrollToBottom("smooth"), 50);
                        }}
                        disabled={loading}
                      >
                        ✏️
                      </IconBtn>
                    </span>
                  </Tooltip>
                ) : null}

                {isBot && isLast ? (
                  <Tooltip
                    text={lang === "fa" ? `ریجنریت (باقی‌مانده: ${Math.max(0, 3 - regenCount)})` : `Regenerate (left: ${Math.max(0, 3 - regenCount)})`}
                    position="top"
                  >
                    <span>
                      <IconBtn title={lang === "fa" ? "ریجنریت" : "Regenerate"} onClick={() => doRegenerate()} disabled={!canRegen}>
                        🔁
                      </IconBtn>
                    </span>
                  </Tooltip>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ensureThread = async () => {
    const current = toThreadId(activeThreadId);
    if (current) return current;

    const r = await createChatThread({ lang });
    const id = toThreadId(r?.thread?._id);
    if (id) {
      await refreshThreads(id);
      return id;
    }
    return "";
  };

  const doSend = async () => {
    if (!input.trim() || loading) return;

    stopByUserRef.current = false;

    const text = input.trim();
    setLoading(true);

    const threadId = await ensureThread();
    if (!threadId) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: lang === "fa" ? "❌ ساخت چت جدید ناموفق بود." : "❌ Failed to create chat thread.",
          ts: new Date().toISOString(),
          isError: true,
        },
      ]);
      return;
    }

    if (typeof activeStreamCancelRef.current === "function") {
      activeStreamCancelRef.current();
      activeStreamCancelRef.current = null;
    }

    const controller = new AbortController();
    inFlightAbortRef.current = controller;

    const userLocalId = `u-${Date.now()}`;
    const botLocalId = `b-${Date.now() + 1}`;
    const editedFrom = editMode ? editTargetMessageId : null;

    setMessages((prev) => [
      ...prev,
      { id: userLocalId, role: "user", content: text, ts: new Date().toISOString() },
      { id: botLocalId, role: "assistant", content: "", ts: new Date().toISOString(), isThinking: true },
    ]);

    setInput("");
    setEditMode(false);
    setEditTargetMessageId(null);

    setTimeout(() => scrollToBottom("smooth"), 30);

    try {
      // ✅ IMPORTANT: sendChatMessage(threadId, body, opts)
      const result = await sendChatMessage(
        threadId,
        { lang, message: text, regenerate: false, editedFromMessageId: editedFrom },
        { timeoutMs: 120_000, signal: controller.signal }
      );

      await refreshThreads(threadId);

      const finalText =
        result?.markdown ||
        result?.output ||
        (lang === "fa" ? "پاسخی دریافت نشد. دوباره تلاش کن." : "No response received. Please try again.");

      setRegenCount(Number(result?.regenCount || 0));

      setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, isThinking: false, content: "", streaming: true } : m)));

      activeStreamCancelRef.current = streamText({
        fullText: finalText,
        onChunk: (partial) => {
          setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, content: partial, streaming: true } : m)));
          const el = scrollRef.current;
          if (el) {
            const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
            if (dist <= 180) scrollToBottom("auto");
          }
        },
        onDone: async () => {
          setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, content: finalText, streaming: false } : m)));
          activeStreamCancelRef.current = null;
          inFlightAbortRef.current = null;
          await loadMessages(threadId);
        },
      });
    } catch (e) {
      const aborted = stopByUserRef.current || inFlightAbortRef.current?.signal?.aborted || e?.name === "AbortError";
      if (aborted) {
        setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, isThinking: false, content: lang === "fa" ? "⛔ متوقف شد" : "⛔ Stopped" } : m)));
        setLoading(false);
        inFlightAbortRef.current = null;
        return;
      }

      let msg = lang === "fa" ? "❌ خطا در پردازش درخواست. دوباره تلاش کن." : "❌ Error processing request. Please retry.";
      if (String(e?.message || "") === "REQUEST_TIMEOUT") msg = lang === "fa" ? "⏳ زمان پاسخ‌دهی طولانی شد. دوباره تلاش کن." : "⏳ Request timed out. Please retry.";

      setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, isThinking: false, content: msg, isError: true } : m)));
    } finally {
      setLoading(false);
      inFlightAbortRef.current = null;
      stopByUserRef.current = false;
    }
  };

  const doRegenerate = async () => {
    const threadId = toThreadId(activeThreadId);
    if (!threadId || loading) return;

    stopByUserRef.current = false;
    setLoading(true);

    if (typeof activeStreamCancelRef.current === "function") {
      activeStreamCancelRef.current();
      activeStreamCancelRef.current = null;
    }

    const controller = new AbortController();
    inFlightAbortRef.current = controller;

    const botLocalId = `b-${Date.now() + 1}`;
    setMessages((prev) => [...prev, { id: botLocalId, role: "assistant", content: "", ts: new Date().toISOString(), isThinking: true }]);
    setTimeout(() => scrollToBottom("smooth"), 30);

    try {
      // ✅ IMPORTANT: sendChatMessage(threadId, body, opts)
      const result = await sendChatMessage(
        threadId,
        { lang, message: "", regenerate: true },
        { timeoutMs: 120_000, signal: controller.signal }
      );

      await refreshThreads(threadId);

      const finalText =
        result?.markdown ||
        result?.output ||
        (lang === "fa" ? "پاسخی دریافت نشد. دوباره تلاش کن." : "No response received. Please try again.");

      setRegenCount(Number(result?.regenCount || 0));
      setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, isThinking: false, content: "", streaming: true } : m)));

      activeStreamCancelRef.current = streamText({
        fullText: finalText,
        onChunk: (partial) => {
          setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, content: partial, streaming: true } : m)));
        },
        onDone: async () => {
          setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, content: finalText, streaming: false } : m)));
          activeStreamCancelRef.current = null;
          inFlightAbortRef.current = null;
          await loadMessages(threadId);
        },
      });
    } catch (e) {
      const aborted = stopByUserRef.current || inFlightAbortRef.current?.signal?.aborted || e?.name === "AbortError";
      if (aborted) {
        setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, isThinking: false, content: lang === "fa" ? "⛔ متوقف شد" : "⛔ Stopped" } : m)));
        setLoading(false);
        inFlightAbortRef.current = null;
        return;
      }

      let msg = lang === "fa" ? "❌ خطا در ریجنریت. دوباره تلاش کن." : "❌ Regenerate failed. Please retry.";
      setMessages((prev) => prev.map((m) => (m.id === botLocalId ? { ...m, isThinking: false, content: msg, isError: true } : m)));
    } finally {
      setLoading(false);
      inFlightAbortRef.current = null;
      stopByUserRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const shouldSuggestRename = useMemo(() => {
    if (!activeThread) return false;
    if (!messages || messages.length < 2) return false;
    const t = String(activeThread.title || "").trim();
    if (!t) return true;
    if (t.length <= 12) return true;
    return false;
  }, [activeThread, messages]);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text)] truncate">{lang === "fa" ? "گفتگوها" : "Chats"}</div>
          <div className="text-[11px] text-[var(--muted)] truncate">
            {lang === "fa" ? `نگه‌داری تا ${retentionDays} روز` : `Retained up to ${retentionDays} days`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconBtn title={lang === "fa" ? "چت جدید" : "New chat"} onClick={newChat} disabled={loading}>
            ➕
          </IconBtn>
          <IconBtn title={lang === "fa" ? "بستن فهرست" : "Collapse"} onClick={() => setSidebarOpen(false)} className="hidden md:inline-flex">
            ⟨
          </IconBtn>
        </div>
      </div>

      <div className="p-3">
        <input
          value={threadsQuery}
          onChange={(e) => setThreadsQuery(e.target.value)}
          placeholder={lang === "fa" ? "جستجو…" : "Search…"}
          className="w-full rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto px-3 pb-3 space-y-2">
        {filteredThreads.map((t) => {
          const isActive = String(t._id) === toThreadId(activeThreadId);
          const title = String(t.title || "").trim() || (lang === "fa" ? "چت جدید" : "New chat");
          const isPinned = pinnedSet.has(String(t._id));

          return (
            <div
              key={t._id}
              className={[
                "rounded-2xl border border-white/10 p-3",
                "bg-black/10 dark:bg-white/5 backdrop-blur-xl",
                isActive ? "ring-1 ring-blue-500/60" : "hover:bg-black/15 dark:hover:bg-white/10",
                "transition cursor-pointer",
              ].join(" ")}
              onClick={() => {
                setActiveThreadId(String(t._id));
                setMobileSidebarOpen(false);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text)] truncate flex items-center gap-2">
                    {isPinned ? <span title={lang === "fa" ? "پین شده" : "Pinned"}>📌</span> : null}
                    <span className="truncate">{title}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-xl px-2 py-1 text-xs border border-white/10 bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/15 transition"
                  onClick={(e) => openThreadMenu(e, t._id)}
                  title={lang === "fa" ? "گزینه‌ها" : "Options"}
                >
                  ⋯
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const collapsedSidebar = (
    <div className="h-full flex flex-col items-center py-3 gap-3">
      <IconBtn title={lang === "fa" ? "باز کردن فهرست" : "Open sidebar"} onClick={() => setSidebarOpen(true)}>
        ⟩
      </IconBtn>
      <IconBtn title={lang === "fa" ? "چت جدید" : "New chat"} onClick={newChat} disabled={loading}>
        ➕
      </IconBtn>
      <IconBtn title={lang === "fa" ? "فهرست" : "Menu"} onClick={() => setMobileSidebarOpen(true)} className="md:hidden">
        ☰
      </IconBtn>
    </div>
  );

  const headerBar = (
    <div className="ccg-card px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm md:text-base font-bold truncate">{lang === "fa" ? "💬 دستیار فنی CCG" : "💬 CCG Technical Assistant"}</div>
        <div className="text-[11px] md:text-xs text-gray-600 dark:text-gray-400 truncate">
          {lang === "fa" ? "تحلیل ارور/لاگ و تحلیل/بهبود کد — کنترل مصرف و تمرکز روی حل مسئله" : "Logs/errors + code analysis — cost-controlled & focused"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden rounded-xl px-3 py-2 text-xs border border-white/10 bg-black/10 dark:bg-white/5 hover:opacity-90 transition"
        >
          {lang === "fa" ? "فهرست" : "Menu"}
        </button>

        <IconBtn title={lang === "fa" ? "توقف" : "Stop"} onClick={stopAll} disabled={!loading}>
          ⛔ {lang === "fa" ? "توقف" : "Stop"}
        </IconBtn>
      </div>
    </div>
  );

  const placeholder =
    editMode && editTargetMessageId
      ? lang === "fa"
        ? "در حال ویرایش… (ارسال = ادامه از این نقطه)"
        : "Editing… (Send = continue from here)"
      : lang === "fa"
      ? "پیامت را بنویس…"
      : "Type your message…";

  return (
    <div className="space-y-4 md:space-y-6">
      <ThreadMenuPortal
        open={threadMenu.open}
        x={threadMenu.x}
        y={threadMenu.y}
        lang={lang}
        pinned={pinnedSet.has(threadMenu.threadId)}
        onClose={closeThreadMenu}
        onRename={() => openRenameModal(threadMenu.threadId)}
        onTogglePin={() => togglePin(threadMenu.threadId)}
        onDelete={() => openDeleteModal(threadMenu.threadId)}
      />

      <Modal open={renameModal.open} lang={lang} title={lang === "fa" ? "تغییر نام گفتگو" : "Rename chat"} onClose={() => setRenameModal({ open: false, threadId: "", value: "" })}>
        <div className="space-y-3">
          <input
            autoFocus
            value={renameModal.value}
            onChange={(e) => setRenameModal((p) => ({ ...p, value: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
            className="w-full rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={lang === "fa" ? "عنوان گفتگو…" : "Chat title…"}
          />
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="rounded-xl px-3 py-2 text-xs border border-white/10 bg-black/20 dark:bg-white/10 hover:opacity-90" onClick={() => setRenameModal({ open: false, threadId: "", value: "" })}>
              {lang === "fa" ? "لغو" : "Cancel"}
            </button>
            <button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90" onClick={submitRename}>
              {lang === "fa" ? "ذخیره" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal.open} lang={lang} title={lang === "fa" ? "حذف گفتگو" : "Delete chat"} onClose={() => setDeleteModal({ open: false, threadId: "" })}>
        <div className="space-y-3">
          <div className="text-sm text-[var(--text)]">
            {lang === "fa" ? "آیا از حذف این گفتگو مطمئن هستی؟ این عمل قابل بازگشت نیست." : "Are you sure? This action cannot be undone."}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="rounded-xl px-3 py-2 text-xs border border-white/10 bg-black/20 dark:bg-white/10 hover:opacity-90" onClick={() => setDeleteModal({ open: false, threadId: "" })}>
              {lang === "fa" ? "لغو" : "Cancel"}
            </button>
            <button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold bg-red-500/80 text-white hover:bg-red-500" onClick={confirmDelete}>
              {lang === "fa" ? "حذف" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      <MobileSidebar open={mobileSidebarOpen} lang={lang} onClose={() => setMobileSidebarOpen(false)}>
        {sidebarContent}
      </MobileSidebar>

      <div className="ccg-container">
        <FeedbackButton />
      </div>

      <div className="ccg-container">{headerBar}</div>

      <div className="ccg-container">
        <div className="ccg-card h-[78vh] md:h-[80vh] overflow-hidden">
          <div className="h-full flex">
            <div className="hidden md:block h-full border-r border-white/10">
              <div className={sidebarOpen ? "w-[320px] h-full" : "w-[56px] h-full"}>{sidebarOpen ? sidebarContent : collapsedSidebar}</div>
            </div>

            <div className="flex-1 h-full flex flex-col">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {activeThread ? activeThread.title || (lang === "fa" ? "چت جدید" : "New chat") : lang === "fa" ? "بدون چت" : "No chat"}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">{lang === "fa" ? `ریجنریت: ${regenCount}/3` : `Regenerate: ${regenCount}/3`}</div>
                </div>

                <div className="flex items-center gap-2">
                  <IconBtn title={lang === "fa" ? "چت جدید" : "New chat"} onClick={newChat} disabled={loading}>
                    ➕
                  </IconBtn>
                  <IconBtn title={lang === "fa" ? "ریجنریت" : "Regenerate"} onClick={doRegenerate} disabled={!canRegen}>
                    🔁
                  </IconBtn>
                </div>
              </div>

              {shouldSuggestRename ? (
                <div className="px-4 pt-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 dark:bg-white/5 backdrop-blur-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--muted)]">
                      {lang === "fa" ? "برای نظم بهتر، یک نام برای این گفتگو انتخاب کن." : "For better organization, choose a name for this chat."}
                    </div>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
                      onClick={() => openRenameModal(toThreadId(activeThreadId))}
                    >
                      {lang === "fa" ? "تغییر نام" : "Rename"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 px-4 py-4">
                {messages.length ? (
                  messages.map(renderMessage)
                ) : (
                  <div className="text-sm text-[var(--muted)]">{lang === "fa" ? "شروع کن؛ هر سوالی داری بپرس." : "Start — ask anything."}</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder={placeholder}
                    className="flex-1 rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />

                  {editMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode(false);
                        setEditTargetMessageId(null);
                        setInput("");
                      }}
                      className="px-4 py-3 rounded-xl text-sm border border-white/10 bg-black/20 dark:bg-white/10 hover:opacity-90"
                      disabled={loading}
                    >
                      {lang === "fa" ? "لغو" : "Cancel"}
                    </button>
                  ) : null}

                  <button
                    onClick={doSend}
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

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
                  <span>{lang === "fa" ? "Enter برای ارسال • Shift+Enter برای خط جدید" : "Enter to send • Shift+Enter for new line"}</span>
                  <span className="opacity-80">{lang === "fa" ? "درخواستت را دقیق‌تر بگو تا هزینه کمتر شود." : "Be specific to reduce cost."}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

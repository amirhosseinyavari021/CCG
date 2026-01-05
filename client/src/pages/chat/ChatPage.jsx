import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";
import { chatCreateSession, chatSendMessage } from "../../services/aiService";

const LS_PROFILE = "ccg_profile_v1";
const LS_CHAT = "ccg_chat_v1";
const LS_SESSION = "ccg_chat_session_v1";

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

export default function ChatPage() {
  const { t, lang } = useLanguage();

  const [profile] = useState(() => safeParse(localStorage.getItem(LS_PROFILE) || "{}", {}));
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(LS_SESSION) || "");
  const [messages, setMessages] = useState(() => safeParse(localStorage.getItem(LS_CHAT) || "[]", []));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const boxRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LS_CHAT, JSON.stringify(messages));
    // scroll
    setTimeout(() => boxRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 30);
  }, [messages]);

  async function ensureSession() {
    if (sessionId) return sessionId;
    const res = await chatCreateSession(profile);
    const sid = res?.sessionId || "";
    if (!sid) throw new Error("No sessionId");
    setSessionId(sid);
    localStorage.setItem(LS_SESSION, sid);
    return sid;
  }

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setLoading(true);
    setApiErr("");

    const next = [...messages, { role: "user", text: msg }];
    setMessages(next);
    setInput("");

    try {
      const sid = await ensureSession();
      const res = await chatSendMessage({ sessionId: sid, message: msg, profile });
      const out = res?.output || res?.result || "";
      setMessages((prev) => [...prev, { role: "assistant", text: out }]);
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با سرویس گفت‌وگو" : "Chat API error"));
    } finally {
      setLoading(false);
    }
  }

  const placeholder = useMemo(() => (lang === "fa" ? "پیامت رو بنویس و Enter بزن…" : "Type your message and press Enter…"), [lang]);

  return (
    <div className="ccg-container">
      <div className="ccg-card p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-lg">{t("chat") || (lang === "fa" ? "گفت‌وگو" : "Chat")}</h2>
          <div className="text-xs text-slate-500 dark:text-slate-300/70">
            {lang === "fa" ? "پروفایل از Generator استفاده می‌شود" : "Profile is reused from Generator"}
          </div>
        </div>

        {apiErr ? (
          <div className="ccg-error mb-3">
            <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
            <div className="text-sm">{apiErr}</div>
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === "user" ? "ccg-card p-3" : "ccg-card p-3 border border-white/5"}>
              <div className="text-xs mb-2 opacity-70">{m.role === "user" ? (lang === "fa" ? "شما" : "You") : "CCG"}</div>
              <SectionedMarkdown markdown={m.text} lang={lang} />
            </div>
          ))}
          <div ref={boxRef} />
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="ccg-input flex-1"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="ccg-btn-primary px-4" disabled={loading || !input.trim()} onClick={send} type="button">
            {loading ? (lang === "fa" ? "..." : "...") : (lang === "fa" ? "ارسال" : "Send")}
          </button>
        </div>
      </div>
    </div>
  );
}

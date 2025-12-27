cat > ccg_frontend_apply.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
CLIENT_DIR="$ROOT_DIR/client"
SRC_DIR="$CLIENT_DIR/src"

if [[ ! -d "$CLIENT_DIR" ]]; then
  echo "❌ client/ پیدا نشد. از ریشه پروژه اجرا کن."
  exit 1
fi

mkdir -p "$SRC_DIR/config" \
         "$SRC_DIR/services" \
         "$SRC_DIR/hooks" \
         "$SRC_DIR/context" \
         "$SRC_DIR/components/layout" \
         "$SRC_DIR/components/ui" \
         "$SRC_DIR/components/error" \
         "$SRC_DIR/pages/generator" \
         "$SRC_DIR/pages/comparator"

# -------------------------------
# src/main.jsx
# -------------------------------
cat > "$SRC_DIR/main.jsx" <<'FILE'
// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

// ✅ fonts (no CSS @import warnings)
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";

// ✅ tailwind + global styles
import "./index.css";

// Providers
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { AppViewProvider } from "./hooks/useAppView";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppViewProvider>
            <App />
          </AppViewProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
FILE

# -------------------------------
# src/index.css
# -------------------------------
cat > "$SRC_DIR/index.css" <<'FILE'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root{
    --font-en: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial;
    --font-fa: "Vazirmatn", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial;

    --bg: #f6f7fb;
    --text: #0f172a;
    --muted: #64748b;

    --card: rgba(255,255,255,.72);
    --border: rgba(15,23,42,.10);

    --primary: #2563eb;
  }

  [data-theme="dark"]{
    --bg: #070b14;
    --text: #e5e7eb;
    --muted: #94a3b8;

    --card: rgba(15,23,42,.55);
    --border: rgba(148,163,184,.16);

    --primary: #60a5fa;
  }

  html, body { height: 100%; }
  html { background: var(--bg); color: var(--text); font-family: var(--font-en); }
  html[dir="rtl"] { font-family: var(--font-fa); }

  body{
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(1200px 700px at 30% 20%, rgba(37,99,235,.10), transparent 55%),
      radial-gradient(900px 600px at 80% 60%, rgba(96,165,250,.08), transparent 60%),
      var(--bg);
    color: var(--text);
  }

  [data-theme="dark"] body{
    background:
      radial-gradient(1200px 700px at 30% 20%, rgba(37,99,235,.14), transparent 55%),
      radial-gradient(900px 600px at 80% 60%, rgba(96,165,250,.10), transparent 60%),
      var(--bg);
  }

  #root{
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  a{ color: var(--primary); text-decoration: none; }
  a:hover{ text-decoration: underline; }

  ::placeholder{ color: rgba(100,116,139,.75); }
  [data-theme="dark"] ::placeholder{ color: rgba(148,163,184,.70); }

  *{ box-sizing: border-box; }
}

@layer components {
  .ccg-container{
    @apply mx-auto w-full px-4 sm:px-6 lg:px-8;
    max-width: 1200px;
  }

  .ccg-card, .ccg-panel{
    background: var(--card);
    border: 1px solid var(--border);
    @apply rounded-2xl shadow-sm backdrop-blur;
  }

  .ccg-input, .ccg-select, .ccg-textarea{
    background: rgba(255,255,255,.6);
    border: 1px solid var(--border);
    color: var(--text);
    @apply rounded-xl px-3 py-2 outline-none;
  }

  [data-theme="dark"] .ccg-input,
  [data-theme="dark"] .ccg-select,
  [data-theme="dark"] .ccg-textarea{
    background: rgba(2,6,23,.40);
  }

  .ccg-input:focus, .ccg-select:focus, .ccg-textarea:focus{
    @apply ring-2 ring-blue-500/40;
  }

  .ccg-btn{
    border: 1px solid var(--border);
    background: rgba(255,255,255,.55);
    color: var(--text);
    @apply rounded-xl px-4 py-2 text-sm transition active:translate-y-[1px];
  }

  [data-theme="dark"] .ccg-btn{
    background: rgba(2,6,23,.30);
  }

  .ccg-btn-primary{
    @apply ccg-btn;
    background: linear-gradient(180deg, rgba(37,99,235,.95), rgba(37,99,235,.82));
    border-color: rgba(37,99,235,.40);
    color: #fff;
    box-shadow: 0 10px 26px rgba(96,165,250,.18);
  }

  .ccg-btn-ghost{
    @apply ccg-btn;
    background: transparent;
  }

  .ccg-btn-xs{
    @apply px-3 py-1 text-xs rounded-lg;
  }

  /* --- Markdown styles --- */
  .ccg-markdown{
    @apply text-sm leading-7;
  }
  .ccg-markdown.rtl{ direction: rtl; }
  .ccg-markdown.ltr{ direction: ltr; }

  .ccg-inline-code{
    @apply px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/10;
    background: rgba(255,255,255,.55);
  }

  [data-theme="dark"] .ccg-inline-code{
    background: rgba(2,6,23,.30);
  }

  .ccg-codeblock{
    @apply mt-3 rounded-2xl overflow-hidden border;
    border-color: rgba(148,163,184,.16);
    background: rgba(2,6,23,.45);
  }
  .ccg-codeblock-head{
    @apply flex items-center justify-between gap-3 px-4 py-2 border-b;
    border-color: rgba(148,163,184,.16);
    background: rgba(2,6,23,.35);
  }
  .ccg-codeblock-title{
    @apply text-xs font-semibold uppercase tracking-wider text-slate-200/80;
  }
  .ccg-pre{
    @apply p-4 overflow-auto text-xs sm:text-sm;
  }
  .ccg-pre code{
    @apply text-slate-100;
  }

  .ccg-error{
    @apply rounded-2xl border border-red-500/40 bg-red-500/10 p-4;
  }

  /* --- SectionedMarkdown cards --- */
  .ccg-section-grid { @apply space-y-4; }
  .ccg-section-card { @apply ccg-card p-4 sm:p-5; }
  .ccg-section-title { @apply text-sm sm:text-base font-semibold mb-3 text-slate-700 dark:text-slate-200; }
  .ccg-section-body { @apply text-sm; }
}
FILE

# -------------------------------
# src/config/api.js
# -------------------------------
cat > "$SRC_DIR/config/api.js" <<'FILE'
// client/src/config/api.js
/**
 * Fixes "/api/api/..." duplication issues.
 *
 * You can set:
 *   VITE_API_BASE="https://your-domain.com"
 * or if you already reverse-proxy /api in nginx, keep it empty.
 */
const RAW_BASE = (import.meta.env.VITE_API_BASE || "").trim();

/**
 * Normalize joining base + path
 */
function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");

  if (!b) return p.startsWith("/") ? p : `/${p}`;

  const cleanP = p.startsWith("/") ? p : `/${p}`;
  return `${b}${cleanP}`;
}

/**
 * withBase("/api/ccg") -> correct URL
 * prevents:
 *  base="/api" + path="/api/ccg" => "/api/ccg" (not "/api/api/ccg")
 */
export function withBase(path = "") {
  const base = RAW_BASE;

  // If base ends with /api and path starts with /api, remove duplication
  const b = base.replace(/\/+$/, "");
  const p = String(path || "");

  if (b.endsWith("/api") && p.startsWith("/api/")) {
    return joinUrl(b.slice(0, -4), p); // remove "/api"
  }

  return joinUrl(b, p);
}
FILE

# -------------------------------
# src/services/aiService.js
# -------------------------------
cat > "$SRC_DIR/services/aiService.js" <<'FILE'
// client/src/services/aiService.js
import { withBase } from "../config/api";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * callCCG(payload)
 * Expected backend:
 *   POST /api/ccg
 * Body: JSON
 * Returns: { ok: true, markdown: "..." } or { markdown: "..." }
 */
export async function callCCG(payload) {
  const url = withBase("/api/ccg");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const data = await safeJson(res);

  if (res.status === 404) {
    throw new Error("API route not found");
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || "API request failed";
    throw new Error(msg);
  }

  // allow either {markdown} or {ok, markdown}
  return data || { markdown: "" };
}
FILE

# -------------------------------
# src/hooks/useAppView.jsx
# -------------------------------
cat > "$SRC_DIR/hooks/useAppView.jsx" <<'FILE'
import { createContext, useContext, useMemo, useState } from "react";

/**
 * view:
 *  - generator
 *  - comparator
 */
const AppViewCtx = createContext(null);

export function AppViewProvider({ children }) {
  const [view, setView] = useState("generator");

  const value = useMemo(
    () => ({
      view,
      setView,
    }),
    [view]
  );

  return <AppViewCtx.Provider value={value}>{children}</AppViewCtx.Provider>;
}

export function useAppView() {
  const ctx = useContext(AppViewCtx);
  if (!ctx) throw new Error("useAppView must be used within AppViewProvider");
  return ctx;
}
FILE

# -------------------------------
# src/context/LanguageContext.jsx
# -------------------------------
cat > "$SRC_DIR/context/LanguageContext.jsx" <<'FILE'
import React, { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const DICT = {
  en: {
    generator: "Generator",
    comparator: "Code Comparator",
    signIn: "Sign in",
    menu: "Menu",

    platform: "Platform",
    vendor: "Vendor",
    deviceType: "Device Type",
    outputType: "Output Type",
    cliShell: "CLI / Shell",
    mode: "Mode",
    knowledge: "Knowledge",
    request: "Request",

    learn: "Learn",
    operational: "Operational",
    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",

    commandShell: "Command / Shell",
    pythonAutomation: "Python Automation",

    inputs: "Inputs",
    output: "Output",
    generate: "Generate Output",
    swapIO: "Swap Input ↔ Output",
    openErrorAnalyzer: "Open Error Analyzer",
    errorShortcutText:
      "If you hit an error… open Error Analyzer to get root cause + fix + verification.",

    placeholderReq: "e.g. safely check disk usage on a Linux server",
    outputPlaceholder: "Output will appear here.",

    tip_platform: "Choose target OS/device so outputs match your environment.",
    tip_vendor: "Select network vendor (should match backend supported vendors).",
    tip_deviceType: "Choose device type for more accurate network commands.",
    tip_outputType: "Choose command/shell output or Python automation script.",
    tip_cliShell: "Choose shell to match your system (bash/zsh/PowerShell...).",
    tip_mode: "Learn: detailed & educational. Operational: concise & production-safe.",
    tip_knowledge: "Controls depth of explanations (Beginner is more verbose).",
    tip_request: "Describe what you want. Include constraints and safety requirements.",

    ea_title: "Error Analyzer",
    ea_command: "Command / Error / Log",
    ea_context: "Extra context (optional)",
    ea_analyze: "Analyze",
    ea_clear: "Clear",
    ea_result: "Analysis result will appear here.",
  },

  fa: {
    generator: "جنریتور",
    comparator: "مقایسه کد",
    signIn: "ورود",
    menu: "منو",

    platform: "پلتفرم",
    vendor: "وندور",
    deviceType: "نوع دستگاه",
    outputType: "نوع خروجی",
    cliShell: "شل / CLI",
    mode: "حالت",
    knowledge: "سطح دانش",
    request: "درخواست",

    learn: "آموزشی",
    operational: "عملیاتی",
    beginner: "مبتدی",
    intermediate: "متوسط",
    expert: "حرفه‌ای",

    commandShell: "کامند / شل",
    pythonAutomation: "اتوماسیون پایتون",

    inputs: "ورودی‌ها",
    output: "خروجی",
    generate: "ساخت خروجی",
    swapIO: "جابجایی ورودی ↔ خروجی",
    openErrorAnalyzer: "باز کردن آنالیز خطا",
    errorShortcutText:
      "اگر به خطا خوردی… آنالیز خطا را باز کن تا علت + رفع + صحت‌سنجی را بگیری.",

    placeholderReq: "مثلاً: بررسی امن فضای دیسک روی سرور لینوکس",
    outputPlaceholder: "خروجی اینجا نمایش داده می‌شود.",

    tip_platform: "سیستم عامل/دستگاه مقصد را انتخاب کن تا خروجی دقیق و متناسب باشد.",
    tip_vendor: "وندور شبکه را انتخاب کن (باید با وندورهای بک‌اند یکی باشد).",
    tip_deviceType: "نوع دستگاه شبکه را انتخاب کن تا دستورات دقیق‌تر تولید شود.",
    tip_outputType: "خروجی را به صورت کامند/شل یا اسکریپت اتوماسیون پایتون بگیر.",
    tip_cliShell: "شل متناسب سیستم را انتخاب کن (bash/zsh/PowerShell...).",
    tip_mode: "آموزشی: توضیح کامل. عملیاتی: خلاصه و امن برای پروداکشن.",
    tip_knowledge: "میزان توضیح را کنترل می‌کند (مبتدی = توضیح بیشتر).",
    tip_request: "درخواستت را دقیق بنویس؛ محدودیت‌ها و نکات امنیتی را هم بگو.",

    ea_title: "آنالیز خطا",
    ea_command: "کامند / خطا / لاگ",
    ea_context: "توضیح تکمیلی (اختیاری)",
    ea_analyze: "تحلیل",
    ea_clear: "پاک کردن",
    ea_result: "نتیجه تحلیل اینجا نمایش داده می‌شود.",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("ccg_lang") || "fa");

  const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
FILE

# -------------------------------
# src/context/ThemeContext.jsx
# -------------------------------
cat > "$SRC_DIR/context/ThemeContext.jsx" <<'FILE'
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("ccg_theme") || "dark");

  useEffect(() => {
    localStorage.setItem("ccg_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((p) => (p === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
FILE

# -------------------------------
# src/context/AuthContext.jsx (minimal / safe)
# -------------------------------
cat > "$SRC_DIR/context/AuthContext.jsx" <<'FILE'
// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

/**
 * این نسخه "مینیمال" هست تا UI گیر نکنه.
 * اگر بک‌اند احراز هویت واقعی داری، بعداً همینجا وصلش می‌کنیم.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
FILE

# -------------------------------
# src/components/ui/Modal.jsx
# -------------------------------
cat > "$SRC_DIR/components/ui/Modal.jsx" <<'FILE'
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92vw] max-w-3xl max-h-[85vh] overflow-y-auto ccg-card p-5 sm:p-6">
        <div className="flex justify-between items-center mb-4 gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="ccg-btn-ghost text-xl leading-none px-3" type="button">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
FILE

# -------------------------------
# src/components/ui/MarkdownBox.jsx (supports content + markdown)
# -------------------------------
cat > "$SRC_DIR/components/ui/MarkdownBox.jsx" <<'FILE'
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyMini({ value, labelCopy, labelCopied }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ccg-btn ccg-btn-ghost ccg-btn-xs"
      title={labelCopy}
    >
      {copied ? labelCopied : labelCopy}
    </button>
  );
}

export default function MarkdownBox({ markdown, content, lang = "fa" }) {
  const md = content ?? markdown ?? "";

  const t = useMemo(() => {
    const fa = { copy: "کپی", copied: "کپی شد" };
    const en = { copy: "Copy", copied: "Copied" };
    return lang === "fa" ? fa : en;
  }, [lang]);

  return (
    <div className={`ccg-markdown ${lang === "fa" ? "rtl" : "ltr"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children }) {
            const raw = String(children ?? "");
            const value = raw.replace(/\n$/, "");
            const isBlock = !inline;

            if (!isBlock) return <code className="ccg-inline-code">{children}</code>;

            return (
              <div className="ccg-codeblock">
                <div className="ccg-codeblock-head">
                  <div className="ccg-codeblock-title">
                    {(className || "").replace("language-", "") || "CODE"}
                  </div>
                  <CopyMini value={value} labelCopy={t.copy} labelCopied={t.copied} />
                </div>
                <pre className="ccg-pre">
                  <code dir="ltr">{value}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
FILE

# -------------------------------
# src/components/ui/SectionedMarkdown.jsx (each section in a box)
# -------------------------------
cat > "$SRC_DIR/components/ui/SectionedMarkdown.jsx" <<'FILE'
import { useMemo } from "react";
import MarkdownBox from "./MarkdownBox";

function splitByHeadings(md) {
  const raw = String(md || "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const sections = [];
  let current = { title: null, body: [] };

  const pushCurrent = () => {
    const body = current.body.join("\n").trim();
    if (!current.title && !body) return;
    sections.push({ title: current.title, body });
  };

  for (const line of lines) {
    const m = line.match(/^(#{2,6})\s+(.+)\s*$/);
    if (m) {
      if (current.title !== null || current.body.length) pushCurrent();
      current = { title: m[2].trim(), body: [] };
      continue;
    }
    current.body.push(line);
  }

  pushCurrent();

  if (!sections.length && raw.trim()) return [{ title: null, body: raw.trim() }];

  return sections.filter((s) => (s.title || s.body).toString().trim().length > 0);
}

export default function SectionedMarkdown({ markdown, content, lang = "fa", defaultTitle }) {
  const md = content ?? markdown ?? "";
  const sections = useMemo(() => splitByHeadings(md), [md]);

  if (!md || !String(md).trim()) return <MarkdownBox markdown={""} lang={lang} />;

  if (sections.length === 1 && !sections[0].title) {
    return <MarkdownBox markdown={sections[0].body} lang={lang} />;
  }

  return (
    <div className="ccg-section-grid">
      {sections.map((sec, idx) => {
        const title = sec.title || defaultTitle || (lang === "fa" ? "خروجی" : "Result");
        return (
          <div key={`${title}-${idx}`} className="ccg-section-card">
            <div className="ccg-section-title">{title}</div>
            <div className="ccg-section-body">
              <MarkdownBox markdown={sec.body} lang={lang} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
FILE

# -------------------------------
# src/components/layout/MainLayout.jsx
# -------------------------------
cat > "$SRC_DIR/components/layout/MainLayout.jsx" <<'FILE'
import { useLanguage } from "../../context/LanguageContext";

export default function MainLayout({ children }) {
  const { lang } = useLanguage();

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} className="min-h-screen">
      {children}
    </div>
  );
}
FILE

# -------------------------------
# src/components/layout/Footer.jsx
# -------------------------------
cat > "$SRC_DIR/components/layout/Footer.jsx" <<'FILE'
export default function Footer() {
  return (
    <footer className="mt-10 pb-10">
      <div className="ccg-container">
        <div className="border-t pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-500 dark:text-slate-300/70 items-center">
            <div className="md:text-left text-center">
              <a href="https://cando.ac" target="_blank" rel="noreferrer">
                Powered by Cando IT Academy
              </a>
            </div>

            <div className="text-center">© 2025 CCG — Cando Command Generator</div>

            <div className="md:text-right text-center">
              <a href="mailto:amirhosseinyavari61@gmail.com">Created by Amirhossein Yavari</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
FILE

# -------------------------------
# src/components/layout/Header.jsx (hamburger drawer uses portal)
# -------------------------------
cat > "$SRC_DIR/components/layout/Header.jsx" <<'FILE'
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useAppView } from "../../hooks/useAppView";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { view, setView } = useAppView();
  const { lang, setLang, t } = useLanguage();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLang = () => {
    const next = lang === "fa" ? "en" : "fa";
    setLang(next);
    localStorage.setItem("ccg_lang", next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const go = (nextView) => {
    setView(nextView);
    setMenuOpen(false);
  };

  const Drawer = () => (
    <div className={`fixed inset-0 z-[20000] ${menuOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${
          menuOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <div
        className={[
          "absolute top-0 bottom-0",
          lang === "fa" ? "right-0" : "left-0",
          "w-[86vw] max-w-[360px]",
          "ccg-card rounded-none p-4",
          "transition-transform duration-200",
          menuOpen ? "translate-x-0" : lang === "fa" ? "translate-x-full" : "-translate-x-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold">CCG</div>
            <div className="text-xs text-slate-500 dark:text-slate-300/70">
              {t("menu")}
            </div>
          </div>
          <button className="ccg-btn-ghost px-3 py-2" onClick={() => setMenuOpen(false)} type="button">
            ✕
          </button>
        </div>

        <div className="grid gap-2">
          <DrawerItem active={view === "generator"} onClick={() => go("generator")}>
            {t("generator")}
          </DrawerItem>
          <DrawerItem active={view === "comparator"} onClick={() => go("comparator")}>
            {t("comparator")}
          </DrawerItem>
        </div>

        <div className="mt-4 border-t pt-4 space-y-2">
          <button className="ccg-btn w-full" type="button" onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button className="ccg-btn w-full" type="button" onClick={toggleLang}>
            {lang === "fa" ? "Switch to English" : "تغییر به فارسی"}
          </button>

          {!user ? (
            <button
              className="ccg-btn-primary w-full"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new Event("open-auth-modal"));
              }}
            >
              {t("signIn")}
            </button>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-300/70">
              {user?.email || "Logged in"}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <header className="pt-6 mb-8">
      <div className="ccg-container">
        <div className="ccg-card px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-bold leading-tight">CCG</div>
            <div className="text-xs text-slate-500 dark:text-slate-300/70 truncate">
              Cando Command Generator
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Nav active={view === "generator"} onClick={() => go("generator")}>
              {t("generator")}
            </Nav>
            <Nav active={view === "comparator"} onClick={() => go("comparator")}>
              {t("comparator")}
            </Nav>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="ccg-btn px-3 py-2" type="button" title="Theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button onClick={toggleLang} className="ccg-btn px-3 py-2" type="button">
              {lang === "fa" ? "EN" : "FA"}
            </button>

            {!user ? (
              <button
                onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}
                className="ccg-btn-primary px-4 py-2 hidden sm:inline-flex"
                type="button"
              >
                {t("signIn")}
              </button>
            ) : (
              <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-200/80">
                {user.email}
              </span>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden ccg-btn px-3 py-2"
              type="button"
              aria-label="Open menu"
              title="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {createPortal(<Drawer />, document.body)}
    </header>
  );
}

function Nav({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`px-4 py-2 rounded-xl text-sm transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

function DrawerItem({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}
FILE

# -------------------------------
# src/components/error/ErrorAnalyzerModal.jsx
# -------------------------------
cat > "$SRC_DIR/components/error/ErrorAnalyzerModal.jsx" <<'FILE'
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";
import Modal from "../ui/Modal";
import SectionedMarkdown from "../ui/SectionedMarkdown";

export default function ErrorAnalyzerModal({ open, onClose, seed }) {
  const { lang, t } = useLanguage();

  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!open) return;
    setCommand(seed?.command || "");
    setContext(seed?.context || "");
    setErr("");
    setOutput("");
  }, [open, seed]);

  const canSubmit = useMemo(() => command.trim().length > 0, [command]);

  async function analyze() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");

    try {
      const payload = {
        mode: "error",
        lang: lang || "fa",
        user_request: command.trim(),
        error_message: context.trim() || "",
        os: "unknown",
        cli: "cli",
        deviceType: "general",
        knowledgeLevel: "beginner",
      };

      const res = await callCCG(payload);
      setOutput(res?.markdown || res?.result || "");
    } catch (e) {
      setErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("ea_title")}>
      <div className="space-y-3">
        <label className="text-sm text-slate-700 dark:text-slate-200/80">
          {t("ea_command")}
        </label>
        <textarea
          className="ccg-textarea w-full h-28 sm:h-32"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={lang === "fa" ? "خروجی خطا/لاگ/کامند..." : "Error/log/command output..."}
        />

        <label className="text-sm text-slate-700 dark:text-slate-200/80">
          {t("ea_context")}
        </label>
        <textarea
          className="ccg-textarea w-full h-24"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={
            lang === "fa"
              ? "چه کاری انجام دادی؟ روی چه سیستمی؟ چه چیزی انتظار داشتی؟"
              : "What did you do? Which OS? What did you expect?"
          }
        />

        <button
          className="ccg-btn-primary w-full"
          disabled={!canSubmit || loading}
          onClick={analyze}
          type="button"
        >
          {loading ? (lang === "fa" ? "در حال تحلیل..." : "Analyzing...") : t("ea_analyze")}
        </button>

        {err ? (
          <div className="ccg-error">
            <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
            <div className="text-sm">{err}</div>
          </div>
        ) : null}

        {output ? (
          <div className="mt-2">
            <SectionedMarkdown markdown={output} lang={lang} />
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-300/70">
            {t("ea_result")}
          </div>
        )}
      </div>
    </Modal>
  );
}
FILE

# -------------------------------
# src/pages/generator/GeneratorPage.jsx (FULL)
# -------------------------------
cat > "$SRC_DIR/pages/generator/GeneratorPage.jsx" <<'FILE'
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";

const PLATFORM_OPTIONS = [
  { value: "linux", label: "Linux" },
  { value: "windows", label: "Windows" },
  { value: "mac", label: "macOS" },
  { value: "network", label: "Network Device" },
];

const SHELL_BY_PLATFORM = {
  linux: [
    { value: "bash", label: "bash" },
    { value: "zsh", label: "zsh" },
    { value: "sh", label: "sh" },
  ],
  mac: [
    { value: "zsh", label: "zsh (default)" },
    { value: "bash", label: "bash" },
  ],
  windows: [
    { value: "powershell", label: "PowerShell" },
    { value: "cmd", label: "CMD" },
  ],
};

const NETWORK_VENDORS = [
  { value: "cisco", label: "Cisco" },
  { value: "fortinet_fortigate", label: "Fortinet FortiGate" },
  { value: "mikrotik", label: "MikroTik" },
];

const DEVICE_TYPES_BY_VENDOR = {
  cisco: [
    { value: "router", label: "Router" },
    { value: "switch", label: "Switch" },
    { value: "firewall", label: "Firewall" },
  ],
  fortinet_fortigate: [
    { value: "firewall", label: "Firewall" },
    { value: "utm", label: "UTM" },
  ],
  mikrotik: [
    { value: "router", label: "Router" },
    { value: "switch", label: "Switch" },
    { value: "firewall", label: "Firewall" },
  ],
};

export default function GeneratorPage() {
  const { t, lang } = useLanguage();

  const [platform, setPlatform] = useState("linux");
  const [outputType, setOutputType] = useState("command"); // command | python
  const [mode, setMode] = useState("learn"); // learn | operational
  const [level, setLevel] = useState("beginner"); // beginner | intermediate | expert

  const [shell, setShell] = useState("bash");
  const [vendor, setVendor] = useState(NETWORK_VENDORS[0].value);
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES_BY_VENDOR[NETWORK_VENDORS[0].value][0].value);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const [swapLayout, setSwapLayout] = useState(false);

  const shellOptions = useMemo(
    () => (platform === "network" ? [] : SHELL_BY_PLATFORM[platform] || []),
    [platform]
  );

  const deviceTypeOptions = useMemo(() => DEVICE_TYPES_BY_VENDOR[vendor] || [], [vendor]);

  useEffect(() => {
    if (platform === "network") return;
    const ok = shellOptions.some((o) => o.value === shell);
    if (!ok) setShell(shellOptions[0]?.value || "");
  }, [platform, shellOptions, shell]);

  useEffect(() => {
    if (platform !== "network") return;
    const ok = deviceTypeOptions.some((o) => o.value === deviceType);
    if (!ok) setDeviceType(deviceTypeOptions[0]?.value || "");
  }, [platform, vendor, deviceTypeOptions, deviceType]);

  const openErrorAnalyzer = () => {
    window.dispatchEvent(
      new CustomEvent("open-error-analyzer", {
        detail: { command: input || "", context: "" },
      })
    );
  };

  const payloadForGenerator = () => {
    const isNetwork = platform === "network";
    return {
      mode: "generate",
      lang: lang || "fa",

      // important for backend
      user_request: input.trim(),

      // generator params
      outputType: outputType, // "command" or "python"
      modeStyle: mode, // learn/operational
      knowledgeLevel: level,

      platform: isNetwork ? "network" : platform,
      os: isNetwork ? "network" : platform,
      cli: isNetwork ? "network-cli" : shell,
      vendor: isNetwork ? vendor : "",
      deviceType: isNetwork ? deviceType : "general",
    };
  };

  const generate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setApiErr("");
    setOutput("");

    try {
      const res = await callCCG(payloadForGenerator());
      const md = res?.markdown || res?.result || "";
      setOutput(md);
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Context Bar */}
      <div className="ccg-container">
        <div className="ccg-card px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Platform */}
            <FieldLabel label={t("platform")} tip={t("tip_platform")} />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="ccg-select text-sm"
            >
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Output Type */}
            <FieldLabel label={t("outputType")} tip={t("tip_outputType")} />
            <div className="flex rounded-xl border border-[var(--border)] p-1">
              <Toggle active={outputType === "command"} onClick={() => setOutputType("command")}>
                {t("commandShell")}
              </Toggle>
              <Toggle active={outputType === "python"} onClick={() => setOutputType("python")}>
                {t("pythonAutomation")}
              </Toggle>
            </div>

            {/* Shell / Network vendor */}
            {platform === "network" ? (
              <>
                <FieldLabel label={t("vendor")} tip={t("tip_vendor")} />
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="ccg-select text-sm"
                >
                  {NETWORK_VENDORS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <FieldLabel label={t("deviceType")} tip={t("tip_deviceType")} />
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="ccg-select text-sm"
                >
                  {deviceTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <FieldLabel label={t("cliShell")} tip={t("tip_cliShell")} />
                <select
                  value={shell}
                  onChange={(e) => setShell(e.target.value)}
                  className="ccg-select text-sm"
                  disabled={outputType !== "command"}
                  title={outputType !== "command" ? (lang === "fa" ? "در حالت پایتون غیرفعال است" : "Disabled on python output") : ""}
                >
                  {shellOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Mode */}
            <FieldLabel label={t("mode")} tip={t("tip_mode")} />
            <div className="flex rounded-xl border border-[var(--border)] p-1">
              <Toggle active={mode === "learn"} onClick={() => setMode("learn")}>
                {t("learn")}
              </Toggle>
              <Toggle active={mode === "operational"} onClick={() => setMode("operational")}>
                {t("operational")}
              </Toggle>
            </div>

            {/* Knowledge */}
            <FieldLabel label={t("knowledge")} tip={t("tip_knowledge")} />
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="ccg-select text-sm">
              <option value="beginner">{t("beginner")}</option>
              <option value="intermediate">{t("intermediate")}</option>
              <option value="expert">{t("expert")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
          {/* Input Card */}
          <div
            className={`ccg-card p-5 sm:p-8 ${swapLayout ? "order-2" : "order-1"}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t("inputs")}</h2>
              <button
                onClick={() => setSwapLayout((v) => !v)}
                className="ccg-btn"
                type="button"
              >
                ↔ {t("swapIO")}
              </button>
            </div>

            <div className="mb-2">
              <FieldLabel label={t("request")} tip={t("tip_request")} />
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholderReq")}
              className="ccg-textarea w-full h-52 sm:h-64 resize-none p-4 text-sm"
            />

            <button
              className="mt-5 sm:mt-6 w-full ccg-btn-primary py-3"
              disabled={!input.trim() || loading}
              onClick={generate}
              type="button"
            >
              {loading ? (lang === "fa" ? "در حال ساخت..." : "Generating...") : t("generate")}
            </button>
          </div>

          {/* Output Card */}
          <div
            className={`ccg-card p-5 sm:p-8 ${swapLayout ? "order-1" : "order-2"}`}
          >
            <h2 className="text-lg font-semibold mb-4">{t("output")}</h2>

            {apiErr ? (
              <div className="ccg-error mb-4">
                <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
                <div className="text-sm">{apiErr}</div>
              </div>
            ) : null}

            {output ? (
              <SectionedMarkdown markdown={output} lang={lang} />
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-300/70">
                {t("outputPlaceholder")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Shortcut */}
      <div className="ccg-container">
        <div className="ccg-card p-5 sm:p-6 text-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span>⚠️ {t("errorShortcutText")}</span>
            <button
              className="ccg-btn w-full sm:w-auto"
              type="button"
              onClick={openErrorAnalyzer}
            >
              {t("openErrorAnalyzer")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`px-4 py-2 text-sm rounded-lg transition ${
        active
          ? "bg-blue-600 text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-200/80 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ label, tip }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-700 dark:text-slate-200/80">{label}</span>
      <span className="relative group">
        <button
          type="button"
          className="w-5 h-5 rounded-full border text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 dark:border-white/10"
          aria-label={`${label} help`}
        >
          ?
        </button>
        <span className="pointer-events-none absolute z-50 hidden group-hover:block top-7 left-1/2 -translate-x-1/2 w-72 rounded-lg border bg-white p-2 text-xs text-slate-700 shadow dark:bg-slate-950 dark:text-slate-100 dark:border-white/10">
          {tip}
        </span>
      </span>
    </div>
  );
}
FILE

# -------------------------------
# src/pages/comparator/CodeComparatorPage.jsx
# -------------------------------
cat > "$SRC_DIR/pages/comparator/CodeComparatorPage.jsx" <<'FILE'
import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";
import { callCCG } from "../../services/aiService";

export default function CodeComparatorPage() {
  const { t, lang } = useLanguage();

  const [inputs, setInputs] = useState({ a: "", b: "" });
  const [output, setOutput] = useState("");
  const [swapLayout, setSwapLayout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const compare = async () => {
    if (loading) return;
    const a = inputs.a.trim();
    const b = inputs.b.trim();
    if (!a && !b) return;

    setLoading(true);
    setApiErr("");
    setOutput("");

    try {
      const payload = {
        mode: "compare",
        lang: lang || "fa",
        codeA: a,
        codeB: b,
      };
      const res = await callCCG(payload);
      setOutput(res?.markdown || res?.result || "");
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ccg-container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        <div className={`ccg-card p-5 sm:p-8 ${swapLayout ? "order-2" : "order-1"}`}>
          <div className="flex justify-between items-center mb-4 gap-3">
            <h2 className="font-semibold text-lg">{t("inputs")}</h2>
            <button
              onClick={() => setSwapLayout((v) => !v)}
              className="ccg-btn"
              type="button"
            >
              ↔ {t("swapIO")}
            </button>
          </div>

          <textarea
            className="ccg-textarea w-full h-44 sm:h-52 p-3 mb-4"
            placeholder="Code A"
            value={inputs.a}
            onChange={(e) => setInputs({ ...inputs, a: e.target.value })}
          />

          <textarea
            className="ccg-textarea w-full h-44 sm:h-52 p-3"
            placeholder="Code B"
            value={inputs.b}
            onChange={(e) => setInputs({ ...inputs, b: e.target.value })}
          />

          <button
            className="mt-5 w-full ccg-btn-primary py-3"
            disabled={(!inputs.a.trim() && !inputs.b.trim()) || loading}
            onClick={compare}
            type="button"
          >
            {loading ? (lang === "fa" ? "در حال مقایسه..." : "Comparing...") : "Compare & Analyze"}
          </button>
        </div>

        <div className={`ccg-card p-5 sm:p-8 ${swapLayout ? "order-1" : "order-2"}`}>
          <h2 className="font-semibold text-lg mb-4">{t("output")}</h2>

          {apiErr ? (
            <div className="ccg-error mb-4">
              <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
              <div className="text-sm">{apiErr}</div>
            </div>
          ) : null}

          {output ? (
            <SectionedMarkdown markdown={output} lang={lang} />
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-300/70">
              {t("outputPlaceholder")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
FILE

# -------------------------------
# src/App.jsx (wires ErrorAnalyzer modal)
# -------------------------------
cat > "$SRC_DIR/App.jsx" <<'FILE'
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import MainLayout from "./components/layout/MainLayout";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import GeneratorPage from "./pages/generator/GeneratorPage";
import CodeComparatorPage from "./pages/comparator/CodeComparatorPage";

import ErrorAnalyzerModal from "./components/error/ErrorAnalyzerModal";
import { useAppView } from "./hooks/useAppView";

export default function App() {
  const { view } = useAppView();

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorSeed, setErrorSeed] = useState({ command: "", context: "" });

  useEffect(() => {
    const onOpen = (e) => {
      const detail = e?.detail || {};
      setErrorSeed({
        command: detail.command || "",
        context: detail.context || "",
      });
      setErrorOpen(true);
    };
    window.addEventListener("open-error-analyzer", onOpen);
    return () => window.removeEventListener("open-error-analyzer", onOpen);
  }, []);

  return (
    <MainLayout>
      <Toaster position="top-center" />
      <Header />

      <main className="ccg-container mx-auto py-8">
        {view === "generator" && <GeneratorPage />}
        {view === "comparator" && <CodeComparatorPage />}
      </main>

      <Footer />

      <ErrorAnalyzerModal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        seed={errorSeed}
      />
    </MainLayout>
  );
}
FILE

echo "✅ Done. Files written/updated."
echo "Now run:"
echo "  cd client && npm run build"
echo "or:"
echo "  cd client && npm run dev"
EOF

chmod +x ccg_frontend_apply.sh
echo "✅ ccg_frontend_apply.sh ساخته شد."
echo "اجرا کن:"
echo "  ./ccg_frontend_apply.sh"

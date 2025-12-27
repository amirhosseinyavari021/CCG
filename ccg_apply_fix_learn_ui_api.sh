#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${ROOT_DIR}/.ccg_backup_${TS}"

echo "✅ ROOT: ${ROOT_DIR}"
mkdir -p "$BACKUP_DIR"

backup_file () {
  local f="$1"
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "${f#$ROOT_DIR/}")" || true
    cp -a "$f" "$BACKUP_DIR/$(dirname "${f#$ROOT_DIR/}")/" || true
  fi
}

write_file () {
  local f="$1"
  shift
  mkdir -p "$(dirname "$f")"
  cat > "$f" <<'EOF'
'"$@"'
EOF
}

# ---------- sanity ----------
if [ ! -d "${ROOT_DIR}/client/src" ]; then
  echo "❌ client/src not found. Run from repo root where client/ exists."
  exit 1
fi

echo "==> Backing up key frontend files..."
backup_file "${ROOT_DIR}/client/src/App.jsx"
backup_file "${ROOT_DIR}/client/src/pages/generator/GeneratorPage.jsx"
backup_file "${ROOT_DIR}/client/src/components/ui/MarkdownBox.jsx"
backup_file "${ROOT_DIR}/client/src/components/ui/Tooltip.jsx"
backup_file "${ROOT_DIR}/client/src/context/LanguageContext.jsx"
backup_file "${ROOT_DIR}/client/src/services/aiService.js"
backup_file "${ROOT_DIR}/client/src/config/api.js"
backup_file "${ROOT_DIR}/client/src/components/error/ErrorAnalyzerModal.jsx"

# ---------- FRONTEND PATCHES ----------
echo "==> Writing frontend patched files..."

# ---- client/src/config/api.js ----
cat > "${ROOT_DIR}/client/src/config/api.js" <<'EOF'
// client/src/config/api.js
// یکدست‌سازی Base URL برای فرانت
// اگر VITE_API_BASE ست باشد (مثلاً https://domain.com) از آن استفاده می‌شود
// در غیر این صورت، درخواست‌ها relative می‌روند (همان دامنه)

export function apiBase() {
  const b = (import.meta?.env?.VITE_API_BASE || "").trim();
  return b.replace(/\/+$/, "");
}

export function withBase(path) {
  const base = apiBase();
  if (!path.startsWith("/")) path = "/" + path;
  return base ? base + path : path;
}
EOF

# ---- client/src/services/aiService.js ----
cat > "${ROOT_DIR}/client/src/services/aiService.js" <<'EOF'
// client/src/services/aiService.js
import { withBase } from "../config/api";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function callCCG(payload) {
  const url = withBase("/api/ccg");
  // Debug log (خاموش/روشن با نیاز خودت)
  console.log("[CCG] POST /api/ccg", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  const bodyKind = ct.includes("application/json") ? "json" : "text";
  console.log("[CCG] status", res.status, "content-type", ct, "bodyKind", bodyKind);

  if (!res.ok) {
    const data = await safeJson(res);
    const msg =
      data?.error ||
      data?.message ||
      (res.status === 404 ? "API route not found" : `API error (${res.status})`);
    throw new Error(msg);
  }

  const data = await safeJson(res);
  // قرارداد خروجی: backend می‌تواند markdown یا content یا result بدهد
  return {
    markdown: data?.markdown || data?.content || data?.result || "",
    raw: data,
  };
}
EOF

# ---- client/src/components/ui/Tooltip.jsx (PORTAL FIX) ----
cat > "${ROOT_DIR}/client/src/components/ui/Tooltip.jsx" <<'EOF'
// client/src/components/ui/Tooltip.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tooltip Portaled:
 * - مشکل رفتن متن زیر باکس‌ها/overflow را حل می‌کند
 * - روی موبایل با click باز/بسته می‌شود
 */
export default function Tooltip({ text, side = "top" }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });

  const bubbleStyle = useMemo(() => {
    return {
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: pos.width,
      zIndex: 99999,
    };
  }, [pos]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const b = btnRef.current;
      if (!b) return;
      if (b.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const b = btnRef.current;
    if (!b) return;

    const r = b.getBoundingClientRect();
    const vw = Math.min(window.innerWidth, 520);
    const width = Math.min(320, vw - 24);

    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

    let top;
    if (side === "bottom") top = r.bottom + 10;
    else top = r.top - 10;

    // اگر بالا جا نبود → پایین
    if (top < 10) top = r.bottom + 10;
    // اگر پایین هم جا نبود → بالا
    if (top + 90 > window.innerHeight) top = Math.max(10, r.top - 100);

    setPos({ top, left, width });
  }, [open, side]);

  if (!text) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 rounded-full border text-xs text-slate-400 hover:bg-white/5 dark:border-white/10"
        aria-label="Help"
        title="Help"
      >
        ?
      </button>

      {open
        ? createPortal(
            <div style={bubbleStyle} dir="auto">
              <div className="rounded-xl border border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl p-3 text-xs leading-6">
                {text}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
EOF

# ---- client/src/components/ui/MarkdownBox.jsx (CONTENT PROP + SECTION BOXING) ----
cat > "${ROOT_DIR}/client/src/components/ui/MarkdownBox.jsx" <<'EOF'
// client/src/components/ui/MarkdownBox.jsx
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
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ccg-btn ccg-btn-ghost px-3 py-1 text-xs"
      title={labelCopy}
    >
      {copied ? labelCopied : labelCopy}
    </button>
  );
}

/**
 * ✅ Fix 1: پشتیبانی از هر دو prop:
 * - content
 * - markdown
 *
 * ✅ Fix 2: Section boxing
 * اگر خروجی با Heading های مشخص بیاد (Command/Explanation/Warnings/Alternatives و ...)
 * هر بخش توی یک کادر جدا نمایش داده میشه.
 */
export default function MarkdownBox({ content, markdown, lang = "fa" }) {
  const t = useMemo(() => {
    const fa = { copy: "کپی", copied: "کپی شد" };
    const en = { copy: "Copy", copied: "Copied" };
    return lang === "fa" ? fa : en;
  }, [lang]);

  const raw = (typeof content === "string" ? content : "") || (typeof markdown === "string" ? markdown : "");
  const text = raw || "";

  const sections = useMemo(() => {
    // split by headings (## or #)
    // keep heading with its body
    const lines = text.split("\n");
    const out = [];
    let cur = { title: "", body: [] };

    function pushCur() {
      const body = cur.body.join("\n").trim();
      if (cur.title || body) out.push({ title: cur.title.trim(), body });
    }

    for (const line of lines) {
      const m = line.match(/^(#{1,3})\s+(.*)$/);
      if (m) {
        pushCur();
        cur = { title: m[2] || "", body: [] };
      } else {
        cur.body.push(line);
      }
    }
    pushCur();

    // اگر هیچ heading نبود → یک سکشن
    if (out.length === 0) return [{ title: "", body: text }];
    // اگر heading اول خالیه و body خیلی کوچیکه → حذف
    return out;
  }, [text]);

  if (!text.trim()) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
        {lang === "fa" ? "خروجی اینجا نمایش داده می‌شود." : "Output will appear here."}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${lang === "fa" ? "rtl" : "ltr"}`}>
      {sections.map((s, idx) => {
        const value = (s.body || "").replace(/\n$/, "");
        return (
          <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-slate-100">
                {s.title || (lang === "fa" ? "خروجی" : "Result")}
              </div>
              <CopyMini value={value} labelCopy={t.copy} labelCopied={t.copied} />
            </div>

            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const raw = String(children ?? "");
                    const v = raw.replace(/\n$/, "");
                    const isBlock = !inline;
                    if (!isBlock) return <code className="px-1 py-0.5 rounded bg-black/30">{children}</code>;

                    const langName = (className || "").replace("language-", "") || "CODE";
                    return (
                      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                          <div className="text-xs font-semibold text-slate-200">{langName}</div>
                          <CopyMini value={v} labelCopy={t.copy} labelCopied={t.copied} />
                        </div>
                        <pre className="overflow-auto p-3 text-xs leading-6">
                          <code dir="ltr">{v}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {s.body || ""}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
EOF

# ---- client/src/context/LanguageContext.jsx (KEY FIX + LEARN COPY) ----
cat > "${ROOT_DIR}/client/src/context/LanguageContext.jsx" <<'EOF'
import React, { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const DICT = {
  en: {
    generator: "Generator",
    comparator: "Code Comparator",
    signIn: "Sign in",
    menu: "Menu",

    // generator ui
    platform: "Platform",
    vendor: "Vendor",
    deviceType: "Device Type",
    outputType: "Output Type",
    cliShell: "CLI / Shell",
    mode: "Mode",
    knowledge: "Knowledge",
    style: "Output style",
    request: "Request",
    learnInput: "Command / code you want to understand",
    advanced: "Advanced",

    learn: "Learn",
    generate: "Generate",
    operational: "Operational",
    detailed: "Detailed",

    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",

    commandShell: "Command / Shell",
    pythonAutomation: "Python Automation",

    inputs: "Inputs",
    output: "Output",
    generateBtn: "Generate Output",
    learnBtn: "Explain",
    swapIO: "Swap Input ↔ Output",
    openErrorAnalyzer: "Open Error Analyzer",
    errorShortcutText:
      "If you hit an error… open Error Analyzer to get root cause + fix + verification.",

    placeholderReq: "e.g. safely check disk usage on a Linux server",
    placeholderLearn: "e.g. ls -la   or   Get-Process",
    outputPlaceholder: "Output will appear here.",

    tip_platform: "Choose target OS/device so outputs match your environment.",
    tip_vendor: "Select network vendor (must match backend supported vendors).",
    tip_deviceType: "Choose device type for more accurate network commands.",
    tip_outputType: "Command output or Python automation script.",
    tip_cliShell: "Choose shell to match your system.",
    tip_mode: "Generate: create commands. Learn: explain a snippet/command.",
    tip_knowledge: "Controls depth of explanation.",
    tip_style: "Operational: concise. Detailed: more explanation + warnings.",
    tip_request: "Describe what you want. Include constraints and safety requirements.",
    tip_learnInput: "Paste the command/code you want explained.",

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
    style: "استایل خروجی",
    request: "درخواست",
    learnInput: "کامند/کد برای یادگیری",
    advanced: "تنظیمات بیشتر",

    learn: "Learn",
    generate: "Generate",
    operational: "عملیاتی",
    detailed: "Detailed",

    beginner: "مبتدی",
    intermediate: "متوسط",
    expert: "حرفه‌ای",

    commandShell: "کامند / شل",
    pythonAutomation: "اتوماسیون پایتون",

    inputs: "ورودی‌ها",
    output: "خروجی",
    generateBtn: "ساخت خروجی",
    learnBtn: "توضیح بده",
    swapIO: "جابجایی ورودی ↔ خروجی",
    openErrorAnalyzer: "باز کردن آنالیز خطا",
    errorShortcutText:
      "اگر به خطا خوردی… آنالیز خطا را باز کن تا علت + رفع + صحت‌سنجی را بگیری.",

    placeholderReq: "مثلاً: بررسی امن فضای دیسک روی سرور لینوکس",
    placeholderLearn: "مثلاً: ls -la  یا  Get-Process",
    outputPlaceholder: "خروجی اینجا نمایش داده می‌شود.",

    tip_platform: "سیستم مقصد را انتخاب کن تا خروجی دقیق و درست باشد.",
    tip_vendor: "وندور شبکه را انتخاب کن (با بک‌اند باید یکی باشد).",
    tip_deviceType: "نوع دستگاه شبکه را انتخاب کن.",
    tip_outputType: "خروجی کامند/شل یا اسکریپت پایتون بگیر.",
    tip_cliShell: "شل متناسب سیستم را انتخاب کن.",
    tip_mode: "Generate: تولید دستور. Learn: توضیح و آموزش یک کامند/کد.",
    tip_knowledge: "عمق توضیح را کنترل می‌کند.",
    tip_style: "عملیاتی: خلاصه. Detailed: توضیح بیشتر + هشدارها.",
    tip_request: "درخواستت را دقیق بنویس و محدودیت‌ها را بگو.",
    tip_learnInput: "کامند/کدی که می‌خواهی توضیح داده شود را قرار بده.",

    ea_title: "آنالیز خطا",
    ea_command: "کامند / خطا / لاگ",
    ea_context: "توضیح تکمیلی (اختیاری)",
    ea_analyze: "تحلیل",
    ea_clear: "پاک کردن",
    ea_result: "نتیجه تحلیل اینجا نمایش داده می‌شود.",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("ccg_lang") || "en");
  const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
EOF

# ---- client/src/components/error/ErrorAnalyzerModal.jsx (payload unified + MarkdownBox prop) ----
cat > "${ROOT_DIR}/client/src/components/error/ErrorAnalyzerModal.jsx" <<'EOF'
// client/src/components/error/ErrorAnalyzerModal.jsx
import { useEffect, useMemo, useState } from "react";
import { callCCG } from "../../services/aiService";
import MarkdownBox from "../ui/MarkdownBox";
import { useLanguage } from "../../context/LanguageContext";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const canSubmit = useMemo(() => command.trim().length > 0, [command]);

  async function analyze() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");

    try {
      const payload = {
        mode: "error",
        lang: lang || "en",
        user_request: command.trim(),
        error_message: context.trim() || "",
        // unify fields (backend normalize middleware هم اینا رو می‌فهمه)
        os: "unknown",
        platform: "unknown",
        cli: "cli",
        deviceType: "general",
        outputType: "command",
        output_style: "detailed",
        knowledgeLevel: "beginner",
      };

      const res = await callCCG(payload);
      setOutput(res.markdown || "");
    } catch (e) {
      setErr(e?.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[96%] max-w-3xl ccg-card p-4 sm:p-6 max-h-[86vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold">{t("ea_title")}</h2>
          <button onClick={onClose} className="ccg-btn-ghost px-3 text-xl leading-none" type="button">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-slate-200/80">{t("ea_command")}</label>
          <textarea
            className="ccg-textarea w-full h-28 sm:h-32"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={lang === "fa" ? "خروجی خطا/لاگ را قرار بده..." : "Paste your error/log/output..."}
          />

          <label className="text-sm text-slate-200/80">{t("ea_context")}</label>
          <textarea
            className="ccg-textarea w-full h-24"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={lang === "fa" ? "اختیاری: چه کاری انجام می‌دادی؟" : "Optional: what were you doing?"}
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
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {err}
            </div>
          ) : null}

          {output ? <MarkdownBox content={output} lang={lang} /> : null}
        </div>
      </div>
    </div>
  );
}
EOF

# ---- client/src/App.jsx (mount ErrorAnalyzerModal + event listener) ----
cat > "${ROOT_DIR}/client/src/App.jsx" <<'EOF'
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
      const d = e?.detail || {};
      setErrorSeed({ command: d.command || "", context: d.context || "" });
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

      <ErrorAnalyzerModal open={errorOpen} onClose={() => setErrorOpen(false)} seed={errorSeed} />
    </MainLayout>
  );
}
EOF

# ---- client/src/pages/generator/GeneratorPage.jsx (compact UI + learn mode + unified payload) ----
cat > "${ROOT_DIR}/client/src/pages/generator/GeneratorPage.jsx" <<'EOF'
import { useEffect, useMemo, useState } from "react";
import MarkdownBox from "../../components/ui/MarkdownBox";
import Tooltip from "../../components/ui/Tooltip";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";

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
  const { lang, t } = useLanguage();

  // main modes
  const [mode, setMode] = useState("generate"); // generate | learn
  const [platform, setPlatform] = useState("linux");

  // generate options
  const [outputType, setOutputType] = useState("command"); // command | python
  const [style, setStyle] = useState("operational"); // operational | detailed

  // advanced (optional)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [level, setLevel] = useState("beginner");

  // platform-dependent
  const [shell, setShell] = useState("bash");
  const [vendor, setVendor] = useState(NETWORK_VENDORS[0].value);
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES_BY_VENDOR[NETWORK_VENDORS[0].value][0].value);

  // IO
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  // swap layout state
  const [swapLayout, setSwapLayout] = useState(false);

  const shellOptions = useMemo(
    () => (platform === "network" ? [] : SHELL_BY_PLATFORM[platform] || []),
    [platform]
  );

  const deviceTypeOptions = useMemo(
    () => DEVICE_TYPES_BY_VENDOR[vendor] || [],
    [vendor]
  );

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

  const canSubmit = input.trim().length > 0 && !loading;

  const openErrorAnalyzer = () => {
    window.dispatchEvent(
      new CustomEvent("open-error-analyzer", {
        detail: { command: input || "", context: "" },
      })
    );
  };

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setApiErr("");
    setOutput("");

    try {
      const isNetwork = platform === "network";
      const cli = isNetwork ? vendor : shell;

      // ✅ unified payload: فرانت و بک‌اند یکی
      const payload = {
        mode, // "generate" | "learn"
        lang: lang || "en",

        platform,
        os: platform, // backend legacy compatibility

        outputType: mode === "generate" ? outputType : "command",
        output_style: style,
        knowledgeLevel: level,

        cli,
        shell: isNetwork ? "" : shell,
        vendor: isNetwork ? vendor : "",
        deviceType: isNetwork ? deviceType : "general",

        // legacy keys your backend already uses:
        user_request: input.trim(),
        error_message: "",

        // extra (optional)
        ui: {
          advancedOpen,
        },
      };

      const res = await callCCG(payload);
      setOutput(res.markdown || "");
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Compact Context Panel */}
      <div className="mx-auto max-w-6xl ccg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          {/* Row 1: Mode + Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field
              label={t("mode")}
              tip={t("tip_mode")}
              right={
                <div className="flex rounded-xl border border-white/10 overflow-hidden bg-white/5">
                  <MiniTab active={mode === "generate"} onClick={() => setMode("generate")}>
                    {t("generate")}
                  </MiniTab>
                  <MiniTab active={mode === "learn"} onClick={() => setMode("learn")}>
                    {t("learn")}
                  </MiniTab>
                </div>
              }
            />

            <Field
              label={t("platform")}
              tip={t("tip_platform")}
              right={
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="ccg-select w-full"
                >
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              }
            />

            {/* Output type only in generate */}
            <Field
              label={t("outputType")}
              tip={t("tip_outputType")}
              right={
                mode === "generate" ? (
                  <div className="flex rounded-xl border border-white/10 overflow-hidden bg-white/5">
                    <MiniTab active={outputType === "command"} onClick={() => setOutputType("command")}>
                      {t("commandShell")}
                    </MiniTab>
                    <MiniTab active={outputType === "python"} onClick={() => setOutputType("python")}>
                      {t("pythonAutomation")}
                    </MiniTab>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200/80">
                    {lang === "fa" ? "توضیح/یادگیری" : "Explain/Learn"}
                  </div>
                )
              }
            />

            {/* CLI/Shell or Vendor */}
            <Field
              label={platform === "network" ? t("vendor") : t("cliShell")}
              tip={platform === "network" ? t("tip_vendor") : t("tip_cliShell")}
              right={
                platform === "network" ? (
                  <select
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="ccg-select w-full"
                  >
                    {NETWORK_VENDORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={shell}
                    onChange={(e) => setShell(e.target.value)}
                    className="ccg-select w-full"
                  >
                    {shellOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )
              }
            />
          </div>

          {/* Row 2: network deviceType + style + advanced */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field
              label={t("deviceType")}
              tip={t("tip_deviceType")}
              right={
                platform === "network" ? (
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="ccg-select w-full"
                  >
                    {deviceTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200/60">
                    {lang === "fa" ? "—" : "—"}
                  </div>
                )
              }
            />

            <Field
              label={t("style")}
              tip={t("tip_style")}
              right={
                <div className="flex rounded-xl border border-white/10 overflow-hidden bg-white/5">
                  <MiniTab active={style === "operational"} onClick={() => setStyle("operational")}>
                    {t("operational")}
                  </MiniTab>
                  <MiniTab active={style === "detailed"} onClick={() => setStyle("detailed")}>
                    {t("detailed")}
                  </MiniTab>
                </div>
              }
            />

            <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-between gap-3">
              <button
                type="button"
                className="ccg-btn w-full sm:w-auto"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                {t("advanced")} {advancedOpen ? "▲" : "▼"}
              </button>

              <button
                type="button"
                className="ccg-btn w-full sm:w-auto"
                onClick={() => setSwapLayout((v) => !v)}
              >
                ↔ {t("swapIO")}
              </button>
            </div>

            {advancedOpen ? (
              <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field
                  label={t("knowledge")}
                  tip={t("tip_knowledge")}
                  right={
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="ccg-select w-full"
                    >
                      <option value="beginner">{t("beginner")}</option>
                      <option value="intermediate">{t("intermediate")}</option>
                      <option value="expert">{t("expert")}</option>
                    </select>
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 px-1 sm:px-2">
        {/* Input */}
        <div
          className={`ccg-card p-5 sm:p-7 ${swapLayout ? "order-2" : "order-1"}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("inputs")}</h2>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-200/80">
                {mode === "learn" ? t("learnInput") : t("request")}
              </span>
              <Tooltip text={mode === "learn" ? t("tip_learnInput") : t("tip_request")} side="bottom" />
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "learn" ? t("placeholderLearn") : t("placeholderReq")}
            className="h-48 sm:h-64 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm focus:ring-2 focus:ring-blue-500/40"
          />

          <button
            className="mt-5 sm:mt-6 w-full rounded-2xl bg-blue-600 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={!canSubmit}
            onClick={submit}
            type="button"
          >
            {loading
              ? lang === "fa"
                ? "در حال پردازش..."
                : "Working..."
              : mode === "learn"
              ? t("learnBtn")
              : t("generateBtn")}
          </button>

          {apiErr ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {apiErr}
            </div>
          ) : null}
        </div>

        {/* Output */}
        <div
          className={`ccg-card p-5 sm:p-7 ${swapLayout ? "order-1" : "order-2"}`}
        >
          <h2 className="text-lg font-semibold mb-4">{t("output")}</h2>
          <MarkdownBox content={output || ""} lang={lang} />
        </div>
      </div>

      {/* Error Shortcut */}
      <div className="mx-auto max-w-6xl px-1 sm:px-2">
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

function MiniTab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        "px-3 py-2 text-sm transition",
        active ? "bg-blue-600 text-white" : "text-slate-200/70 hover:bg-white/5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({ label, tip, right }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-200/70">{label}</span>
          <Tooltip text={tip} />
        </div>
      </div>
      {right}
    </div>
  );
}
EOF

echo "==> Frontend patch done."

# ---------- BACKEND PATCH (middleware normalize) ----------
echo "==> Trying to patch backend /api/ccg route with normalize middleware..."

ROUTE_FILE="$(grep -Rsl --exclude-dir=node_modules --exclude-dir=client "/api/ccg" "${ROOT_DIR}" | head -n 1 || true)"
if [ -z "${ROUTE_FILE}" ]; then
  echo "🟡 Could not find backend file containing /api/ccg. Skipping backend patch."
  echo "   (If your backend is in another repo/path, tell me مسیرش کجاست.)"
else
  echo "✅ Found backend route file: ${ROUTE_FILE}"
  backup_file "${ROUTE_FILE}"

  # choose backend base dir (folder of route file)
  BACKEND_BASE="$(cd "$(dirname "${ROUTE_FILE}")" && pwd)"
  # create middleware location near it
  MW_DIR="${BACKEND_BASE}/middleware"
  mkdir -p "${MW_DIR}"

  # write middleware (CJS)
  MW_FILE="${MW_DIR}/ccgNormalize.js"
  backup_file "${MW_FILE}"

  cat > "${MW_FILE}" <<'EOF'
// middleware/ccgNormalize.js
// هدف: یکدست کردن payload های فرانت و سازگاری با بک‌اند فعلی بدون تغییر منطق اصلی route
// - فیلدهای مختلف را map می‌کند به کلیدهای legacy
// - default می‌گذارد تا 400 های ناشی از نبود فیلد کم شود
// - Learn mode را هم استاندارد می‌کند

function guessCli(platform, shell, vendor) {
  if (platform === "network") return vendor || "network";
  if (platform === "windows") return shell || "powershell";
  if (platform === "mac") return shell || "zsh";
  return shell || "bash";
}

// heuristic mismatch detection (سبک و بدون ریسک)
function detectMismatch(platform, text) {
  const s = (text || "").toLowerCase();

  const winHints = ["powershell", "get-process", "get-childitem", "ipconfig", "dir ", "chkdsk", "netsh"];
  const nixHints = ["sudo ", "apt ", "yum ", "dnf ", "systemctl", "ls ", "grep ", "awk ", "chmod ", "chown "];
  const macHints = ["brew ", "defaults write", "launchctl"];
  const isWin = winHints.some((x) => s.includes(x));
  const isNix = nixHints.some((x) => s.includes(x));
  const isMac = macHints.some((x) => s.includes(x));

  if (platform === "windows" && (isNix || isMac)) return "windows";
  if ((platform === "linux") && isWin) return "linux";
  if ((platform === "mac") && (isWin || isNix)) return "mac";
  return "";
}

module.exports = function ccgNormalize(req, res, next) {
  const b = req.body || {};

  const mode = (b.mode || b.task || "generate").toString();
  const lang = (b.lang || "en").toString();

  const platform = (b.platform || b.os || "linux").toString();
  const outputType = (b.outputType || b.output_type || "command").toString();
  const output_style = (b.output_style || b.style || "operational").toString();
  const knowledgeLevel = (b.knowledgeLevel || b.knowledge_level || "beginner").toString();

  const shell = (b.shell || b.cliShell || b.cli || "").toString();
  const vendor = (b.vendor || "").toString();
  const deviceType = (b.deviceType || b.device_type || "general").toString();

  // main input
  const user_request =
    (b.user_request || b.userRequest || b.request || b.input || "").toString();

  const error_message =
    (b.error_message || b.errorMessage || b.context || "").toString();

  const cli = (b.cli || guessCli(platform, shell, vendor)).toString();

  const mismatch = mode === "learn" ? detectMismatch(platform, user_request) : "";

  req.body = {
    ...b,

    // normalized
    mode,
    lang,

    platform,
    os: platform, // legacy

    outputType,
    output_style,
    knowledgeLevel,

    shell,
    vendor,
    deviceType: platform === "network" ? (deviceType || "general") : (deviceType || "general"),
    cli,

    user_request,
    error_message,

    // meta info (اگر بک‌اند خواست استفاده کند)
    ccg_meta: {
      mismatch,
      normalized: true,
    },
  };

  next();
};
EOF

  # Patch route file: inject middleware into app.post/router.post
  if grep -q "ccgNormalize" "${ROUTE_FILE}"; then
    echo "🟢 Backend route already references ccgNormalize. Skipping modification."
  else
    # add require at top if require-style
    if grep -q "require(" "${ROUTE_FILE}"; then
      # insert require near first require
      perl -0777 -i -pe 's/(^.*?\n)(.*?require\(.+?\);\n)/$1$2const ccgNormalize = require(".\/middleware\/ccgNormalize");\n/sm' "${ROUTE_FILE}" || true
      # if not inserted (edge), append after "use strict" or first line
      if ! grep -q "ccgNormalize" "${ROUTE_FILE}"; then
        perl -0777 -i -pe 's/^(.*?\n)/$1const ccgNormalize = require(".\/middleware\/ccgNormalize");\n/s' "${ROUTE_FILE}"
      fi

      # inject middleware into route definition
      perl -0777 -i -pe 's/(app\.post\(\s*["'\'']\/api\/ccg["'\'']\s*,\s*)/\1ccgNormalize, /g' "${ROUTE_FILE}"
      perl -0777 -i -pe 's/(router\.post\(\s*["'\'']\/api\/ccg["'\'']\s*,\s*)/\1ccgNormalize, /g' "${ROUTE_FILE}"
    else
      echo "🟡 Backend route file doesn't look like CommonJS (require). I did not auto-patch it."
      echo "   You can manually add middleware/ccgNormalize.js and plug it in your route."
    fi
  fi

  echo "✅ Backend normalize middleware created: ${MW_FILE}"
  echo "✅ Backend route attempted patch: ${ROUTE_FILE}"
fi

echo ""
echo "✅ Backup created at: ${BACKUP_DIR}"
echo ""
echo "NEXT:"
echo "  cd ${ROOT_DIR}/client"
echo "  npm i"
echo "  npm run build"
echo "  cd ${ROOT_DIR}"
echo "  pm2 restart ccg"
EOF
chmod +x "${ROOT_DIR}/ccg_apply_fix_learn_ui_api.sh"

echo "✅ Script created: ${ROOT_DIR}/ccg_apply_fix_learn_ui_api.sh"
echo ""
echo "Run it:"
echo "  cd ~/CCG"
echo "  bash ./ccg_apply_fix_learn_ui_api.sh"

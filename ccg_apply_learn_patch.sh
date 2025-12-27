#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
CLIENT_DIR="$ROOT/client"

if [[ ! -d "$CLIENT_DIR" ]]; then
  echo "❌ این اسکریپت باید از ریشه پروژه اجرا شود (جایی که client/ وجود دارد)."
  exit 1
fi

TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_$TS"
mkdir -p "$BK"

backup_file() {
  local p="$1"
  if [[ -f "$p" ]]; then
    mkdir -p "$BK/$(dirname "${p#$ROOT/}")"
    cp -a "$p" "$BK/${p#$ROOT/}"
  fi
}

write_file() {
  local path="$1"
  local dir
  dir="$(dirname "$path")"
  mkdir -p "$dir"
  cat > "$path"
}

echo "✅ Backup folder: $BK"
echo "==> Backing up files..."
backup_file "$CLIENT_DIR/src/App.jsx"
backup_file "$CLIENT_DIR/src/hooks/useAppView.jsx"
backup_file "$CLIENT_DIR/src/pages/generator/GeneratorPage.jsx"
backup_file "$CLIENT_DIR/src/components/error/ErrorAnalyzerModal.jsx"
backup_file "$CLIENT_DIR/src/components/ui/MarkdownBox.jsx"
backup_file "$CLIENT_DIR/src/services/aiService.js"
backup_file "$CLIENT_DIR/src/config/api.js"
backup_file "$CLIENT_DIR/src/index.css"

echo "==> Writing patched files..."

# ---------------------------
# client/src/config/api.js
# ---------------------------
write_file "$CLIENT_DIR/src/config/api.js" <<'EOF'
/**
 * Robust API base helper
 * - Supports same-origin (default)
 * - Supports VITE_API_BASE (e.g. https://api.example.com or https://example.com)
 * - Avoids accidental "/api/api/..." double prefix
 */
export const API_BASE = (import.meta.env.VITE_API_BASE || "").trim();

function stripSlashes(x) {
  return x.replace(/\/+$/g, "");
}
function stripLeading(x) {
  return x.replace(/^\/+/g, "");
}

export function withBase(path) {
  const p = `/${stripLeading(path || "")}`;
  if (!API_BASE) return p;

  const b = stripSlashes(API_BASE);

  // Prevent double /api prefix:
  // If base ends with /api and path starts with /api, drop one.
  if (b.endsWith("/api") && p.startsWith("/api/")) {
    return `${b}${p.slice(4)}`; // remove leading "/api"
  }

  return `${b}${p}`;
}
EOF

# ---------------------------
# client/src/services/aiService.js
# ---------------------------
write_file "$CLIENT_DIR/src/services/aiService.js" <<'EOF'
import { withBase } from "../config/api";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * callCCG
 * Unified call for:
 * - intent: "generate" | "learn" | "error" | "compare"
 */
export async function callCCG(payload) {
  const url = withBase("/api/ccg");

  // Helpful debug (kept minimal)
  // eslint-disable-next-line no-console
  console.log("[CCG] POST /api/ccg", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await safeJson(res) : null;

  // eslint-disable-next-line no-console
  console.log("[CCG] status", res.status, "content-type", ct, "bodyKind", data ? "json" : "text");

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (res.status === 404 ? "API route not found" : "API request failed");
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data || { ok: true };
}
EOF

# ---------------------------
# client/src/hooks/useAppView.jsx
# ---------------------------
write_file "$CLIENT_DIR/src/hooks/useAppView.jsx" <<'EOF'
import { createContext, useContext, useMemo, useState } from "react";

/**
 * view:
 *  - generator
 *  - comparator
 *
 * error analyzer is a modal overlay (NOT a separate page)
 */
const AppViewCtx = createContext(null);

export function AppViewProvider({ children }) {
  const [view, setView] = useState("generator");

  // Error Analyzer modal state
  const [errorAnalyzerOpen, setErrorAnalyzerOpen] = useState(false);
  const [errorSeed, setErrorSeed] = useState({ command: "", context: "" });

  const openErrorAnalyzer = (seed) => {
    setErrorSeed({
      command: seed?.command || "",
      context: seed?.context || "",
    });
    setErrorAnalyzerOpen(true);
  };

  const closeErrorAnalyzer = () => setErrorAnalyzerOpen(false);

  const value = useMemo(
    () => ({
      view,
      setView,

      errorAnalyzerOpen,
      errorSeed,
      openErrorAnalyzer,
      closeErrorAnalyzer,
    }),
    [view, errorAnalyzerOpen, errorSeed]
  );

  return <AppViewCtx.Provider value={value}>{children}</AppViewCtx.Provider>;
}

export function useAppView() {
  const ctx = useContext(AppViewCtx);
  if (!ctx) throw new Error("useAppView must be used within AppViewProvider");
  return ctx;
}
EOF

# ---------------------------
# client/src/components/ui/MarkdownBox.jsx
# (Fix: accept both markdown/content props, and use real lang from context optionally)
# ---------------------------
write_file "$CLIENT_DIR/src/components/ui/MarkdownBox.jsx" <<'EOF'
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "../../context/LanguageContext";

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

/**
 * MarkdownBox
 * Backward compatible props:
 * - markdown (old)
 * - content  (new in your pages)
 */
export default function MarkdownBox({ markdown, content, lang: langProp }) {
  const { lang: ctxLang } = useLanguage();
  const lang = langProp || ctxLang || "en";
  const text = (typeof content === "string" ? content : markdown) || "";

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
        {text}
      </ReactMarkdown>
    </div>
  );
}
EOF

# ---------------------------
# client/src/components/error/ErrorAnalyzerModal.jsx
# (Now: intent="error", uses translations + knowledge + proper markdown rendering)
# ---------------------------
write_file "$CLIENT_DIR/src/components/error/ErrorAnalyzerModal.jsx" <<'EOF'
import { useEffect, useMemo, useState } from "react";
import { callCCG } from "../../services/aiService";
import MarkdownBox from "../ui/MarkdownBox";
import { useLanguage } from "../../context/LanguageContext";

export default function ErrorAnalyzerModal({ open, onClose, seed }) {
  const { lang, t } = useLanguage();

  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");

  const [knowledgeLevel, setKnowledgeLevel] = useState("beginner");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!open) return;
    setCommand(seed?.command || "");
    setContext(seed?.context || "");
    setKnowledgeLevel("beginner");
    setErr("");
    setOutput("");
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const canSubmit = useMemo(() => command.trim().length > 0, [command]);

  async function analyze() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");

    try {
      const payload = {
        intent: "error",
        lang: lang || "en",
        platform: "unknown",
        shell: "cli",
        vendor: "",
        deviceType: "",
        outputType: "command",
        knowledgeLevel,
        input: command.trim(),
        context: context.trim() || "",
      };

      const res = await callCCG(payload);

      // If backend returns markdown
      setOutput(res?.markdown || res?.result || "");
    } catch (e) {
      setErr(e?.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-[96vw] max-w-3xl ccg-card p-4 sm:p-6 max-h-[86vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("ea_title")}
          </h2>
          <button onClick={onClose} className="ccg-btn-ghost px-3" type="button">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="ccg-card p-3">
            <div className="text-xs text-slate-500 dark:text-slate-300/70 mb-1">
              {t("knowledge")}
            </div>
            <select
              className="ccg-select w-full"
              value={knowledgeLevel}
              onChange={(e) => setKnowledgeLevel(e.target.value)}
            >
              <option value="beginner">{t("beginner")}</option>
              <option value="intermediate">{t("intermediate")}</option>
              <option value="expert">{t("expert")}</option>
            </select>
          </div>

          <div className="ccg-card p-3 sm:col-span-2">
            <div className="text-xs text-slate-500 dark:text-slate-300/70 mb-1">
              {lang === "fa"
                ? "راهنما"
                : "Tip"}
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200/80">
              {lang === "fa"
                ? "لاگ/خروجی خطا را وارد کن؛ اگر دوست داشتی کانتکست هم اضافه کن."
                : "Paste your error/log output. Add optional context if you can."}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-slate-700 dark:text-slate-200/80">
            {t("ea_command")}
          </label>
          <textarea
            className="ccg-textarea w-full h-28 sm:h-32"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={t("ea_tip_command")}
          />

          <label className="text-sm text-slate-700 dark:text-slate-200/80">
            {t("ea_context")}
          </label>
          <textarea
            className="ccg-textarea w-full h-24"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t("ea_tip_context")}
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
              <MarkdownBox content={output} />
            </div>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-300/70">
              {t("ea_result")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
EOF

# ---------------------------
# client/src/pages/generator/GeneratorPage.jsx
# (NEW: intent Learn/Generate + OS mismatch gating handled by backend)
# (Also: each selection inside its own card)
# ---------------------------
write_file "$CLIENT_DIR/src/pages/generator/GeneratorPage.jsx" <<'EOF'
import { useEffect, useMemo, useState } from "react";
import MarkdownBox from "../../components/ui/MarkdownBox";
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

  // Context selections
  const [platform, setPlatform] = useState("linux");
  const [outputType, setOutputType] = useState("command"); // command | python
  const [intent, setIntent] = useState("generate"); // generate | learn
  const [style, setStyle] = useState("operational"); // operational | detailed (generate only)
  const [knowledgeLevel, setKnowledgeLevel] = useState("beginner");

  const [shell, setShell] = useState("bash");
  const [vendor, setVendor] = useState(NETWORK_VENDORS[0].value);
  const [deviceType, setDeviceType] = useState(
    DEVICE_TYPES_BY_VENDOR[NETWORK_VENDORS[0].value][0].value
  );

  // Main input/output
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [apiError, setApiError] = useState("");

  // Swap layout (keep)
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

  const openErrorAnalyzer = () => {
    window.dispatchEvent(
      new CustomEvent("open-error-analyzer", {
        detail: { command: input || "", context: "" },
      })
    );
  };

  const canSubmit = input.trim().length > 0;

  async function submit() {
    if (!canSubmit) return;

    setApiError("");
    setOutput("");

    const payload = {
      intent, // ✅ NEW: learn/generate
      lang: lang || "en",

      platform,
      shell: platform === "network" ? "" : shell,
      vendor: platform === "network" ? vendor : "",
      deviceType: platform === "network" ? deviceType : "",

      outputType, // command | python
      style: intent === "generate" ? style : "",
      knowledgeLevel,

      input: input.trim(),
      context: "", // reserved for future (optional)
    };

    try {
      const res = await callCCG(payload);

      // Backend may return:
      // - markdown
      // - compatible=false with guidance markdown
      setOutput(res?.markdown || res?.result || "");
      if (!res?.markdown && !res?.result) {
        setOutput(lang === "fa" ? "پاسخ خالی از API دریافت شد." : "Empty response from API.");
      }
    } catch (e) {
      setApiError(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    }
  }

  const isNetwork = platform === "network";

  const primaryLabel =
    intent === "learn"
      ? lang === "fa"
        ? "توضیح بده"
        : "Explain"
      : t("generate");

  const placeholder =
    intent === "learn"
      ? lang === "fa"
        ? "یک کامند/کد/بخشی از خروجی را اینجا Paste کن تا توضیح بدم..."
        : "Paste a command/code/log you want explained..."
      : t("placeholderReq");

  return (
    <div className="space-y-8">
      {/* ===== Context Cards (each option in its own box) ===== */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card label={t("platform")} tip={t("tip_platform")}>
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
        </Card>

        {isNetwork ? (
          <Card label={t("vendor")} tip={t("tip_vendor")}>
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
          </Card>
        ) : (
          <Card label={t("cliShell")} tip={t("tip_cliShell")}>
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
          </Card>
        )}

        {isNetwork ? (
          <Card label={t("deviceType")} tip={t("tip_deviceType")}>
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
          </Card>
        ) : (
          <Card label={t("outputType")} tip={t("tip_outputType")}>
            <div className="flex rounded-xl border border-[var(--border)] p-1">
              <Toggle active={outputType === "command"} onClick={() => setOutputType("command")}>
                {t("commandShell")}
              </Toggle>
              <Toggle active={outputType === "python"} onClick={() => setOutputType("python")}>
                {t("pythonAutomation")}
              </Toggle>
            </div>
          </Card>
        )}

        <Card
          label={lang === "fa" ? "مود" : "Mode"}
          tip={
            lang === "fa"
              ? "Generate برای ساخت خروجی جدید است. Learn برای توضیح دادن چیزی است که وارد می‌کنی."
              : "Generate produces new output. Learn explains what you paste."
          }
        >
          <div className="flex rounded-xl border border-[var(--border)] p-1">
            <Toggle active={intent === "generate"} onClick={() => setIntent("generate")}>
              {lang === "fa" ? "Generate" : "Generate"}
            </Toggle>
            <Toggle active={intent === "learn"} onClick={() => setIntent("learn")}>
              {lang === "fa" ? "Learn" : "Learn"}
            </Toggle>
          </div>
        </Card>

        <Card label={t("knowledge")} tip={t("tip_knowledge")}>
          <select
            value={knowledgeLevel}
            onChange={(e) => setKnowledgeLevel(e.target.value)}
            className="ccg-select w-full"
          >
            <option value="beginner">{t("beginner")}</option>
            <option value="intermediate">{t("intermediate")}</option>
            <option value="expert">{t("expert")}</option>
          </select>
        </Card>

        <Card
          label={t("outputType")}
          tip={t("tip_outputType")}
        >
          <div className="flex rounded-xl border border-[var(--border)] p-1">
            <Toggle active={outputType === "command"} onClick={() => setOutputType("command")}>
              {t("commandShell")}
            </Toggle>
            <Toggle active={outputType === "python"} onClick={() => setOutputType("python")}>
              {t("pythonAutomation")}
            </Toggle>
          </div>
        </Card>

        <Card
          label={lang === "fa" ? "استایل خروجی" : "Output Style"}
          tip={
            lang === "fa"
              ? "برای Generate. Operational خلاصه و کاربردی است. Detailed توضیح‌دارتر است."
              : "For Generate. Operational is concise. Detailed is more verbose."
          }
        >
          <div className="flex rounded-xl border border-[var(--border)] p-1">
            <Toggle
              active={style === "operational"}
              onClick={() => setStyle("operational")}
              disabled={intent !== "generate"}
            >
              {lang === "fa" ? "Operational" : "Operational"}
            </Toggle>
            <Toggle
              active={style === "detailed"}
              onClick={() => setStyle("detailed")}
              disabled={intent !== "generate"}
            >
              {lang === "fa" ? "Detailed" : "Detailed"}
            </Toggle>
          </div>
          {intent !== "generate" ? (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
              {lang === "fa" ? "در حالت Learn غیرفعال است." : "Disabled in Learn mode."}
            </div>
          ) : null}
        </Card>
      </div>

      {/* ===== Main Grid (Swap layout) ===== */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 px-1 sm:px-2">
        {/* Input Card */}
        <div
          className={`rounded-2xl bg-white shadow dark:bg-slate-900/60 dark:border dark:border-white/10 p-5 sm:p-8 ${
            swapLayout ? "order-2" : "order-1"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("inputs")}</h2>
            <button
              onClick={() => setSwapLayout((v) => !v)}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-white/10 dark:border-white/10"
              type="button"
            >
              ↔ {t("swapIO")}
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-700 dark:text-slate-200/80">
              {intent === "learn" ? (lang === "fa" ? "متن برای توضیح" : "Text to explain") : t("request")}
            </div>
            <button
              type="button"
              className="ccg-btn"
              onClick={openErrorAnalyzer}
              title={t("openErrorAnalyzer")}
            >
              ⚠️ {t("openErrorAnalyzer")}
            </button>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="h-48 sm:h-64 w-full resize-none rounded-xl border p-4 text-sm focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:border-white/10"
          />

          <button
            className="mt-5 sm:mt-6 w-full rounded-xl bg-blue-600 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={!canSubmit}
            onClick={submit}
            type="button"
          >
            {primaryLabel}
          </button>

          {apiError ? (
            <div className="ccg-error mt-4">
              <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
              <div className="text-sm">{apiError}</div>
            </div>
          ) : null}
        </div>

        {/* Output Card */}
        <div
          className={`rounded-2xl bg-white shadow dark:bg-slate-900/60 dark:border dark:border-white/10 p-5 sm:p-8 ${
            swapLayout ? "order-1" : "order-2"
          }`}
        >
          <h2 className="text-lg font-semibold mb-4">{t("output")}</h2>
          <MarkdownBox content={output || t("outputPlaceholder")} />
        </div>
      </div>

      {/* ===== Error Shortcut (mobile friendly) ===== */}
      <div className="mx-auto max-w-6xl px-1 sm:px-2">
        <div className="rounded-2xl border bg-white p-5 sm:p-6 text-sm dark:bg-slate-900/60 dark:border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span>⚠️ {t("errorShortcutText")}</span>
            <button
              className="rounded-lg border px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/10 dark:border-white/10 w-full sm:w-auto"
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

/* -----------------------------
   UI helpers
------------------------------ */

function Toggle({ active, children, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      type="button"
      disabled={disabled}
      className={`px-4 py-2 text-sm rounded-md transition w-full ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : active
          ? "bg-blue-600 text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-200/80 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ label, tip, children }) {
  return (
    <div className="ccg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200/90">
          {label}
        </div>
        <Help tip={tip} />
      </div>
      {children}
    </div>
  );
}

function Help({ tip }) {
  return (
    <span className="relative group">
      <button
        type="button"
        className="w-6 h-6 rounded-full border text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 dark:border-white/10"
        aria-label="help"
      >
        ?
      </button>

      <span className="pointer-events-none absolute z-50 hidden group-hover:block top-8 left-1/2 -translate-x-1/2 w-72 rounded-lg border bg-white p-2 text-xs text-slate-700 shadow dark:bg-slate-950 dark:text-slate-100 dark:border-white/10">
        {tip}
      </span>
    </span>
  );
}
EOF

# ---------------------------
# client/src/App.jsx
# (Wire: open-error-analyzer event -> AppView modal)
# ---------------------------
write_file "$CLIENT_DIR/src/App.jsx" <<'EOF'
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
  const { view, errorAnalyzerOpen, errorSeed, openErrorAnalyzer, closeErrorAnalyzer } =
    useAppView();

  // (kept) auth modal event hook placeholder
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const openAuth = () => setAuthOpen(true);
    window.addEventListener("open-auth-modal", openAuth);
    return () => window.removeEventListener("open-auth-modal", openAuth);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      openErrorAnalyzer(e?.detail || { command: "", context: "" });
    };
    window.addEventListener("open-error-analyzer", handler);
    return () => window.removeEventListener("open-error-analyzer", handler);
  }, [openErrorAnalyzer]);

  return (
    <MainLayout>
      <Toaster position="top-center" />

      <Header />

      <main className="ccg-container mx-auto py-6 sm:py-8">
        {view === "generator" && <GeneratorPage />}
        {view === "comparator" && <CodeComparatorPage />}
      </main>

      <Footer />

      {/* Modal overlay */}
      <ErrorAnalyzerModal
        open={errorAnalyzerOpen}
        onClose={closeErrorAnalyzer}
        seed={errorSeed}
      />

      {/* authOpen is kept for your future auth modal wiring */}
      {authOpen ? null : null}
    </MainLayout>
  );
}
EOF

# ---------------------------
# client/src/index.css
# (Remove google @import to avoid build warnings, unify theme + add markdown styles + error box)
# ---------------------------
write_file "$CLIENT_DIR/src/index.css" <<'EOF'
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
    --card-solid: #ffffff;
    --border: rgba(15,23,42,.10);

    --primary: #2563eb;
  }

  [data-theme="dark"]{
    --bg: #070b14;
    --text: #e5e7eb;
    --muted: #94a3b8;

    --card: rgba(15,23,42,.55);
    --card-solid: #0b1020;
    --border: rgba(148,163,184,.16);

    --primary: #60a5fa;
  }

  html, body { height: 100%; }
  html {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-en);
  }
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
    @apply px-2 py-1 text-xs rounded-lg;
  }

  .ccg-error{
    border: 1px solid rgba(239,68,68,.35);
    background: rgba(239,68,68,.08);
    @apply rounded-2xl p-4 text-slate-900;
  }
  .dark .ccg-error{
    color: #fff;
  }

  /* Markdown */
  .ccg-markdown{
    @apply text-sm leading-7;
    color: var(--text);
  }
  .ccg-markdown.rtl{ direction: rtl; }
  .ccg-markdown.ltr{ direction: ltr; }

  .ccg-markdown h1, .ccg-markdown h2, .ccg-markdown h3{
    @apply font-semibold mt-4 mb-2;
  }
  .ccg-markdown ul{
    @apply list-disc ps-6 my-2;
  }
  .ccg-markdown ol{
    @apply list-decimal ps-6 my-2;
  }

  .ccg-inline-code{
    @apply px-1 py-0.5 rounded bg-black/5 dark:bg-white/10;
  }

  .ccg-codeblock{
    @apply my-3 rounded-2xl overflow-hidden border;
    border-color: var(--border);
    background: rgba(2,6,23,.92);
  }
  .ccg-codeblock-head{
    @apply flex items-center justify-between gap-3 px-4 py-2 border-b;
    border-color: rgba(148,163,184,.18);
  }
  .ccg-codeblock-title{
    @apply text-xs font-semibold text-slate-200;
  }
  .ccg-pre{
    @apply overflow-auto p-4 text-xs text-slate-100;
  }
}
EOF

echo "==> Done patching frontend."

echo ""
echo "✅ Now run:"
echo "   cd client"
echo "   npm i"
echo "   npm run build"
echo "   (then restart pm2 as you already do)"
echo ""
echo "🟡 Backend: I provide the exact backend patch below — but I need you to paste your current backend route/controller file for /api/ccg so I patch it without breaking your structure."
echo ""
echo "Backup created at: $BK"
EOF

chmod +x "$ROOT/ccg_apply_learn_patch.sh"

echo "✅ Script created: ./ccg_apply_learn_patch.sh"
echo "Run it from project root."

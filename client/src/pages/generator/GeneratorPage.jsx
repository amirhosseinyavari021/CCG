// client/src/pages/generator/GeneratorPage.jsx
// NOTE: This file intentionally contains all UI parts in one place (Generator + Comparator + Error Analyzer Modal)
// to keep structure stable and avoid missing imports while you finalize "Home" before Auth/Dashboard.

import React, { useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import { useLanguage } from "../../context/LanguageContext";
import { generateCommand, compareCode, analyzeError } from "../../services/aiService";
import MarkdownBox from "../../components/ui/MarkdownBox";

/* =======================================================================================
  UI Helpers (Button / Badge / Tooltip / Modal / Cards)
======================================================================================= */

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/** ✅ Tooltip that stays readable + doesn't get clipped */
function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="ccg-btn ccg-btn-ghost ccg-btn-xs"
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          lineHeight: 1.4,
          opacity: 0.9,
        }}
        aria-label="help"
        title="help"
      >
        ?
      </button>

      {open ? (
        <span
          className="ccg-panel"
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            minWidth: 260,
            maxWidth: 340,
            padding: 12,
            zIndex: 9999,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text)", opacity: 0.92 }}>
            {text}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function CopyBtn({ value, lang }) {
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
    <button type="button" onClick={onCopy} className="ccg-btn ccg-btn-ghost ccg-btn-xs">
      {copied ? (lang === "fa" ? "کپی شد" : "Copied") : (lang === "fa" ? "کپی" : "Copy")}
    </button>
  );
}

function SectionTitle({ title, hint }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      {hint ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</div> : null}
    </div>
  );
}

function Panel({ children, className, style }) {
  return (
    <div className={cx("ccg-panel", className)} style={{ padding: 18, ...style }}>
      {children}
    </div>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="ccg-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {right || null}
      </div>
      {children}
    </div>
  );
}

/** ✅ Modal (for Error Analyzer) */
function Modal({ open, title, onClose, children, lang }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
    >
      <div
        className="ccg-panel"
        style={{
          width: "min(980px, 100%)",
          maxHeight: "88vh",
          overflow: "auto",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <button type="button" className="ccg-btn ccg-btn-ghost ccg-btn-xs" onClick={onClose}>
            {lang === "fa" ? "بستن" : "Close"}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/* =======================================================================================
  Main Page
======================================================================================= */

export default function GeneratorPage() {
  const { isRTL, lang } = useLanguage();

  // views: generator | compare
  const [view, setView] = useState("generator");

  // shared
  const [knowledgeLevel, setKnowledgeLevel] = useState("beginner"); // beginner|intermediate|expert

  // generator inputs
  const [platform, setPlatform] = useState("Linux");
  const [cli, setCli] = useState("bash");
  const [deviceType, setDeviceType] = useState("router"); // only for network platforms
  const [mode, setMode] = useState("learn"); // learn|operational

  // ✅ Python option: output/script type
  const [scriptType, setScriptType] = useState("shell"); // shell|python

  const [userRequest, setUserRequest] = useState("");

  // compare inputs
  const [codeLang, setCodeLang] = useState("bash"); // bash|python|powershell|cmd|...
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");
  const [swapAB, setSwapAB] = useState(false);

  // output
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [result, setResult] = useState(null);
  const [outputMarkdown, setOutputMarkdown] = useState("");

  // error analyzer modal
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [errorResult, setErrorResult] = useState(null);
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorApiError, setErrorApiError] = useState("");

  const normalizedPlatform = (platform || "").trim().toLowerCase();
  const isNetwork = useMemo(() => ["cisco", "mikrotik", "fortigate"].includes(normalizedPlatform), [normalizedPlatform]);

  // CLI options depending on platform
  const cliOptions = useMemo(() => {
    const map = {
      Linux: ["bash", "zsh"],
      macOS: ["zsh", "bash"],
      Windows: ["powershell", "cmd"],
      "Windows Server": ["powershell"],
      Cisco: ["ios"],
      MikroTik: ["routeros"],
      FortiGate: ["fortios"],
    };
    const base = map[platform] || ["bash"];

    // ✅ If scriptType is python, we force cli = python (script)
    if (scriptType === "python") return ["python"];

    // For shell mode, allow adding python as an extra option if you want (optional)
    // but we keep it clean: python is scriptType, not shell.
    return base;
  }, [platform, scriptType]);

  // keep CLI valid
  useEffect(() => {
    if (!cliOptions.includes(cli)) setCli(cliOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliOptions.join("|")]);

  // reset deviceType when leaving network
  useEffect(() => {
    if (!isNetwork) setDeviceType("general");
    if (isNetwork && (!deviceType || deviceType === "general")) setDeviceType("router");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNetwork]);

  // texts
  const t = useMemo(() => {
    const fa = {
      headerHint: "Markdown + Copy + Safe Output",
      inputs: "ورودی‌ها",
      output: "خروجی",
      generator: "Generator",
      comparator: "Code Comparator",
      openAnalyzer: "Error Analyzer",
      platform: "پلتفرم",
      cli: "CLI / Shell",
      deviceType: "نوع دیوایس",
      mode: "مود خروجی",
      level: "سطح دانش",
      request: "درخواست",
      scriptType: "نوع خروجی",
      shell: "Command / Shell",
      python: "Python Automation",
      learn: "Learn / آموزشی",
      operational: "Operational / حرفه‌ای",
      beginner: "Beginner / تازه‌کار",
      intermediate: "Intermediate / متوسط",
      expert: "Expert / حرفه‌ای",
      generateBtn: "تولید خروجی",
      compareBtn: "تحلیل و مقایسه",
      codeA: "کد A",
      codeB: "کد B",
      swapAB: "Swap A ↔ B",
      lang: "زبان کد",
      outCommand: "Command",
      outExplanation: "Explanation",
      outAlternatives: "Alternatives (max 3)",
      outWarnings: "Warnings",
      outMarkdown: "Markdown Output",
      empty: "اینجا خروجی نمایش داده می‌شود.",
      apiError: "خطا در ارتباط با API",
      fixWithAnalyzer: "اگر به ارور خوردی…",
      fixWithAnalyzerSub: "Error Analyzer رو باز کن، لاگ/ارور رو بده، Root cause + Fix + Verification بگیر.",
      open: "باز کردن",
      close: "بستن",
      run: "Run",
      analyze: "تحلیل خطا",
      errorInput: "لاگ / ارور / استک‌تریس",
      placeholderReq: "مثلاً: می‌خوام اتصال اینترنت رو تست کنم / می‌خوام فضای دیسک رو بررسی کنم",
      placeholderErr: "Paste کن: خروجی ترمینال، ارور برنامه، لاگ nginx/node، stack trace...",
      deviceRouter: "روتر",
      deviceSwitch: "سوییچ",
      deviceFirewall: "فایروال",
      tipPlatform: "سیستم‌عامل/دیوایس هدف که خروجی برای آن ساخته می‌شود.",
      tipCli: "محیط اجرای دستور (Shell/CLI). اگر Python Automation انتخاب کنی، این خودش Python می‌شود.",
      tipDevice: "برای خروجی دقیق‌تر روی تجهیزات شبکه (Router/Switch/Firewall).",
      tipMode: "Learn: توضیح و آموزش بیشتر | Operational: خلاصه‌تر + هشدار دقیق‌تر برای محیط واقعی",
      tipLevel: "عمق توضیح و تحلیل با این تنظیم تغییر می‌کند.",
      tipScript: "Command/Shell خروجی دستورات | Python Automation خروجی اسکریپت اتوماسیون با Python",
      tipCodeLang: "نوع زبان کد برای مقایسه (برای بک‌اند هم ارسال می‌شود).",
      tipAnalyzer: "لاگ یا ارور رو بده تا علت، راه‌حل و مراحل Verify رو بگیری.",
    };

    const en = {
      headerHint: "Markdown + Copy + Safe Output",
      inputs: "Inputs",
      output: "Output",
      generator: "Generator",
      comparator: "Code Comparator",
      openAnalyzer: "Error Analyzer",
      platform: "Platform",
      cli: "CLI / Shell",
      deviceType: "Device Type",
      mode: "Output Mode",
      level: "Knowledge Level",
      request: "Request",
      scriptType: "Output Type",
      shell: "Command / Shell",
      python: "Python Automation",
      learn: "Learn",
      operational: "Operational",
      beginner: "Beginner",
      intermediate: "Intermediate",
      expert: "Expert",
      generateBtn: "Generate Output",
      compareBtn: "Compare & Analyze",
      codeA: "Code A",
      codeB: "Code B",
      swapAB: "Swap A ↔ B",
      lang: "Code Language",
      outCommand: "Command",
      outExplanation: "Explanation",
      outAlternatives: "Alternatives (max 3)",
      outWarnings: "Warnings",
      outMarkdown: "Markdown Output",
      empty: "Output will appear here.",
      apiError: "API error",
      fixWithAnalyzer: "If you hit an error…",
      fixWithAnalyzerSub: "Open Error Analyzer, paste logs/errors, get root cause + fix + verification steps.",
      open: "Open",
      close: "Close",
      run: "Run",
      analyze: "Analyze Error",
      errorInput: "Logs / Error / Stack trace",
      placeholderReq: "e.g. I want to test internet connectivity / check disk usage",
      placeholderErr: "Paste: terminal output, app error, nginx/node logs, stack trace...",
      deviceRouter: "Router",
      deviceSwitch: "Switch",
      deviceFirewall: "Firewall",
      tipPlatform: "Target OS / device to generate for.",
      tipCli: "Shell/CLI environment. Python Automation forces python output.",
      tipDevice: "Refines network device output (Router/Switch/Firewall).",
      tipMode: "Learn: more guidance | Operational: concise + risk-focused warnings",
      tipLevel: "Affects depth of explanation and analysis.",
      tipScript: "Command/Shell generates commands | Python Automation generates python script automation",
      tipCodeLang: "Code language for comparator (also sent to backend).",
      tipAnalyzer: "Paste logs and get root cause + fix + verification steps.",
    };

    return lang === "fa" ? fa : en;
  }, [lang]);

  // reset output when view changes
  useEffect(() => {
    setApiError("");
    setResult(null);
    setOutputMarkdown("");
  }, [view]);

  // Submit actions
  async function onRun() {
    setApiError("");
    setResult(null);
    setOutputMarkdown("");

    // validation
    if (view === "generator" && !userRequest.trim()) return;
    if (view === "compare" && (!codeA.trim() || !codeB.trim())) return;

    setLoading(true);
    try {
      if (view === "generator") {
        const payload = {
          user_request: userRequest.trim(),
          os: platform,
          cli,
          deviceType: isNetwork ? deviceType : "general",
          lang,
          mode, // learn | operational
          knowledgeLevel, // beginner | intermediate | expert
          scriptType, // shell | python  (✅ new)
        };

        const res = await generateCommand(payload);
        setResult(res || null);

        // prefer structured fields if present
        const md = res?.outputMarkdown || res?.output || "";
        setOutputMarkdown(md);

        // if backend returns error-like content, open analyzer hint
        // (optional behavior)
      } else {
        const payload = {
          input_a: swapAB ? codeB : codeA,
          input_b: swapAB ? codeA : codeB,
          lang,
          knowledgeLevel,
          codeLang, // ✅ new
        };
        const res = await compareCode(payload);
        setResult(res || null);
        setOutputMarkdown(res?.outputMarkdown || res?.output || "");
      }
    } catch (e) {
      const msg = e?.message || t.apiError;
      setApiError(msg);

      // ✅ if API errors, suggest analyzer (but do NOT auto open)
      // You can choose to auto open:
      // setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function onAnalyzeError() {
    setErrorApiError("");
    setErrorResult(null);

    if (!errorText.trim()) return;

    setErrorLoading(true);
    try {
      const payload = {
        lang,
        knowledgeLevel,
        os: platform,
        cli: scriptType === "python" ? "python" : cli,
        deviceType: isNetwork ? deviceType : "general",
        error: errorText.trim(),
        // hint fields
        scriptType,
      };
      const res = await analyzeError(payload);
      setErrorResult(res || null);
    } catch (e) {
      setErrorApiError(e?.message || t.apiError);
    } finally {
      setErrorLoading(false);
    }
  }

  // Output helpers
  const alternatives = useMemo(() => {
    const arr = Array.isArray(result?.alternatives) ? result.alternatives : [];
    return arr.slice(0, 3); // ✅ max 3
  }, [result]);

  const warnings = useMemo(() => {
    const arr = Array.isArray(result?.warnings) ? result.warnings : [];
    return arr;
  }, [result]);

  // Layout direction for main grid: keep stable, but allow RTL comfortable reading
  const gridDir = isRTL ? "rtl" : "ltr";

  /* =======================================================================================
    Render: Inputs Panel
  ======================================================================================= */

  function ViewTabs() {
    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          className={cx("ccg-btn", view === "generator" ? "ccg-btn-primary" : "ccg-btn-ghost")}
          onClick={() => setView("generator")}
        >
          {t.generator}
        </button>

        <button
          type="button"
          className={cx("ccg-btn", view === "compare" ? "ccg-btn-primary" : "ccg-btn-ghost")}
          onClick={() => setView("compare")}
        >
          {t.comparator}
        </button>

        {/* ✅ Error Analyzer is NOT a tab: modal opener */}
        <button
          type="button"
          className="ccg-btn ccg-btn-ghost"
          onClick={() => setErrorModalOpen(true)}
        >
          {t.openAnalyzer}
        </button>
      </div>
    );
  }

  function SharedControls() {
    return (
      <>
        {/* Knowledge Level (shared) */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.level}
            <HelpTip text={t.tipLevel} />
          </label>

          <select className="ccg-select" value={knowledgeLevel} onChange={(e) => setKnowledgeLevel(e.target.value)}>
            <option value="beginner">{t.beginner}</option>
            <option value="intermediate">{t.intermediate}</option>
            <option value="expert">{t.expert}</option>
          </select>
        </div>
      </>
    );
  }

  function GeneratorControls() {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {/* Platform */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.platform}
            <HelpTip text={t.tipPlatform} />
          </label>

          <select className="ccg-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option>Linux</option>
            <option>macOS</option>
            <option>Windows</option>
            <option>Windows Server</option>
            <option>Cisco</option>
            <option>MikroTik</option>
            <option>FortiGate</option>
          </select>
        </div>

        {/* Output Type: Shell vs Python */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.scriptType}
            <HelpTip text={t.tipScript} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              className={cx("ccg-btn", scriptType === "shell" ? "ccg-btn-primary" : "ccg-btn-ghost")}
              onClick={() => setScriptType("shell")}
            >
              {t.shell}
            </button>

            <button
              type="button"
              className={cx("ccg-btn", scriptType === "python" ? "ccg-btn-primary" : "ccg-btn-ghost")}
              onClick={() => setScriptType("python")}
            >
              {t.python}
            </button>
          </div>
        </div>

        {/* CLI */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.cli}
            <HelpTip text={t.tipCli} />
          </label>

          <select className="ccg-select" value={cli} onChange={(e) => setCli(e.target.value)}>
            {cliOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        {/* Device Type only for network */}
        {isNetwork ? (
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
              {t.deviceType}
              <HelpTip text={t.tipDevice} />
            </label>

            <select className="ccg-select" value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
              <option value="router">{t.deviceRouter}</option>
              <option value="switch">{t.deviceSwitch}</option>
              <option value="firewall">{t.deviceFirewall}</option>
            </select>
          </div>
        ) : null}

        {/* Knowledge (shared) */}
        <SharedControls />

        {/* Mode */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.mode}
            <HelpTip text={t.tipMode} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              className={cx("ccg-btn", mode === "learn" ? "ccg-btn-primary" : "ccg-btn-ghost")}
              onClick={() => setMode("learn")}
            >
              {t.learn}
            </button>
            <button
              type="button"
              className={cx("ccg-btn", mode === "operational" ? "ccg-btn-primary" : "ccg-btn-ghost")}
              onClick={() => setMode("operational")}
            >
              {t.operational}
            </button>
          </div>
        </div>

        {/* Request */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.request}
            <HelpTip text={lang === "fa" ? "هدفت رو طبیعی بنویس. خروجی دقیق‌تر می‌گیری." : "Describe the goal in natural language."} />
          </label>

          <textarea
            className="ccg-textarea"
            style={{ minHeight: 170, resize: "vertical" }}
            dir={lang === "fa" ? "rtl" : "ltr"}
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            placeholder={t.placeholderReq}
          />
        </div>

        {/* Run */}
        <button
          type="button"
          className={cx("ccg-btn", "ccg-btn-primary")}
          onClick={onRun}
          disabled={loading}
          style={{ opacity: loading ? 0.75 : 1 }}
        >
          {loading ? (lang === "fa" ? "در حال پردازش..." : "Working...") : t.generateBtn}
        </button>

        {/* API error */}
        {apiError ? (
          <div className="ccg-error">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t.apiError}</div>
            <div style={{ opacity: 0.9 }}>{String(apiError)}</div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="ccg-btn ccg-btn-ghost" onClick={() => setErrorModalOpen(true)}>
                {t.openAnalyzer}
              </button>
            </div>
          </div>
        ) : null}

        {/* Error analyzer hint card (not a tab) */}
        <div
          className="ccg-card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 800 }}>{t.fixWithAnalyzer}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{t.fixWithAnalyzerSub}</div>
          </div>

          <button type="button" className="ccg-btn" onClick={() => setErrorModalOpen(true)}>
            {t.open}
          </button>
        </div>
      </div>
    );
  }

  function ComparatorControls() {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {/* ✅ Only knowledge (shared) */}
        <SharedControls />

        {/* Code language */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.lang}
            <HelpTip text={t.tipCodeLang} />
          </label>

          <select className="ccg-select" value={codeLang} onChange={(e) => setCodeLang(e.target.value)}>
            <option value="bash">bash</option>
            <option value="python">python</option>
            <option value="powershell">powershell</option>
            <option value="cmd">cmd</option>
            <option value="yaml">yaml</option>
            <option value="json">json</option>
          </select>
        </div>

        {/* Editors side-by-side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.codeA}</div>
            <textarea
              className="ccg-textarea"
              dir="ltr"
              style={{ minHeight: 190, resize: "vertical" }}
              value={swapAB ? codeB : codeA}
              onChange={(e) => {
                if (swapAB) setCodeB(e.target.value);
                else setCodeA(e.target.value);
              }}
              placeholder={codeLang === "python" ? "# code A (python)" : "# code A"}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.codeB}</div>
            <textarea
              className="ccg-textarea"
              dir="ltr"
              style={{ minHeight: 190, resize: "vertical" }}
              value={swapAB ? codeA : codeB}
              onChange={(e) => {
                if (swapAB) setCodeA(e.target.value);
                else setCodeB(e.target.value);
              }}
              placeholder={codeLang === "python" ? "# code B (python)" : "# code B"}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
          <button type="button" className="ccg-btn" onClick={() => setSwapAB((p) => !p)}>
            {t.swapAB}
          </button>

          <button type="button" className="ccg-btn ccg-btn-primary" onClick={onRun} disabled={loading}>
            {loading ? (lang === "fa" ? "در حال پردازش..." : "Working...") : t.compareBtn}
          </button>
        </div>

        {apiError ? (
          <div className="ccg-error">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t.apiError}</div>
            <div style={{ opacity: 0.9 }}>{String(apiError)}</div>
          </div>
        ) : null}
      </div>
    );
  }

  /* =======================================================================================
    Render: Output Panel
  ======================================================================================= */

  function OutputPanel() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {/* Structured output (when backend sends it) */}
        {result?.command ? (
          <Card title={t.outCommand} right={<CopyBtn value={result.command} lang={lang} />}>
            <div className="ccg-codeblock">
              <div className="ccg-codeblock-head">
                <div className="ccg-codeblock-title">{scriptType === "python" ? "PYTHON" : "COMMAND"}</div>
                <CopyBtn value={result.command} lang={lang} />
              </div>
              <pre className="ccg-pre">
                <code dir="ltr">{String(result.command)}</code>
              </pre>
            </div>
          </Card>
        ) : null}

        {result?.explanation ? (
          <Card title={t.outExplanation}>
            <div className={lang === "fa" ? "rtl" : "ltr"} style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
              {String(result.explanation)}
            </div>
          </Card>
        ) : null}

        {alternatives?.length ? (
          <Card title={t.outAlternatives}>
            <div style={{ display: "grid", gap: 10 }}>
              {alternatives.map((item, idx) => (
                <div key={idx} className="ccg-codeblock">
                  <div className="ccg-codeblock-head">
                    <div className="ccg-codeblock-title">{lang === "fa" ? `گزینه ${idx + 1}` : `Option ${idx + 1}`}</div>
                    <CopyBtn value={String(item)} lang={lang} />
                  </div>
                  <pre className="ccg-pre">
                    <code dir="ltr">{String(item)}</code>
                  </pre>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {warnings?.length ? (
          <div className="ccg-error">
            <div style={{ fontWeight: 900, marginBottom: 8 }}>{t.outWarnings}</div>
            <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.9 }}>
              {warnings.map((w, idx) => (
                <li key={idx}>{String(w)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Markdown output always available */}
        <Card title={t.outMarkdown} right={<CopyBtn value={outputMarkdown || ""} lang={lang} />}>
          {outputMarkdown ? (
            <MarkdownBox markdown={outputMarkdown} lang={lang} />
          ) : (
            <div style={{ color: "var(--muted)" }}>{t.empty}</div>
          )}
        </Card>
      </div>
    );
  }

  /* =======================================================================================
    Error Analyzer Modal content
  ======================================================================================= */

  function ErrorAnalyzerBody() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="ccg-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900 }}>{t.analyze}</div>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>{t.tipAnalyzer}</div>
            </div>
            <button type="button" className="ccg-btn" onClick={() => setErrorText(apiError ? String(apiError) : "")}>
              {lang === "fa" ? "Paste API Error" : "Paste API Error"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
            {t.errorInput}
          </label>
          <textarea
            className="ccg-textarea"
            style={{ minHeight: 170, resize: "vertical" }}
            dir="ltr"
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder={t.placeholderErr}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="ccg-btn" onClick={() => setErrorText("")}>
            {lang === "fa" ? "پاک کردن" : "Clear"}
          </button>
          <button type="button" className="ccg-btn ccg-btn-primary" onClick={onAnalyzeError} disabled={errorLoading}>
            {errorLoading ? (lang === "fa" ? "در حال تحلیل..." : "Analyzing...") : t.analyze}
          </button>
        </div>

        {errorApiError ? (
          <div className="ccg-error">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>{t.apiError}</div>
            <div>{String(errorApiError)}</div>
          </div>
        ) : null}

        {errorResult ? (
          <div style={{ display: "grid", gap: 12 }}>
            {/* If backend returns structured fields, render them, else markdown */}
            {errorResult?.rootCause || errorResult?.fix ? (
              <>
                {errorResult?.rootCause ? (
                  <Card title={lang === "fa" ? "Root Cause" : "Root Cause"}>
                    <div className={lang === "fa" ? "rtl" : "ltr"} style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                      {String(errorResult.rootCause)}
                    </div>
                  </Card>
                ) : null}

                {errorResult?.fix ? (
                  <Card title={lang === "fa" ? "Fix" : "Fix"}>
                    <div className={lang === "fa" ? "rtl" : "ltr"} style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                      {String(errorResult.fix)}
                    </div>
                  </Card>
                ) : null}

                {errorResult?.verify ? (
                  <Card title={lang === "fa" ? "Verification Steps" : "Verification Steps"}>
                    <MarkdownBox markdown={String(errorResult.verify)} lang={lang} />
                  </Card>
                ) : null}
              </>
            ) : (
              <Card title={lang === "fa" ? "Analysis Output" : "Analysis Output"}>
                <MarkdownBox markdown={errorResult?.outputMarkdown || errorResult?.output || JSON.stringify(errorResult, null, 2)} lang={lang} />
              </Card>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  /* =======================================================================================
    Page Layout
  ======================================================================================= */

  return (
    <MainLayout>
      <div dir={gridDir} style={{ display: "grid", gap: 18 }}>
        {/* Top tabs */}
        <ViewTabs />

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          {/* Responsive split */}
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr",
            }}
          >
            {/* two columns on wide screens */}
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "1fr",
              }}
            >
              {/* we use CSS media using inline approach: keep simple, let MainLayout handle container width */}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          {/* ✅ Main grid: 2 columns on desktop */}
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr",
            }}
          >
            {/* Use a min-width trick: */}
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "1fr",
              }}
            />
          </div>

          {/* We do the actual responsive split with a simple CSS-like logic: */}
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr",
            }}
          >
            {/* Fallback for older browsers: */}
          </div>
        </div>

        {/* ✅ Actual responsive grid */}
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr",
            }}
          />
        </div>

        {/* ✅ Final layout (simple & reliable): */}
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          {/* Desktop split using minmax with inline style and media-ish via clamp: */}
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              alignItems: "start",
            }}
          >
            <Panel>
              <SectionTitle title={t.inputs} hint={t.headerHint} />
              {view === "generator" ? <GeneratorControls /> : <ComparatorControls />}
            </Panel>

            <Panel>
              <SectionTitle title={t.output} hint={t.headerHint} />
              <OutputPanel />
            </Panel>
          </div>
        </div>

        {/* Error Analyzer Modal */}
        <Modal
          open={errorModalOpen}
          title={t.openAnalyzer}
          onClose={() => setErrorModalOpen(false)}
          lang={lang}
        >
          <ErrorAnalyzerBody />
        </Modal>
      </div>
    </MainLayout>
  );
}

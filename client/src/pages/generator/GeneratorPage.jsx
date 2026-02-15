// /home/cando/CCG/client/src/pages/generator/GeneratorPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState, usePersistComplexState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import AdvancedSettings from "../../components/generator/AdvancedSettings";
import FeedbackButton from "../../components/ui/FeedbackButton";
import ToolResult from "../../components/ui/ToolResult";

const PLATFORMS = [
  { value: "linux", label: "Linux", icon: "🐧", shortLabel: { fa: "لینوکس", en: "Linux" } },
  { value: "windows", label: "Windows", icon: "🪟", shortLabel: { fa: "ویندوز", en: "Windows" } },
  { value: "mac", label: "macOS", icon: "🍎", shortLabel: { fa: "مک", en: "macOS" } },
  { value: "network", label: "Network", icon: "🌐", shortLabel: { fa: "شبکه", en: "Network" } },
  { value: "other", label: "Other OS", icon: "🔧", shortLabel: { fa: "سایر", en: "Other" } },
];

const SUPPORTED_OTHER_OS = [
  { value: "freebsd", label: "FreeBSD", icon: "🐡" },
  { value: "openbsd", label: "OpenBSD", icon: "🐡" },
  { value: "netbsd", label: "NetBSD", icon: "🐡" },
  { value: "solaris", label: "Solaris", icon: "☀️" },
  { value: "aix", label: "AIX", icon: "🖥️" },
  { value: "hpux", label: "HP-UX", icon: "💻" },
  { value: "zos", label: "z/OS", icon: "💾" },
  { value: "android", label: "Android", icon: "🤖" },
  { value: "ios", label: "iOS", icon: "📱" },
  { value: "chromeos", label: "ChromeOS", icon: "🌐" },
];

const NETWORK_VENDORS = [
  { value: "cisco", label: "Cisco" },
  { value: "mikrotik", label: "MikroTik" },
  { value: "juniper", label: "Juniper" },
  { value: "huawei", label: "Huawei" },
  { value: "fortinet", label: "Fortinet" },
  { value: "paloalto", label: "Palo Alto" },
  { value: "arista", label: "Arista" },
  { value: "ubiquiti", label: "Ubiquiti" },
  { value: "generic", label: "Generic" },
];

const NETWORK_DEVICE_TYPES = [
  { value: "router", label: "Router" },
  { value: "switch", label: "Switch" },
  { value: "firewall", label: "Firewall" },
  { value: "access_point", label: "Access Point" },
  { value: "load_balancer", label: "Load Balancer" },
];

function defaultCliForPlatform(platform) {
  if (platform === "windows") return "powershell";
  if (platform === "mac") return "zsh";
  if (platform === "network") return "network";
  return "bash";
}

function cliOptionsForPlatform(platform) {
  if (platform === "windows") return ["powershell", "pwsh", "cmd"];
  if (platform === "mac") return ["zsh", "bash"];
  if (platform === "network") return ["network"];
  if (platform === "other") return ["bash", "sh", "ksh", "tcsh", "zsh", "adb"];
  return ["bash", "zsh", "sh", "fish"];
}

function scriptCliForPlatform(platform) {
  if (platform === "windows") return "powershell";
  if (platform === "mac") return "zsh";
  if (platform === "network") return "network";
  return "bash";
}

/** --------- markdown helpers --------- */
function extractSection(md, titles) {
  const text = String(md || "");
  if (!text.trim()) return "";

  const lines = text.split("\n");
  const headingIdx = lines.findIndex((l) => {
    const t = l.trim().toLowerCase();
    return titles.some((x) => t === `### ${String(x).trim().toLowerCase()}`);
  });
  if (headingIdx === -1) return "";

  const out = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim().startsWith("### ")) break;
    out.push(l);
  }
  return out.join("\n").trim();
}

function stripCodeBlocks(md) {
  const text = String(md || "");
  return text.replace(/```[\s\S]*?```/g, "").trim();
}

function toBullets(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  return t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^[-*]\s+/, "").trim())
    .map((x) => x.replace(/^>\s?/, "").trim())
    .filter(Boolean);
}

function buildToolFromResponse(res, lang, cliGuess) {
  const md = String(res?.markdown || res?.output || res?.result || "").trim();

  const py = String(res?.pythonScript || "").trim();
  const isPython = Boolean(py);

  if (isPython) {
    const notesRaw = extractSection(md, ["Notes", "توضیحات"]) || stripCodeBlocks(md);
    return {
      title: lang === "fa" ? "نتیجه" : "Result",
      cli: "python",
      pythonScript: true,
      python_script: py,
      notes: toBullets(notesRaw),
      warnings: [],
      explanation: [],
      alternatives: [],
      primary_command: "",
    };
  }

  const primary =
    Array.isArray(res?.commands) && res.commands.length ? String(res.commands[0] || "").trim() : "";

  const alts = Array.isArray(res?.moreCommands)
    ? res.moreCommands.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

  const expRaw = extractSection(md, ["Explanation", "توضیح"]) || "";
  const warnRaw = extractSection(md, ["Warning", "Warnings", "هشدار", "هشدارها"]) || "";
  const notesRaw =
    extractSection(md, ["More Details", "توضیحات بیشتر", "📌 More Details", "📌 توضیحات بیشتر"]) || "";

  const explanation = toBullets(expRaw);
  const warnings = toBullets(warnRaw);
  const notes = toBullets(notesRaw);

  if (!explanation.length && expRaw.trim()) explanation.push(expRaw.trim());
  if (!warnings.length && warnRaw.trim()) warnings.push(warnRaw.trim());

  return {
    title: lang === "fa" ? "نتیجه" : "Result",
    cli: String(cliGuess || "bash").toLowerCase(),
    pythonScript: false,
    primary_command: primary,
    alternatives: alts,
    explanation,
    warnings,
    notes,
  };
}

/** ------------- Split Pane helpers ------------- */
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** --------- Client-side Precheck (anti token-waste) --------- */
const PRECHECK = {
  minChars: 8,
  minWords: 2,
};

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function countWords(s) {
  const t = normalizeSpaces(s);
  if (!t) return 0;
  return t.split(" ").filter(Boolean).length;
}

function isMostlyPunctOrEmoji(s) {
  const t = String(s || "").trim();
  if (!t) return true;
  // keep letters/digits from many languages
  const keep = t.replace(/[^\p{L}\p{N}]+/gu, "");
  return keep.length === 0;
}

function isRepeatedCharGibberish(s) {
  const t = normalizeSpaces(s);
  if (!t) return true;
  // detect long runs like "aaaaaa" or "؟؟؟؟؟؟" or "111111"
  const compact = t.replace(/\s+/g, "");
  if (compact.length < 8) return false;
  return /(.)\1{5,}/u.test(compact);
}

function buildClientInputError({ lang, code, message, hint, fields }) {
  return {
    code,
    message,
    hint,
    fields: fields || null,
    source: "client",
    lang,
  };
}

function precheckUserRequest(raw, lang) {
  const text = normalizeSpaces(raw);

  if (!text) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_EMPTY",
      message: lang === "fa" ? "⚠️ لطفا درخواست خود را وارد کنید" : "⚠️ Please enter your request",
      hint:
        lang === "fa"
          ? "مثال: «سیستم را ۱ ساعت دیگر ریستارت کن» یا «روی لینوکس سرویس nginx را ریستارت کن»"
          : "Example: “Restart the system in 1 hour” or “Restart nginx on Linux”",
    });
  }

  if (text.length < PRECHECK.minChars) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_TOO_SHORT",
      message: lang === "fa" ? "⚠️ درخواست خیلی کوتاه است" : "⚠️ Your request is too short",
      hint:
        lang === "fa"
          ? `حداقل ${PRECHECK.minWords} کلمه بنویس و هدف را مشخص کن. مثال: «سیستم را ۱ ساعت دیگر ریستارت کن».`
          : `Write at least ${PRECHECK.minWords} words and add context. Example: “Restart the system in 1 hour”.`,
      fields: { ...PRECHECK },
    });
  }

  const words = countWords(text);
  if (words < PRECHECK.minWords) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_MISSING_CONTEXT",
      message: lang === "fa" ? "⚠️ درخواست ناقص است" : "⚠️ Request needs more context",
      hint:
        lang === "fa"
          ? "فقط یک کلمه کافی نیست. بگو روی چه سیستمی، چه کاری و با چه شرطی. مثال: «روی ویندوز سیستم را همین الان ریستارت کن»."
          : "One word isn’t enough. Specify platform, action, and condition. Example: “Restart Windows now.”",
      fields: { ...PRECHECK },
    });
  }

  if (isMostlyPunctOrEmoji(text)) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_GIBBERISH",
      message: lang === "fa" ? "⚠️ متن نامفهوم است" : "⚠️ The text looks unclear",
      hint:
        lang === "fa"
          ? "لطفاً با کلمات واضح بنویس: چه کاری انجام شود؟ روی کدام سیستم؟"
          : "Please write a clear request: what action, on which system?",
    });
  }

  if (isRepeatedCharGibberish(text)) {
    return buildClientInputError({
      lang,
      code: "INVALID_INPUT_GIBBERISH",
      message: lang === "fa" ? "⚠️ متن شبیه ورودی نامعتبر است" : "⚠️ Input seems invalid",
      hint:
        lang === "fa"
          ? "به‌نظر می‌رسد متن شامل تکرار زیاد کاراکترهاست. لطفاً درخواست را واضح‌تر بنویس."
          : "It looks like repeated characters. Please write a clearer request.",
    });
  }

  return null;
}

function formatApiErrorForUI(err, lang) {
  // err from aiService includes: name, message, status, data
  const isAbort = err?.name === "AbortError" || /aborted|abort/i.test(String(err?.message || ""));
  if (isAbort) {
    return {
      code: "REQUEST_ABORTED",
      message: lang === "fa" ? "⛔ تولید لغو شد" : "⛔ Generation cancelled",
      hint: lang === "fa" ? "اگر لازم بود، دوباره تلاش کن." : "You can try again anytime.",
      source: "client",
      status: 0,
    };
  }

  const status = Number(err?.status || err?.response?.status || 0) || 0;
  const data = err?.data;

  // If backend returns structured error
  const apiErr = data && typeof data === "object" ? data.error || data.err || null : null;
  if (apiErr && typeof apiErr === "object") {
    return {
      code: String(apiErr.code || "API_ERROR"),
      message: String(apiErr.userMessage || apiErr.message || err?.message || "Error"),
      hint: String(apiErr.hint || ""),
      fields: apiErr.fields || null,
      source: "api",
      status,
    };
  }

  // Common status mapping
  if (status === 400) {
    return {
      code: "BAD_REQUEST",
      message: lang === "fa" ? "⚠️ درخواست نامعتبر است" : "⚠️ Invalid request",
      hint:
        lang === "fa"
          ? "لطفاً درخواست را واضح‌تر بنویس و جزئیات لازم را اضافه کن."
          : "Please rewrite with clearer details.",
      source: "api",
      status,
    };
  }

  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: lang === "fa" ? "⏳ تعداد درخواست‌ها زیاد است" : "⏳ Too many requests",
      hint:
        lang === "fa"
          ? "کمی صبر کن و دوباره تلاش کن. (بعداً اینجا پیشنهاد ارتقا پلن هم می‌آید.)"
          : "Please wait and try again. (Upgrade CTA can be added here later.)",
      source: "api",
      status,
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "FORBIDDEN",
      message: lang === "fa" ? "🚫 دسترسی غیرمجاز" : "🚫 Access denied",
      hint: lang === "fa" ? "اگر وارد حساب هستی، دوباره تلاش کن." : "If you’re signed in, try again.",
      source: "api",
      status,
    };
  }

  return {
    code: "SERVER_ERROR",
    message: err?.message || (lang === "fa" ? "❌ خطا در ارتباط با سرور" : "❌ Server connection error"),
    hint:
      lang === "fa"
        ? "اگر مشکل ادامه داشت، صفحه را رفرش کن یا چند دقیقه بعد دوباره تلاش کن."
        : "If it persists, refresh the page and try again in a minute.",
    source: "api",
    status,
  };
}

export default function GeneratorPage() {
  const { lang } = useLanguage();

  const [platform, setPlatform] = usePersistState("platform", "linux");
  const [otherOS, setOtherOS] = usePersistState("other_os", "freebsd");

  const [netVendor, setNetVendor] = usePersistState("network_vendor", "cisco");
  const [deviceType, setDeviceType] = usePersistState("network_device_type", "router");

  const [outputMode, setOutputMode] = usePersistState("generator_output_mode", "command");
  const [cli, setCli] = usePersistState("generator_cli", defaultCliForPlatform(platform));

  const [moreDetails, setMoreDetails] = usePersistState("generator_more_details", false);
  const [moreCommands, setMoreCommands] = usePersistState("generator_more_commands", false);

  const [input, setInput] = usePersistState("input", "");
  const [output, setOutput] = useState("");
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ error is now an object (but backward compatible)
  const [error, setError] = useState(null);

  const [showAdvanced, setShowAdvanced] = usePersistState("show_advanced", false);
  const [advancedEnabled, setAdvancedEnabled] = usePersistState("advanced_enabled", false);
  const [advancedSettings, setAdvancedSettings] = usePersistComplexState("advanced_settings", {});

  const finalPlatform = platform === "other" ? `other:${otherOS}` : platform;
  const cliOptions = useMemo(() => cliOptionsForPlatform(platform), [platform]);

  const [splitPct, setSplitPct] = usePersistState("generator_split_pct", 50);
  const splitWrapRef = useRef(null);
  const draggingRef = useRef(false);

  const abortRef = useRef(null);

  useEffect(() => {
    const allowed = new Set(cliOptions.map((x) => String(x).toLowerCase()));
    const cur = String(cli || "").toLowerCase();
    if (!allowed.has(cur)) setCli(defaultCliForPlatform(platform));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  useEffect(() => {
    if (outputMode !== "command") {
      if (moreCommands) setMoreCommands(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputMode]);

  const getPlatformColor = (plat) => {
    const colors = {
      linux: "from-orange-500 to-red-500",
      windows: "from-blue-500 to-cyan-500",
      mac: "from-gray-400 to-gray-600",
      network: "from-green-500 to-emerald-600",
      other: "from-purple-500 to-pink-500",
    };
    return colors[plat] || "from-blue-500 to-purple-600";
  };

  const compactAdvanced = (obj) => {
    const o = obj && typeof obj === "object" ? obj : {};
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && !v.trim()) continue;
      out[k] = v;
    }
    return Object.keys(out).length ? out : null;
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setTool(null);
    setError(null);
  };

  function computeCliForPayload({ platform, outputMode, cli }) {
    if (outputMode === "python") return "python";
    if (outputMode === "script") return scriptCliForPlatform(platform);
    return String(cli || defaultCliForPlatform(platform)).toLowerCase();
  }

  function pickNetworkOsType(s) {
    const o = s && typeof s === "object" ? s : {};
    return String(o.os_type || o.osType || "").trim();
  }
  function pickNetworkOsVersion(s) {
    const o = s && typeof s === "object" ? s : {};
    return String(o.os_version || o.osVersion || "").trim();
  }

  async function generate() {
    // ✅ Precheck (no token waste)
    const preErr = precheckUserRequest(input, lang);
    if (preErr) {
      setError(preErr);
      return;
    }

    // cancel in-flight
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const baseCli = computeCliForPayload({ platform, outputMode, cli });

    const netOsType = platform === "network" ? pickNetworkOsType(advancedSettings) : "";
    const netOsVersion = platform === "network" ? pickNetworkOsVersion(advancedSettings) : "";

    const payload = {
      mode: "generate",
      modeStyle: "generator",
      lang,
      platform: finalPlatform,
      cli: baseCli,

      moreDetails: Boolean(moreDetails),
      moreCommands: outputMode === "command" ? Boolean(moreCommands) : false,

      pythonScript: outputMode === "python",

      vendor: platform === "network" ? netVendor : undefined,
      deviceType: platform === "network" ? deviceType : undefined,

      os_type: platform === "network" && netOsType ? netOsType : undefined,
      os_version: platform === "network" && netOsVersion ? netOsVersion : undefined,
      osType: platform === "network" && netOsType ? netOsType : undefined,
      osVersion: platform === "network" && netOsVersion ? netOsVersion : undefined,

      advancedEnabled: Boolean(advancedEnabled),
      advanced: advancedEnabled ? compactAdvanced(advancedSettings) : undefined,

      user_request: normalizeSpaces(input),
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await callCCG(payload, { signal: controller.signal });

      const markdown = String(result?.markdown || result?.output || result?.result || "").trim();
      setOutput(markdown);

      const built = buildToolFromResponse(result, lang, payload.cli);
      setTool(built);
    } catch (err) {
      setError(formatApiErrorForUI(err, lang));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  function cancelGenerate() {
    if (!abortRef.current) return;
    try {
      abortRef.current.abort();
    } catch {
      // ignore
    }
  }

  const outputModes = useMemo(() => {
    return [
      {
        value: "command",
        label: lang === "fa" ? "کامند" : "Command",
        sub: lang === "fa" ? "دستور کوتاه و مستقیم" : "Direct command output",
        icon: "⌨️",
      },
      {
        value: "script",
        label: lang === "fa" ? "اسکریپت سیستم‌عامل" : "OS Script",
        sub: lang === "fa" ? "بر اساس پلتفرم انتخابی" : "Matches selected platform",
        icon: "📄",
      },
      {
        value: "python",
        label: lang === "fa" ? "پایتون" : "Python",
        sub: lang === "fa" ? "اتوماسیون با Python" : "Automation with Python",
        icon: "🐍",
      },
    ];
  }, [lang]);

  const onSetOutputMode = (mode) => {
    const next = String(mode || "command");
    setOutputMode(next);
  };

  const startDrag = (clientX) => {
    const wrap = splitWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const pct = clamp((x / rect.width) * 100, 24, 76);
    setSplitPct(Math.round(pct));
  };

  const onMouseDownResizer = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.classList.add("ccg-noselect");
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      startDrag(e.clientX);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.classList.remove("ccg-noselect");
    };

    const onTouchMove = (e) => {
      if (!draggingRef.current) return;
      const t = e.touches?.[0];
      if (!t) return;
      startDrag(t.clientX);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitPct]);

  const renderPlatformButtons = () => (
    <div className="grid grid-cols-5 gap-2 mb-3">
      {PLATFORMS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPlatform(p.value)}
          className={`
            flex flex-col items-center p-2 rounded-xl transition-all
            ${
              platform === p.value
                ? `bg-gradient-to-b ${getPlatformColor(p.value)} text-white shadow`
                : "bg-gray-100 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200/70 dark:border-white/10"
            }
          `}
          title={p.label}
          type="button"
        >
          <span className="text-lg">{p.icon}</span>
          <span className="text-xs mt-1">
            {typeof p.shortLabel === "object" ? p.shortLabel[lang] || p.shortLabel.en : p.shortLabel}
          </span>
        </button>
      ))}
    </div>
  );

  const dirClass = lang === "fa" ? "rtl" : "ltr";

  const panelClass =
    "ccg-card ccg-glass p-4 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10";
  const subCardClass =
    "ccg-card ccg-glass-soft p-3 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-sm";
  const knobBase =
    "ccg-card ccg-glass-soft p-3 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-sm text-left transition";
  const knobActive = "ccg-knob-active ring-2 ring-blue-500/20 dark:ring-blue-400/20";

  // ✅ normalize error for display (string or object)
  const errObj =
    error && typeof error === "object"
      ? error
      : error
      ? { code: "ERROR", message: String(error), hint: "", source: "client" }
      : null;

  return (
    <div className={`space-y-4 md:space-y-6 ${dirClass}`}>
      <div className="ccg-container">
        <FeedbackButton />
      </div>

      <div className="ccg-container">
        <div className={panelClass}>
          <h2 className="font-bold text-base mb-3">{lang === "fa" ? "🎯 پلتفرم هدف" : "🎯 Target Platform"}</h2>

          {renderPlatformButtons()}

          {platform === "other" && (
            <div className="mt-3 p-3 rounded-2xl ccg-glass-soft border border-gray-200/60 dark:border-white/10">
              <div className="text-sm font-medium mb-2">{lang === "fa" ? "🔧 انتخاب سیستم عامل" : "🔧 Select OS"}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {SUPPORTED_OTHER_OS.map((os) => (
                  <button
                    key={os.value}
                    onClick={() => setOtherOS(os.value)}
                    className={`
                      flex flex-col items-center p-2 rounded-xl transition text-center
                      ${
                        otherOS === os.value
                          ? "bg-gradient-to-b from-purple-500 to-pink-500 text-white shadow"
                          : "ccg-glass-soft border border-gray-200/60 dark:border-white/10 hover:opacity-90"
                      }
                    `}
                    title={os.label}
                    type="button"
                  >
                    <span className="text-lg mb-1">{os.icon}</span>
                    <span className="text-xs">{os.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="text-xs font-medium mb-2">{lang === "fa" ? "🧭 نوع خروجی" : "🧭 Output Mode"}</div>

            <div className="ccg-seg">
              {outputModes.map((m) => {
                const active = outputMode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => onSetOutputMode(m.value)}
                    className={`ccg-seg-item ${active ? "is-active" : ""}`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <span className="font-semibold text-sm">{m.label}</span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">{m.sub}</div>
                  </button>
                );
              })}
              <div
                className="ccg-seg-indicator"
                style={{
                  width: "calc((100% - 8px) / 3)",
                  transform:
                    lang === "fa"
                      ? outputMode === "command"
                        ? "translateX(200%)"
                        : outputMode === "script"
                        ? "translateX(100%)"
                        : "translateX(0%)"
                      : outputMode === "command"
                      ? "translateX(0%)"
                      : outputMode === "script"
                      ? "translateX(100%)"
                      : "translateX(200%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={subCardClass}>
              <div className="text-xs font-semibold mb-2">{lang === "fa" ? "Shell / CLI" : "Shell / CLI"}</div>
              <select
                value={cli}
                onChange={(e) => setCli(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black/30 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                disabled={outputMode !== "command"}
              >
                {cliOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                {outputMode === "command"
                  ? lang === "fa"
                    ? "این انتخاب روی نوع دستور اثر می‌گذارد."
                    : "This affects command style."
                  : outputMode === "script"
                  ? lang === "fa"
                    ? "در حالت OS Script، سیستم خودش زبان مناسب را انتخاب می‌کند."
                    : "In OS Script mode, we pick the best script language."
                  : lang === "fa"
                  ? "در حالت پایتون، CLI بی‌اثر است."
                  : "CLI is disabled in Python mode."}
              </div>
            </div>

            {platform === "network" && (
              <div className={subCardClass}>
                <div className="text-xs font-semibold mb-2">{lang === "fa" ? "تنظیمات دیفالت شبکه" : "Network Defaults"}</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] opacity-80 mb-1">{lang === "fa" ? "Vendor" : "Vendor"}</div>
                    <select
                      value={netVendor}
                      onChange={(e) => setNetVendor(e.target.value)}
                      className="w-full p-2.5 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black/30 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      disabled={loading}
                    >
                      {NETWORK_VENDORS.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-[11px] opacity-80 mb-1">{lang === "fa" ? "Device Type" : "Device Type"}</div>
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value)}
                      className="w-full p-2.5 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black/30 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      disabled={loading}
                    >
                      {NETWORK_DEVICE_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  {lang === "fa"
                    ? "Vendor و Device Type روی OS Type/Version در تنظیمات تخصصی اثر می‌گذارند."
                    : "Vendor/Device Type also drive OS Type/Version in advanced settings."}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (outputMode !== "command") return;
                setMoreCommands((v) => !v);
              }}
              className={`${knobBase} ${moreCommands ? knobActive : "hover:opacity-95"} ${
                outputMode !== "command" ? "opacity-40 cursor-not-allowed" : ""
              }`}
              disabled={loading || outputMode !== "command"}
              title={outputMode !== "command" ? (lang === "fa" ? "فقط در حالت کامند فعال است" : "Only in Command mode") : ""}
            >
              <div className="text-sm font-semibold">{lang === "fa" ? "کامندهای بیشتر" : "More commands"}</div>
              <div className="text-xs opacity-80">{lang === "fa" ? "جایگزین‌های بیشتری پیشنهاد می‌شود." : "More alternatives will be suggested."}</div>
            </button>

            <button
              type="button"
              onClick={() => setMoreDetails((v) => !v)}
              className={`${knobBase} ${moreDetails ? knobActive : "hover:opacity-95"}`}
              disabled={loading}
              title={lang === "fa" ? "در همه حالت‌ها قابل استفاده است" : "Available in all modes"}
            >
              <div className="text-sm font-semibold">{lang === "fa" ? "توضیحات بیشتر" : "More details"}</div>
              <div className="text-xs opacity-80">{lang === "fa" ? "توضیحات و هشدارها مفصل‌تر می‌شوند." : "Explanation and warnings become more detailed."}</div>
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-gray-200/70 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] text-gray-700 dark:text-gray-300">
              {lang === "fa"
                ? "تولید فقط با دکمه «تولید خروجی» انجام می‌شود (تغییر گزینه‌ها تولید خودکار ندارد)."
                : "Generation happens only via the Generate button (changing options won’t auto-generate)."}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced toggle */}
      <div className="ccg-container">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full ccg-card ccg-glass p-3 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10 hover:opacity-95 transition"
          type="button"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  showAdvanced ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span className="text-white text-sm">⚙️</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-left">{lang === "fa" ? "تنظیمات تخصصی" : "Advanced Settings"}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 text-left">
                  {lang === "fa" ? "فقط در صورت فعال‌سازی اعمال می‌شود" : "Applied only when enabled"}
                </div>
              </div>
            </div>
            <span className="text-sm">{showAdvanced ? "▲" : "▼"}</span>
          </div>
        </button>

        {showAdvanced && (
          <div className="mt-3 animate-fadeIn">
            <div className="ccg-card ccg-glass p-4 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{lang === "fa" ? "فعال‌سازی تنظیمات تخصصی" : "Enable advanced settings"}</div>
                <button
                  type="button"
                  onClick={() => setAdvancedEnabled(!advancedEnabled)}
                  className={`px-3 py-1 rounded-xl text-sm transition ${
                    advancedEnabled ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {advancedEnabled ? (lang === "fa" ? "فعال ✅" : "Enabled ✅") : lang === "fa" ? "غیرفعال" : "Disabled"}
                </button>
              </div>

              <AdvancedSettings
                platform={platform === "other" ? "other" : platform}
                settings={advancedSettings}
                onChange={setAdvancedSettings}
                networkVendor={platform === "network" ? netVendor : undefined}
                networkDeviceType={platform === "network" ? deviceType : undefined}
              />

              <div className="text-xs text-gray-600 dark:text-gray-300">
                {lang === "fa"
                  ? "اگر فعال نباشد، این تنظیمات وارد payload نمی‌شود."
                  : "If not enabled, advanced settings are not included in payload."}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Split pane */}
      <div className="ccg-container">
        <div ref={splitWrapRef} className={`ccg-split ${lang === "fa" ? "is-rtl" : "is-ltr"}`} style={{ "--split": `${splitPct}%` }}>
          {/* Input */}
          <div className="ccg-card ccg-glass p-4 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">{lang === "fa" ? "📝 درخواست شما" : "📝 Your Request"}</h2>
              <button
                onClick={clearAll}
                className="px-2 py-1 text-xs bg-gray-100/70 dark:bg-black/30 rounded-xl hover:opacity-90 transition border border-gray-200/60 dark:border-white/10"
                type="button"
              >
                🗑️ {lang === "fa" ? "پاک کردن" : "Clear"}
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "fa" ? "مثال: میخوام سیستمم ۱ ساعت دیگه خاموش بشه" : "Example: Shutdown the system in 1 hour"}
              className="w-full h-44 p-3 text-sm border border-gray-300/70 dark:border-white/10 rounded-xl resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white/70 dark:bg-black/30"
              rows={4}
            />

            {/* ✅ Better error UI */}
            {errObj && (
              <div className="mt-3 rounded-xl border border-rose-200/70 bg-rose-50/80 p-3 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-200 animate-fadeIn">
                <div className="text-xs font-semibold">
                  {errObj.message}
                  {errObj.code ? <span className="ml-2 opacity-70">({errObj.code})</span> : null}
                </div>
                {errObj.hint ? <div className="mt-1 text-xs opacity-95">💡 {errObj.hint}</div> : null}
              </div>
            )}

            <button
              onClick={loading ? cancelGenerate : generate}
              disabled={!loading && !String(input || "").trim()}
              className={`
                mt-4 w-full py-3 rounded-2xl font-semibold text-sm transition
                ${
                  loading
                    ? "bg-rose-600 text-white hover:opacity-90"
                    : !String(input || "").trim()
                    ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    : `bg-gradient-to-r ${getPlatformColor(platform)} text-white hover:opacity-90`
                }
              `}
              type="button"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{lang === "fa" ? "لغو تولید" : "Cancel"}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base">🚀</span>
                  <span>{lang === "fa" ? "تولید خروجی" : "Generate"}</span>
                </div>
              )}
            </button>

            {loading ? (
              <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                {lang === "fa" ? "برای لغو، دوباره روی دکمه کلیک کنید." : "Click again to cancel the request."}
              </div>
            ) : null}
          </div>

          {/* Resizer */}
          <div
            className="ccg-resizer"
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            onMouseDown={onMouseDownResizer}
            onTouchStart={() => {
              draggingRef.current = true;
              document.body.classList.add("ccg-noselect");
            }}
            title={lang === "fa" ? "کشیدن برای تغییر اندازه" : "Drag to resize"}
          >
            <div className="ccg-resizer-handle" />
          </div>

          {/* Output */}
          <div className="ccg-card ccg-glass p-4 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">{lang === "fa" ? "✨ نتیجه" : "✨ Result"}</h2>
            </div>

            {tool ? (
              <ToolResult tool={tool} lang={lang} />
            ) : output ? (
              <CodeBlock code={output} language="markdown" showCopy={true} maxHeight="520px" />
            ) : (
              <div className="text-center py-10 text-gray-600 dark:text-gray-300">
                <div className="text-3xl mb-2">✨</div>
                <div className="text-sm mb-1">{lang === "fa" ? "آماده برای تولید!" : "Ready!"}</div>
                <div className="text-xs">{lang === "fa" ? "درخواست خود را بنویسید و تولید را بزنید" : "Write a request and click Generate"}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persist info */}
      <div className="ccg-container">
        <div className="ccg-card ccg-glass-soft p-3 rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-sm">
          <div className="text-xs text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              {lang === "fa"
                ? "وضعیت شما ذخیره شد. بعد از ریفرش تنظیمات حفظ می‌شوند."
                : "Your status is saved. Settings persist after refresh."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

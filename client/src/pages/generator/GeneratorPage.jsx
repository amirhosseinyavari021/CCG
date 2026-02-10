import { useState, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState, usePersistComplexState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import AdvancedSettings from "../../components/generator/AdvancedSettings";
import FeedbackButton from "../../components/ui/FeedbackButton";

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

function ToolCards({ tool, lang }) {
  if (!tool) return null;

  const title = tool.title || (lang === "fa" ? "خروجی" : "Output");
  const primary = tool.primary?.command || "";
  const primaryLabel = tool.primary?.label || (lang === "fa" ? "دستور اصلی" : "Primary");
  const alternatives = Array.isArray(tool.alternatives) ? tool.alternatives : [];
  const explanation = Array.isArray(tool.explanation) ? tool.explanation : [];
  const warnings = Array.isArray(tool.warnings) ? tool.warnings : [];
  const codeLang = tool.lang || "bash";

  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt || "");
    } catch {}
  };

  return (
    <div className="space-y-3">
      <div className="ccg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="font-bold text-sm">{title}</div>
          <button
            onClick={() => copy(primary)}
            className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 transition"
            type="button"
            title="Copy primary"
          >
            {lang === "fa" ? "کپی دستور ✅" : "Copy ✅"}
          </button>
        </div>
        <div className="text-xs opacity-70 mb-2">{primaryLabel}</div>
        <CodeBlock code={primary} language={codeLang} showCopy={false} maxHeight="180px" />
      </div>

      {alternatives.length > 0 && (
        <div className="ccg-card p-4">
          <div className="font-bold text-sm mb-3">{lang === "fa" ? "جایگزین‌ها" : "Alternatives"}</div>
          <div className="space-y-2">
            {alternatives.map((a, idx) => {
              const cmd = a?.command || "";
              return (
                <div key={idx} className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
                    <div className="text-xs opacity-80">{(a?.label || "ALT").toString()}</div>
                    <button
                      onClick={() => copy(cmd)}
                      className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 transition"
                      type="button"
                      title="Copy"
                    >
                      {lang === "fa" ? "کپی" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 overflow-auto text-sm leading-6"><code>{cmd}</code></pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {explanation.length > 0 && (
        <div className="ccg-card p-4">
          <div className="font-bold text-sm mb-2">{lang === "fa" ? "توضیحات" : "Explanation"}</div>
          <ul className="text-sm leading-7 list-disc pr-5 space-y-1">
            {explanation.map((x, i) => <li key={i}>{String(x)}</li>)}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="ccg-card p-4 border border-red-500/30 bg-red-900/10">
          <div className="font-bold text-sm mb-2 text-red-300">{lang === "fa" ? "هشدارها" : "Warnings"}</div>
          <ul className="text-sm leading-7 list-disc pr-5 space-y-1 text-red-100/90">
            {warnings.map((x, i) => <li key={i}>{String(x)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function GeneratorPage() {
  const { lang } = useLanguage();

  const [platform, setPlatform] = usePersistState("platform", "linux");
  const [otherOS, setOtherOS] = usePersistState("other_os", "freebsd");
  const [deviceType, setDeviceType] = usePersistState("network_device_type", "router");

  // General: shell always visible
  const [cli, setCli] = usePersistState("generator_cli", defaultCliForPlatform(platform));

  // Output toggles (generator knobs)
  const [moreDetails, setMoreDetails] = usePersistState("generator_more_details", false);
  const [moreCommands, setMoreCommands] = usePersistState("generator_more_commands", false);
  const [pythonScript, setPythonScript] = usePersistState("generator_python_script", false);

  const [input, setInput] = usePersistState("input", "");
  const [output, setOutput] = useState("");
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Advanced
  const [showAdvanced, setShowAdvanced] = usePersistState("show_advanced", false);
  const [advancedEnabled, setAdvancedEnabled] = usePersistState("advanced_enabled", false);
  const [advancedSettings, setAdvancedSettings] = usePersistComplexState("advanced_settings", {});

  const finalPlatform = platform === "other" ? `other:${otherOS}` : platform;

  const cliOptions = useMemo(() => cliOptionsForPlatform(platform), [platform]);

  // keep cli valid when platform changes
  useMemo(() => {
    const allowed = new Set(cliOptions);
    if (!allowed.has(String(cli).toLowerCase())) {
      setCli(defaultCliForPlatform(platform));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

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

  const clearAll = () => {
    setInput("");
    setOutput("");
    setTool(null);
    setError("");
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

  const generate = async () => {
    if (!input.trim()) {
      setError(lang === "fa" ? "⚠️ لطفا درخواست خود را وارد کنید" : "⚠️ Please enter your request");
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");
    setTool(null);

    try {
      const payload = {
        mode: "generate",
        modeStyle: "generator",
        lang,
        platform: finalPlatform,
        cli: pythonScript ? "python" : String(cli || defaultCliForPlatform(platform)).toLowerCase(),

        // generator knobs
        moreDetails: Boolean(moreDetails),
        moreCommands: Boolean(moreCommands),
        pythonScript: Boolean(pythonScript),

        // network general
        deviceType: platform === "network" ? deviceType : undefined,

        // Advanced only if enabled
        advancedEnabled: Boolean(advancedEnabled),
        advanced: advancedEnabled ? compactAdvanced(advancedSettings) : undefined,

        user_request: input.trim(),
        timestamp: new Date().toISOString(),
      };

      const result = await callCCG(payload);

      setTool(result?.tool || null);
      setOutput(result?.markdown || result?.output || result?.result || "");
    } catch (err) {
      setError(err?.message || (lang === "fa" ? "❌ خطا در ارتباط با سرور" : "❌ Server connection error"));
    } finally {
      setLoading(false);
    }
  };

  const renderPlatformButtons = () => (
    <div className="grid grid-cols-5 gap-2 mb-3">
      {PLATFORMS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPlatform(p.value)}
          className={`
            flex flex-col items-center p-2 rounded-lg transition-all
            ${platform === p.value
              ? `bg-gradient-to-b ${getPlatformColor(p.value)} text-white shadow`
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"}
          `}
          title={p.label}
        >
          <span className="text-lg">{p.icon}</span>
          <span className="text-xs mt-1">
            {typeof p.shortLabel === "object" ? (p.shortLabel[lang] || p.shortLabel.en) : p.shortLabel}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="ccg-container">
        <FeedbackButton />
      </div>

      {/* Platform */}
      <div className="ccg-container">
        <div className="ccg-card p-4">
          <h2 className="font-bold text-base mb-3">
            {lang === "fa" ? "🎯 پلتفرم هدف" : "🎯 Target Platform"}
          </h2>

          {renderPlatformButtons()}

          {/* Other OS selector */}
          {platform === "other" && (
            <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg">
              <div className="text-sm font-medium mb-2">
                {lang === "fa" ? "🔧 انتخاب سیستم عامل" : "🔧 Select OS"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {SUPPORTED_OTHER_OS.map((os) => (
                  <button
                    key={os.value}
                    onClick={() => setOtherOS(os.value)}
                    className={`
                      flex flex-col items-center p-2 rounded transition text-center
                      ${otherOS === os.value
                        ? "bg-gradient-to-b from-purple-500 to-pink-500 text-white shadow"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"}
                    `}
                    title={os.label}
                  >
                    <span className="text-lg mb-1">{os.icon}</span>
                    <span className="text-xs">{os.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* General settings row */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Shell/CLI always visible */}
            <div className="ccg-card p-3">
              <div className="text-xs font-medium mb-2">{lang === "fa" ? "Shell / CLI" : "Shell / CLI"}</div>
              <select
                value={cli}
                onChange={(e) => setCli(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {cliOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {lang === "fa" ? "این انتخاب روی نوع دستور اثر می‌گذارد." : "This affects command style."}
              </div>
            </div>

            {/* Network device type in General */}
            {platform === "network" && (
              <div className="ccg-card p-3">
                <div className="text-xs font-medium mb-2">{lang === "fa" ? "نوع دستگاه شبکه" : "Network Device Type"}</div>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {NETWORK_DEVICE_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Output knobs */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPythonScript(!pythonScript)}
              className={`ccg-card p-3 text-left transition ${
                pythonScript ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="text-sm font-medium">{lang === "fa" ? "اسکریپت پایتون" : "Python Script"}</div>
              <div className="text-xs opacity-80">{lang === "fa" ? "به جای CLI، اسکریپت Python تولید شود." : "Generate a Python script instead of CLI."}</div>
            </button>

            <button
              type="button"
              onClick={() => setMoreCommands(!moreCommands)}
              className={`ccg-card p-3 text-left transition ${
                moreCommands ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="text-sm font-medium">{lang === "fa" ? "کامندهای بیشتر" : "More commands"}</div>
              <div className="text-xs opacity-80">{lang === "fa" ? "جایگزین‌های بیشتری پیشنهاد می‌شود." : "More alternatives will be suggested."}</div>
            </button>

            <button
              type="button"
              onClick={() => setMoreDetails(!moreDetails)}
              className={`ccg-card p-3 text-left transition ${
                moreDetails ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="text-sm font-medium">{lang === "fa" ? "توضیح بیشتر" : "More details"}</div>
              <div className="text-xs opacity-80">{lang === "fa" ? "توضیحات و هشدارها مفصل‌تر می‌شوند." : "Explanation and warnings become more detailed."}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced toggle */}
      <div className="ccg-container">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full ccg-card p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          type="button"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${showAdvanced ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                <span className="text-white text-sm">⚙️</span>
              </div>
              <div>
                <div className="text-sm font-medium text-left">
                  {lang === "fa" ? "تنظیمات تخصصی" : "Advanced Settings"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                  {lang === "fa" ? "فقط در صورت فعال‌سازی اعمال می‌شود" : "Applied only when enabled"}
                </div>
              </div>
            </div>
            <span className="text-sm">{showAdvanced ? "▲" : "▼"}</span>
          </div>
        </button>

        {showAdvanced && (
          <div className="mt-3 animate-fadeIn">
            <div className="ccg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{lang === "fa" ? "فعال‌سازی تنظیمات تخصصی" : "Enable advanced settings"}</div>
                <button
                  type="button"
                  onClick={() => setAdvancedEnabled(!advancedEnabled)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    advancedEnabled ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {advancedEnabled ? (lang === "fa" ? "فعال ✅" : "Enabled ✅") : (lang === "fa" ? "غیرفعال" : "Disabled")}
                </button>
              </div>

              <AdvancedSettings
                platform={platform === "other" ? "other" : platform}
                settings={advancedSettings}
                onChange={setAdvancedSettings}
              />

              <div className="text-xs text-gray-500 dark:text-gray-400">
                {lang === "fa"
                  ? "اگر فعال نباشد، این تنظیمات وارد payload نمی‌شود."
                  : "If not enabled, advanced settings are not included in payload."}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Input */}
          <div className="ccg-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">{lang === "fa" ? "📝 درخواست شما" : "📝 Your Request"}</h2>
              <button
                onClick={clearAll}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                type="button"
              >
                🗑️ {lang === "fa" ? "پاک کردن" : "Clear"}
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "fa"
                ? "مثال: میخوام سیستمم ۱ ساعت دیگه خاموش بشه"
                : "Example: Shutdown the system in 1 hour"}
              className="w-full h-40 p-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-1 focus:ring-blue-500"
              rows={4}
            />

            {error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded animate-fadeIn">
                <div className="text-xs font-medium text-red-700 dark:text-red-300">{error}</div>
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading || !input.trim()}
              className={`
                mt-4 w-full py-3 rounded-lg font-medium text-sm transition
                ${loading || !input.trim()
                  ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                  : `bg-gradient-to-r ${getPlatformColor(platform)} text-white hover:opacity-90`}
              `}
              type="button"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{lang === "fa" ? "در حال تولید..." : "Generating..."}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base">🚀</span>
                  <span>{lang === "fa" ? "تولید خروجی" : "Generate"}</span>
                </div>
              )}
            </button>
          </div>

          {/* Output */}
          <div className="ccg-card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">{lang === "fa" ? "✨ نتیجه" : "✨ Result"}</h2>
            </div>

            {tool ? (
              <ToolCards tool={tool} lang={lang} />
            ) : output ? (
              // fallback: still show markdown if tool missing
              <CodeBlock code={output} language="markdown" showCopy={true} maxHeight="420px" />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-3xl mb-2">✨</div>
                <div className="text-sm mb-1">{lang === "fa" ? "آماده برای تولید!" : "Ready!"}</div>
                <div className="text-xs">
                  {lang === "fa" ? "درخواست خود را بنویسید و تولید را بزنید" : "Write a request and click Generate"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persist info */}
      <div className="ccg-container">
        <div className="ccg-card p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
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

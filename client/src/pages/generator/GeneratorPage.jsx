import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { usePersistState, usePersistComplexState } from "../../hooks/usePersistState";
import { callCCG } from "../../services/aiService";
import CodeBlock from "../../components/ui/CodeBlock";
import AdvancedSettings from "../../components/generator/AdvancedSettings";
import FeedbackButton from "../../components/ui/FeedbackButton";
import ToolResult from "../../components/ui/ToolResult";

/* ==============================
   CONSTANTS
============================== */

const PLATFORMS = [
  { value: "linux", label: "Linux", icon: "🐧" },
  { value: "windows", label: "Windows", icon: "🪟" },
  { value: "mac", label: "macOS", icon: "🍎" },
  { value: "network", label: "Network", icon: "🌐" },
  { value: "other", label: "Other OS", icon: "🔧" },
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
  return ["bash", "zsh", "sh", "fish"];
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

/* ==============================
   COMPONENT
============================== */

export default function GeneratorPage() {
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [platform, setPlatform] = usePersistState("platform", "linux");
  const [cli, setCli] = usePersistState("generator_cli", defaultCliForPlatform(platform));
  const [outputMode, setOutputMode] = usePersistState("generator_output_mode", "command");
  const [moreDetails, setMoreDetails] = usePersistState("generator_more_details", false);
  const [moreCommands, setMoreCommands] = usePersistState("generator_more_commands", false);

  const [input, setInput] = usePersistState("input", "");
  const [output, setOutput] = useState("");
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [advancedEnabled, setAdvancedEnabled] = usePersistState("advanced_enabled", false);
  const [advancedSettings, setAdvancedSettings] = usePersistComplexState("advanced_settings", {});

  const abortRef = useRef(null);
  const lastRequestRef = useRef(null);

  useEffect(() => {
    const allowed = new Set(cliOptionsForPlatform(platform));
    if (!allowed.has(cli)) {
      setCli(defaultCliForPlatform(platform));
    }
  }, [platform]);

  function computeCli() {
    if (outputMode === "python") return "python";
    return cli || "bash";
  }

  function mapOutputType(mode) {
    if (mode === "python") return "python";
    if (mode === "command") return "command";
    return "tool";
  }

  async function generate() {
    if (!normalizeSpaces(input)) {
      setError(lang === "fa" ? "درخواست را وارد کن" : "Please enter a request");
      return;
    }

    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const normalizedInput = normalizeSpaces(input);

    const requestKey = JSON.stringify({
      normalizedInput,
      outputMode,
      platform,
      cli: computeCli(),
      advancedEnabled,
      advanced: advancedEnabled ? advancedSettings : {},
    });

    const sameBase = lastRequestRef.current?.requestKey === requestKey;

    const payload = {
      mode: "generate",
      modeStyle: "generator",
      lang,
      platform,
      cli: computeCli(),
      outputType: mapOutputType(outputMode),
      moreDetails: Boolean(moreDetails),
      moreCommands: Boolean(moreCommands),
      pythonScript: outputMode === "python",
      advancedEnabled,
      advanced: advancedEnabled ? advancedSettings : undefined,
      user_request: normalizedInput,
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await callCCG(payload, { signal: controller.signal });

      const markdown = String(result?.markdown || "").trim();
      setOutput(markdown);
      setTool(result?.tool || null);

      lastRequestRef.current = { requestKey };
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Server Error");
      setOutput("");
      setTool(null);
      lastRequestRef.current = null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  function cancelGenerate() {
    if (!abortRef.current) return;
    try { abortRef.current.abort(); } catch {}
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl text-right" : "ltr text-left"}`}>
      <FeedbackButton />

      <div className="ccg-card p-4 rounded-2xl space-y-4">

        {/* PLATFORM */}
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPlatform(p.value)}
              className={`px-3 py-2 rounded-xl text-sm ${
                platform === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* INPUT */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-40 p-3 rounded-xl border"
          placeholder={
            lang === "fa"
              ? "مثال: سیستم را ۱ ساعت دیگر خاموش کن"
              : "Example: Shutdown system in 1 hour"
          }
        />

        {/* BUTTON */}
        <button
          onClick={loading ? cancelGenerate : generate}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white"
        >
          {loading ? (lang === "fa" ? "لغو" : "Cancel") : (lang === "fa" ? "تولید" : "Generate")}
        </button>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {/* OUTPUT */}
        {tool ? (
          <ToolResult tool={tool} uiLang={lang} />
        ) : output ? (
          <CodeBlock code={output} language="markdown" />
        ) : null}

      </div>
    </div>
  );
}

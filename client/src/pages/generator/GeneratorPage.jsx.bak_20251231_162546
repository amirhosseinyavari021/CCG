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
      lang: lang || "fa",

      // important for backend
      user_request: input.trim(),

      // generator params
      outputType: outputType, // "command" or "python"
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
      const md = res?.markdown || res?.result || res?.output || "";
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
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

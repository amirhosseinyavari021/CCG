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

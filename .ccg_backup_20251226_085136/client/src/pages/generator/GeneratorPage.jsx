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

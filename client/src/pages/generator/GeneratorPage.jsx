import { useEffect, useMemo, useState } from "react";
import ToolResult from "../../components/ui/ToolResult";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";

// local storage keys
const LS_KEY = "ccg_generator_state_v2";

const PLATFORM_OPTIONS = [
  { value: "linux", label: "Linux" },
  { value: "windows", label: "Windows" },
  { value: "mac", label: "macOS" },
  { value: "network", label: "Network Device" },
  { value: "other", label: "Other (Custom OS)" },
];

const OUTPUT_TYPES = [
  { value: "tool", labelFa: "Tool (کامل)", labelEn: "Tool (Full)" },
  { value: "command", labelFa: "Command (فقط دستور)", labelEn: "Command (Commands only)" },
  { value: "python", labelFa: "Python", labelEn: "Python" },
];

const VERBOSITY = [
  { value: "brief", labelFa: "خلاصه", labelEn: "Brief" },
  { value: "normal", labelFa: "نرمال", labelEn: "Normal" },
  { value: "detailed", labelFa: "جزئی", labelEn: "Detailed" },
];

const SHELL_BY_PLATFORM = {
  linux: ["bash", "zsh", "sh"],
  windows: ["powershell", "cmd"],
  mac: ["zsh", "bash"],
  network: ["cli"],
  other: ["bash", "zsh", "sh", "powershell", "cmd"],
};

const LINUX_DISTROS = ["Ubuntu","Debian","RHEL","Rocky","AlmaLinux","CentOS","Fedora","Arch","Manjaro","openSUSE","Alpine","Kali"];
const WINDOWS_FLAVORS = ["Windows 10","Windows 11","Windows Server 2019","Windows Server 2022"];
const MAC_FLAVORS = ["macOS"];

const NETWORK_VENDORS = ["Cisco","MikroTik","FortiGate","Juniper","Aruba","Huawei","Generic"];
const DEVICE_TYPES_BY_VENDOR = {
  Cisco: ["switch","router","firewall"],
  MikroTik: ["router","switch"],
  FortiGate: ["firewall"],
  Juniper: ["switch","router","firewall"],
  Aruba: ["switch","controller"],
  Huawei: ["switch","router","firewall"],
  Generic: ["router","switch","firewall","appliance"],
};

function isSafeFreeText(v, min=2, max=40) {
  const s = String(v||"").trim().replace(/\s+/g," ");
  if (s.length < min || s.length > max) return false;
  return /^[a-zA-Z0-9 ._+\-\/]{2,40}$/.test(s);
}

function qsToObj() {
  const q = new URLSearchParams(window.location.search);
  return {
    platform: q.get("platform") || "",
    cli: q.get("cli") || "",
    out: q.get("out") || "",
    v: q.get("v") || "",
    adv: q.get("adv") || "",
    swap: q.get("swap") || "",
    lang: q.get("lang") || "",
  };
}
function setQS(p) {
  const q = new URLSearchParams(window.location.search);
  Object.entries(p).forEach(([k,v]) => {
    if (v === "" || v == null) q.delete(k);
    else q.set(k, String(v));
  });
  const url = `${window.location.pathname}?${q.toString()}`;
  window.history.replaceState({}, "", url);
}

function FieldLabel({ label, tip }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-90">{label}</span>
      {tip ? (
        <span className="relative group">
          <button
            type="button"
            className="w-5 h-5 rounded-full border text-xs opacity-70 hover:opacity-100 dark:border-white/10"
            aria-label={`${label} help`}
          >
            ?
          </button>
          <span className="pointer-events-none absolute z-50 hidden group-hover:block top-7 left-1/2 -translate-x-1/2 w-80 rounded-lg border bg-white p-2 text-xs text-slate-700 shadow dark:bg-slate-950 dark:text-slate-100 dark:border-white/10">
            {tip}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export default function GeneratorPage() {
  const { lang, setLang, t } = useLanguage();
  const isRTL = (lang === "fa");

    const en = {
      platform: "Platform",
      outputType: "Output type",
      cli: "Shell / CLI",
      verbosity: "Verbosity",
      advanced: "Advanced",
      custom: "Custom OS/Shell",
      distro: "Distro / Flavor",
      version: "Version (optional)",
      vendor: "Vendor",
      deviceType: "Device type",
      request: "Request",
      gen: "Generate",
      explain: "Explain command",
      swap: "Swap",
      errFix: "Fix this first:",
      tip_platform: "Target platform to generate commands for.",
      tip_output: "Tool: full output. Command: command + warnings + alternatives (no explanation). Python: python code only.",
      tip_cli: "Target shell/CLI (bash, PowerShell, cmd, ...).",
      tip_verbosity: "Brief: short. Normal: standard. Detailed: full explanation + examples.",
      tip_advanced: "Advanced fields for the selected platform only.",
      tip_custom: "Use for custom OS/Shell. Invalid values will be blocked before sending.",
      placeholder: "Write a clear request (goal + constraints). Example: “Restart my system”",
    };

  // Defaults
  const [platform, setPlatform] = useState("linux");
  const [cli, setCli] = useState("bash");
  const [outputType, setOutputType] = useState("tool");
  const [verbosity, setVerbosity] = useState("normal");
  const [advanced, setAdvanced] = useState(false);
  const [swap, setSwap] = useState(false);

  // advanced per-platform
  const [linuxDistro, setLinuxDistro] = useState("Ubuntu");
  const [windowsFlavor, setWindowsFlavor] = useState("Windows 11");
  const [macFlavor, setMacFlavor] = useState("macOS");
  const [osVersion, setOsVersion] = useState("");

  // network
  const [vendor, setVendor] = useState("Cisco");
  const [deviceType, setDeviceType] = useState("router");

  // custom
  const [customOn, setCustomOn] = useState(false);
  const [customOS, setCustomOS] = useState("");
  const [customShell, setCustomShell] = useState("");

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [output, setOutput] = useState("");
  const [tool, setTool] = useState(null);

  // Load persisted state
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      const q = qsToObj();

      const p = q.platform || saved.platform || "linux";
      const c = q.cli || saved.cli || (SHELL_BY_PLATFORM[p]?.[0] || "bash");
      const out = q.out || saved.outputType || "tool";
      const v = q.v || saved.verbosity || "normal";
      const adv = (q.adv ? q.adv === "1" : !!saved.advanced);
      const sw = (q.swap ? q.swap === "1" : !!saved.swap);

      if (q.lang) setLang(q.lang);

      setPlatform(p);
      setCli(c);
      setOutputType(out);
      setVerbosity(v);
      setAdvanced(adv);
      setSwap(sw);

      setLinuxDistro(saved.linuxDistro || "Ubuntu");
      setWindowsFlavor(saved.windowsFlavor || "Windows 11");
      setMacFlavor(saved.macFlavor || "macOS");
      setOsVersion(saved.osVersion || "");

      setVendor(saved.vendor || "Cisco");
      setDeviceType(saved.deviceType || "router");

      setCustomOn(!!saved.customOn);
      setCustomOS(saved.customOS || "");
      setCustomShell(saved.customShell || "");

      setInput(saved.input || "");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep cli valid per platform
  useEffect(() => {
    const allowed = SHELL_BY_PLATFORM[platform] || ["bash"];
    if (!allowed.includes(cli)) setCli(allowed[0]);
    // If leaving network, reset vendor/deviceType
    if (platform !== "network") {
      setVendor("Cisco");
      setDeviceType("router");
    }
    // Custom only relevant on "other"
    if (platform !== "other") setCustomOn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  // persist state + URL
  useEffect(() => {
    const st = {
      platform, cli, outputType, verbosity, advanced, swap,
      linuxDistro, windowsFlavor, macFlavor, osVersion,
      vendor, deviceType,
      customOn, customOS, customShell,
      input
    };
    localStorage.setItem(LS_KEY, JSON.stringify(st));
    setQS({
      platform,
      cli,
      out: outputType,
      v: verbosity,
      adv: advanced ? "1" : "",
      swap: swap ? "1" : "",
      lang,
    });
  }, [platform, cli, outputType, verbosity, advanced, swap, linuxDistro, windowsFlavor, macFlavor, osVersion, vendor, deviceType, customOn, customOS, customShell, input, lang]);

  function validateBeforeSend() {
    const errs = [];

    if (!input.trim()) errs.push(isRTL ? "درخواست خالی است." : "Request is empty.");

    // outputType strict
    if (!["tool","command","python"].includes(outputType)) errs.push("Invalid output type.");

    // platform strict
    if (!["linux","windows","mac","network","other"].includes(platform)) errs.push("Invalid platform.");

    // Custom validation (block before API)
    if (platform === "other" && customOn) {
      if (!isSafeFreeText(customOS, 2, 40)) errs.push(isRTL ? "Custom OS نامعتبر است." : "Invalid Custom OS.");
      if (!isSafeFreeText(customShell, 2, 20)) errs.push(isRTL ? "Custom Shell/CLI نامعتبر است." : "Invalid Custom Shell/CLI.");
    }

    // Advanced validation: only for selected platform
    if (advanced && platform === "linux") {
      if (linuxDistro && !LINUX_DISTROS.includes(linuxDistro)) errs.push(isRTL ? "Distro نامعتبر است." : "Invalid distro.");
      if (osVersion && !isSafeFreeText(osVersion, 1, 20)) errs.push(isRTL ? "Version نامعتبر است (اختیاری)." : "Invalid version (optional).");
    }
    if (advanced && platform === "windows") {
      if (windowsFlavor && !WINDOWS_FLAVORS.includes(windowsFlavor)) errs.push(isRTL ? "Windows نوع نامعتبر است." : "Invalid Windows flavor.");
      if (osVersion && !isSafeFreeText(osVersion, 1, 20)) errs.push(isRTL ? "Version/Build نامعتبر است (اختیاری)." : "Invalid version/build (optional).");
    }
    if (advanced && platform === "mac") {
      if (macFlavor && !MAC_FLAVORS.includes(macFlavor)) errs.push(isRTL ? "macOS نامعتبر است." : "Invalid macOS flavor.");
      if (osVersion && !isSafeFreeText(osVersion, 1, 20)) errs.push(isRTL ? "Version نامعتبر است (اختیاری)." : "Invalid version (optional).");
    }

    // Network validation always available in normal mode (not hidden)
    if (platform === "network") {
      if (!NETWORK_VENDORS.includes(vendor)) errs.push(isRTL ? "Vendor نامعتبر است." : "Invalid vendor.");
      const dt = DEVICE_TYPES_BY_VENDOR[vendor] || [];
      if (!dt.includes(deviceType)) errs.push(isRTL ? "Device type نامعتبر است." : "Invalid device type.");
    }

    return errs;
  }

  function computeOS() {
    // version optional, but don't force users to fill it
    if (platform === "linux") return advanced ? (osVersion ? `${linuxDistro} ${osVersion}` : linuxDistro) : "linux";
    if (platform === "windows") return advanced ? (osVersion ? `${windowsFlavor} ${osVersion}` : windowsFlavor) : "windows";
    if (platform === "mac") return advanced ? (osVersion ? `${macFlavor} ${osVersion}` : macFlavor) : "mac";
    if (platform === "network") return "network";
    if (platform === "other") return customOn ? customOS.trim() : "other";
    return platform;
  }

  function payloadFor(mode="generate", targetCommand="") {
    const base = {
      mode,
      lang,
      user_request: input.trim(),
      outputType,
      verbosity,
    };

    // custom ON => send ONLY custom fields (no extra)
    if (platform === "other" && customOn) {
      return {
        ...base,
        platform: "other",
        os: customOS.trim(),
        cli: customShell.trim(),
        vendor: "",
        deviceType: "general",
        ...(mode === "explain" ? { targetCommand } : {}),
      };
    }

    // normal platforms
    const pl = platform;
    const os = computeOS();
    const c = cli;

    return {
      ...base,
      platform: pl,
      os,
      cli: c,
      vendor: pl === "network" ? vendor : "",
      deviceType: pl === "network" ? deviceType : "general",
      ...(mode === "explain" ? { targetCommand } : {}),
    };
  }

  async function runGenerate() {
    const errs = validateBeforeSend();
    if (errs.length) { setErr(`${t.errFix} ${errs[0]}`); return; }

    setErr("");
    setLoading(true);
    setOutput("");
    setTool(null);

    try {
      const res = await callCCG(payloadFor("generate"));
      setOutput(res?.output || "");
      setTool(res?.tool || null);
    } catch (e) {
      setErr(e?.message || (isRTL ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  }

  async function runExplain() {
    // explain should use last produced tool.primary.command if possible
    const cmd = tool?.primary?.command ? String(tool.primary.command) : "";
    if (!cmd.trim()) { setErr(isRTL ? "اول یک دستور تولید کنید." : "Generate a command first."); return; }

    setErr("");
    setLoading(true);
    try {
      const res = await callCCG(payloadFor("explain", cmd.trim()));
      setOutput(res?.output || "");
      setTool(res?.tool || null);
    } catch (e) {
      setErr(e?.message || (isRTL ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  }

  const cliOptions = SHELL_BY_PLATFORM[platform] || ["bash"];

  const leftPanelClass = `ccg-card p-5 sm:p-6 ${(!swap ? (isRTL ? "order-2" : "order-1") : (isRTL ? "order-1" : "order-2"))}`;
  const rightPanelClass = `ccg-card p-5 sm:p-6 ${(!swap ? (isRTL ? "order-1" : "order-2") : (isRTL ? "order-2" : "order-1"))}`;

  return (
    <div className="space-y-8">
      <div className="ccg-container">
        <div className="ccg-card px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between">

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <FieldLabel label={t.platform} tip={t.tip_platform} />
              <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="ccg-select text-sm">
                {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <FieldLabel label={t.cli} tip={t.tip_cli} />
              <select value={cli} onChange={(e)=>setCli(e.target.value)} className="ccg-select text-sm">
                {cliOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <FieldLabel label={t.outputType} tip={t.tip_output} />
              <select value={outputType} onChange={(e)=>setOutputType(e.target.value)} className="ccg-select text-sm">
                {OUTPUT_TYPES.map(o => (
                  <option key={o.value} value={o.value}>{isRTL ? o.labelFa : o.labelEn}</option>
                ))}
              </select>

              <FieldLabel label={t.verbosity} tip={t.tip_verbosity} />
              <select value={verbosity} onChange={(e)=>setVerbosity(e.target.value)} className="ccg-select text-sm">
                {VERBOSITY.map(o => <option key={o.value} value={o.value}>{isRTL ? o.labelFa : o.labelEn}</option>)}
              </select>

              <div className="flex items-center gap-2">
                <input id="ccg-adv" type="checkbox" checked={advanced} onChange={(e)=>setAdvanced(e.target.checked)} />
                <label htmlFor="ccg-adv" className="text-sm opacity-90">{t.advanced}</label>
              </div>

              <button type="button" className="ccg-btn text-sm" onClick={()=>setSwap(s=>!s)}>
                {t.swap}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="ccg-btn text-sm" onClick={()=>setLang(isRTL ? "en" : "fa")}>
                {isRTL ? "EN" : "FA"}
              </button>
            </div>

          </div>

          {/* Advanced row (platform-specific only) */}
          {advanced ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="text-sm opacity-80">{t.tip_advanced}</div>

                {platform === "other" ? (
                  <div className="flex items-center gap-2">
                    <input id="ccg-custom" type="checkbox" checked={customOn} onChange={(e)=>setCustomOn(e.target.checked)} />
                    <label htmlFor="ccg-custom" className="text-sm opacity-90">{t.custom}</label>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {platform === "linux" ? (
                  <>
                    <div>
                      <FieldLabel label={t.distro} />
                      <select value={linuxDistro} onChange={(e)=>setLinuxDistro(e.target.value)} className="ccg-select w-full">
                        {LINUX_DISTROS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label={t.version} />
                      <input value={osVersion} onChange={(e)=>setOsVersion(e.target.value)} className="ccg-input w-full" placeholder={isRTL ? "مثلاً 22.04" : "e.g. 22.04"} />
                    </div>
                  </>
                ) : null}

                {platform === "windows" ? (
                  <>
                    <div>
                      <FieldLabel label={t.distro} />
                      <select value={windowsFlavor} onChange={(e)=>setWindowsFlavor(e.target.value)} className="ccg-select w-full">
                        {WINDOWS_FLAVORS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label={t.version} />
                      <input value={osVersion} onChange={(e)=>setOsVersion(e.target.value)} className="ccg-input w-full" placeholder={isRTL ? "اختیاری" : "optional"} />
                    </div>
                  </>
                ) : null}

                {platform === "mac" ? (
                  <>
                    <div>
                      <FieldLabel label={t.distro} />
                      <select value={macFlavor} onChange={(e)=>setMacFlavor(e.target.value)} className="ccg-select w-full">
                        {MAC_FLAVORS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label={t.version} />
                      <input value={osVersion} onChange={(e)=>setOsVersion(e.target.value)} className="ccg-input w-full" placeholder={isRTL ? "اختیاری" : "optional"} />
                    </div>
                  </>
                ) : null}

                {platform === "network" ? (
                  <>
                    <div>
                      <FieldLabel label={t.vendor} />
                      <select value={vendor} onChange={(e)=>{ setVendor(e.target.value); setDeviceType((DEVICE_TYPES_BY_VENDOR[e.target.value]||["router"])[0]); }} className="ccg-select w-full">
                        {NETWORK_VENDORS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label={t.deviceType} />
                      <select value={deviceType} onChange={(e)=>setDeviceType(e.target.value)} className="ccg-select w-full">
                        {(DEVICE_TYPES_BY_VENDOR[vendor] || []).map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                  </>
                ) : null}

                {platform === "other" && customOn ? (
                  <>
                    <div>
                      <FieldLabel label="Custom OS" tip={t.tip_custom} />
                      <input value={customOS} onChange={(e)=>setCustomOS(e.target.value)} className="ccg-input w-full" placeholder={isRTL ? "مثلاً FreeBSD" : "e.g. FreeBSD"} />
                    </div>
                    <div>
                      <FieldLabel label="Custom Shell/CLI" tip={t.tip_custom} />
                      <input value={customShell} onChange={(e)=>setCustomShell(e.target.value)} className="ccg-input w-full" placeholder={isRTL ? "مثلاً tcsh" : "e.g. tcsh"} />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

        </div>
      </div>

      <div className="ccg-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Request */}
          <div className={rightPanelClass}>
            <h2 className="text-lg font-semibold mb-3">{t.request}</h2>
            <textarea
              className="ccg-textarea w-full min-h-[200px]"
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              placeholder={t.placeholder}
            />
            {err ? (
              <div className="ccg-error mt-3">
                <div className="font-semibold mb-1">{isRTL ? "خطا" : "Error"}</div>
                <div className="text-sm">{err}</div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-3 justify-end">
              <button className="ccg-btn" type="button" disabled={loading} onClick={runExplain}>
                {t.explain}
              </button>
              <button className="ccg-btn primary" type="button" disabled={loading} onClick={runGenerate}>
                {loading ? (isRTL ? "در حال اجرا..." : "Running...") : t.gen}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className={leftPanelClass}>
            <h2 className="text-lg font-semibold mb-3">{isRTL ? "خروجی" : "Output"}</h2>
            {outputType === "tool" && tool ? (
              <ToolResult tool={tool} />
            ) : output ? (
              <SectionedMarkdown markdown={output} lang={lang} />
            ) : (
              <div className="text-sm opacity-70">{isRTL ? "خروجی اینجا نمایش داده می‌شود." : "Output will appear here."}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

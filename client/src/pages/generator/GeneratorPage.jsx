import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { callCCG } from "../../services/aiService";
import ToolResult from "../../components/ui/ToolResult";
import SectionedMarkdown from "../../components/ui/SectionedMarkdown";

const LS_KEY = "ccg_generator_state_v2";

const PLATFORM_OPTIONS = [
  { value: "linux", label: "Linux" },
  { value: "windows", label: "Windows" },
  { value: "mac", label: "macOS" },
  { value: "network", label: "Network Device" },
  { value: "other", label: "Other (Custom)" },
];

const SHELL_BY_PLATFORM = {
  linux: ["bash", "zsh", "sh"],
  mac: ["zsh", "bash"],
  windows: ["powershell", "cmd"],
  other: ["bash", "zsh", "sh", "powershell", "cmd"],
};

const LINUX_DISTROS = ["Ubuntu","Debian","RHEL","Rocky","AlmaLinux","CentOS","Fedora","Arch","Manjaro","openSUSE","SLES","Alpine","Kali"];
const WINDOWS_EDITIONS = ["Windows 11","Windows 10","Windows Server 2022","Windows Server 2019"];
const NETWORK_VENDORS = [
  { value: "cisco", label: "Cisco" },
  { value: "mikrotik", label: "MikroTik" },
  { value: "fortinet", label: "Fortinet" },
  { value: "juniper", label: "Juniper" },
  { value: "paloalto", label: "Palo Alto" },
  { value: "arista", label: "Arista" },
  { value: "hpe_aruba", label: "HPE Aruba" },
  { value: "ubiquiti", label: "Ubiquiti" },
  { value: "other", label: "Other" },
];

const NETWORK_DEVICE_TYPES = [
  { value: "router", label: "Router" },
  { value: "switch", label: "Switch" },
  { value: "firewall", label: "Firewall" },
  { value: "loadbalancer", label: "Load Balancer" },
  { value: "wireless", label: "Wireless/AP" },
  { value: "vpn", label: "VPN Gateway" },
  { value: "general", label: "General" },
];

const NETWORK_OS_FLAVOR = {
  cisco: ["Cisco IOS", "Cisco IOS-XE", "Cisco NX-OS", "Cisco ASA", "Cisco FTD"],
  mikrotik: ["RouterOS"],
  fortinet: ["FortiOS"],
  juniper: ["JunOS"],
  paloalto: ["PAN-OS"],
  arista: ["EOS"],
  hpe_aruba: ["ArubaOS-CX", "ArubaOS"],
  ubiquiti: ["EdgeOS", "UniFi OS"],
  other: ["Network OS"],
};

function cleanToken(v) {
  return String(v || "").trim().replace(/\s+/g, " ");
}

function isSafeFreeText(v, minLen = 2, maxLen = 40) {
  const s = cleanToken(v);
  if (s.length < minLen || s.length > maxLen) return false;
  return /^[a-zA-Z0-9 ._+\-\/]{2,40}$/.test(s);
}

function qsSet(params) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    p.set(k, s);
  });
  const q = p.toString();
  const url = q ? `?${q}` : location.pathname;
  window.history.replaceState({}, "", url);
}

function qsGet(key) {
  try { return new URLSearchParams(location.search).get(key); } catch { return null; }
}

export default function GeneratorPage() {
  const { lang, t } = useLanguage();

  // core
  const [platform, setPlatform] = useState("linux");
  const [cli, setCli] = useState("bash");
  const [outputType, setOutputType] = useState("tool"); // tool | markdown
  const [verbosity, setVerbosity] = useState("normal"); // brief|normal|detailed

  // input/output
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [formErr, setFormErr] = useState("");

  const [markdown, setMarkdown] = useState("");
  const [toolResult, setToolResult] = useState(null);

  // network fields (NORMAL)
  const [vendor, setVendor] = useState("cisco");
  const [deviceType, setDeviceType] = useState("general");

  // advanced toggles
  const [advanced, setAdvanced] = useState(false);
  const [customEnabled, setCustomEnabled] = useState(false);

  // advanced per platform
  const [linuxDistro, setLinuxDistro] = useState("Ubuntu");
  const [linuxVersion, setLinuxVersion] = useState("");

  const [windowsEdition, setWindowsEdition] = useState("Windows 11");
  const [windowsVersion, setWindowsVersion] = useState("");

  const [macVersion, setMacVersion] = useState("");

  const [netOs, setNetOs] = useState("Cisco IOS");
  const [netOsVersion, setNetOsVersion] = useState("");

  // custom (validated before API)
  const [customOS, setCustomOS] = useState("");
  const [customShell, setCustomShell] = useState("");

  const isNetwork = platform === "network";

  const shellOptions = useMemo(() => {
    if (isNetwork) return ["network"];
    const arr = SHELL_BY_PLATFORM[platform] || ["bash"];
    return arr;
  }, [platform, isNetwork]);

  // keep cli valid when platform changes
  useEffect(() => {
    if (isNetwork) {
      setCli("network");
      return;
    }
    const opts = SHELL_BY_PLATFORM[platform] || ["bash"];
    if (!opts.includes(cli)) setCli(opts[0]);
  }, [platform, isNetwork]); // eslint-disable-line

  // advanced options must follow platform (no mismatch)
  useEffect(() => {
    setFormErr("");
    setApiErr("");
    if (platform === "linux") {
      // keep sane defaults
      if (!LINUX_DISTROS.includes(linuxDistro)) setLinuxDistro("Ubuntu");
    }
    if (platform === "windows") {
      if (!WINDOWS_EDITIONS.includes(windowsEdition)) setWindowsEdition("Windows 11");
    }
    if (platform === "network") {
      const list = NETWORK_OS_FLAVOR[vendor] || ["Network OS"];
      if (!list.includes(netOs)) setNetOs(list[0]);
    }
    if (platform !== "other") {
      // custom mode only meaningful inside advanced, but keep state
    }
  }, [platform, vendor]); // eslint-disable-line

  // persistence (localStorage + URL query)
  const firstLoad = useRef(true);
  useEffect(() => {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
    })();

    const qPlatform = qsGet("platform");
    const qCli = qsGet("cli");
    const qVerb = qsGet("v");
    const qOut = qsGet("out");

    const s = saved || {};
    setPlatform(qPlatform || s.platform || "linux");
    setCli(qCli || s.cli || "bash");
    setVerbosity(qVerb || s.verbosity || "normal");
    setOutputType(qOut || s.outputType || "tool");

    setVendor(s.vendor || "cisco");
    setDeviceType(s.deviceType || "general");

    setAdvanced(Boolean(s.advanced));
    setCustomEnabled(Boolean(s.customEnabled));

    setLinuxDistro(s.linuxDistro || "Ubuntu");
    setLinuxVersion(s.linuxVersion || "");

    setWindowsEdition(s.windowsEdition || "Windows 11");
    setWindowsVersion(s.windowsVersion || "");

    setMacVersion(s.macVersion || "");

    setNetOs(s.netOs || "Cisco IOS");
    setNetOsVersion(s.netOsVersion || "");

    setCustomOS(s.customOS || "");
    setCustomShell(s.customShell || "");

    firstLoad.current = false;
  }, []);

  useEffect(() => {
    if (firstLoad.current) return;

    const state = {
      platform, cli, outputType, verbosity,
      vendor, deviceType,
      advanced, customEnabled,
      linuxDistro, linuxVersion,
      windowsEdition, windowsVersion,
      macVersion,
      netOs, netOsVersion,
      customOS, customShell,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
    qsSet({ platform, cli, v: verbosity, out: outputType });
  }, [
    platform, cli, outputType, verbosity,
    vendor, deviceType, advanced, customEnabled,
    linuxDistro, linuxVersion, windowsEdition, windowsVersion, macVersion,
    netOs, netOsVersion, customOS, customShell
  ]);

  function buildOsString() {
    if (!advanced) {
      // minimal: platform name only
      if (platform === "linux") return "linux";
      if (platform === "windows") return "windows";
      if (platform === "mac") return "mac";
      if (platform === "network") return "network";
      return "other";
    }

    if (customEnabled) {
      return cleanToken(customOS);
    }

    if (platform === "linux") {
      const base = linuxDistro;
      const ver = cleanToken(linuxVersion);
      return ver ? `${base} ${ver}` : base;
    }
    if (platform === "windows") {
      const base = windowsEdition;
      const ver = cleanToken(windowsVersion);
      return ver ? `${base} ${ver}` : base;
    }
    if (platform === "mac") {
      const ver = cleanToken(macVersion);
      return ver ? `macOS ${ver}` : "macOS";
    }
    if (platform === "network") {
      const ver = cleanToken(netOsVersion);
      return ver ? `${netOs} ${ver}` : netOs;
    }
    return "other";
  }

  function validateBeforeSend() {
    setFormErr("");

    if (!input.trim()) {
      setFormErr(lang === "fa" ? "درخواست را وارد کنید." : "Please enter a request.");
      return false;
    }

    if (customEnabled) {
      const osOk = isSafeFreeText(customOS, 2, 40);
      const shOk = isSafeFreeText(customShell, 2, 20);

      if (!osOk && !shOk) {
        setFormErr(lang === "fa"
          ? "Custom OS و Custom Shell نامعتبر است. فقط حروف/عدد/فاصله و کاراکترهای . _ + - / مجاز است (۲ تا ۴۰ کاراکتر)."
          : "Invalid Custom OS/Shell (allowed: letters/numbers/space and . _ + - /).");
        return false;
      }
      if (!osOk) {
        setFormErr(lang === "fa"
          ? "Custom OS نامعتبر است. مثال درست: Ubuntu, FreeBSD, Windows Server 2022"
          : "Invalid Custom OS.");
        return false;
      }
      if (!shOk) {
        setFormErr(lang === "fa"
          ? "Custom Shell نامعتبر است. مثال درست: bash, zsh, cmd, powershell"
          : "Invalid Custom Shell.");
        return false;
      }
    }

    // prevent mismatch: network must not send non-network cli
    if (isNetwork && cli !== "network") setCli("network");

    return true;
  }

  function payloadForGenerate() {
    const osString = buildOsString();

    // IMPORTANT: when customEnabled, do not send vendor/deviceType or other advanced OS fields
    if (customEnabled) {
      return {
        mode: "generate",
        lang,
        user_request: input.trim(),
        outputType,
        verbosity,
        platform: "other",
        os: cleanToken(customOS),
        cli: cleanToken(customShell),
      };
    }

    return {
      mode: "generate",
      lang,
      user_request: input.trim(),
      outputType,
      verbosity,
      platform,
      os: osString,
      cli,
      vendor: isNetwork ? vendor : "",
      deviceType: isNetwork ? deviceType : "general",
    };
  }

  function payloadForExplain(targetCommand) {
    const osString = buildOsString();

    if (customEnabled) {
      return {
        mode: "explain",
        lang,
        targetCommand,
        user_request: input.trim() || "context",
        outputType,
        verbosity,
        platform: "other",
        os: cleanToken(customOS),
        cli: cleanToken(customShell),
      };
    }

    return {
      mode: "explain",
      lang,
      targetCommand,
      user_request: input.trim() || "context",
      outputType,
      verbosity,
      platform,
      os: osString,
      cli,
      vendor: isNetwork ? vendor : "",
      deviceType: isNetwork ? deviceType : "general",
    };
  }

  const onGenerate = async () => {
    if (loading) return;
    setApiErr("");
    setToolResult(null);
    setMarkdown("");

    if (!validateBeforeSend()) return;

    setLoading(true);
    try {
      const res = await callCCG(payloadForGenerate());
      const tool = res?.tool && typeof res.tool === "object" ? res.tool : null;
      const md = String(res?.output || res?.markdown || res?.result || "").trim();

      if (outputType === "tool") {
        setToolResult(tool);
        setMarkdown(md);
      } else {
        setMarkdown(md);
      }
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  };

  const onExplain = async () => {
    if (!toolResult?.primary?.command) {
      setFormErr(lang === "fa" ? "اول یک خروجی تولید کنید تا بتوان توضیح داد." : "Generate first, then explain.");
      return;
    }
    if (loading) return;
    setApiErr("");
    setFormErr("");

    setLoading(true);
    try {
      const target = String(toolResult.primary.command).trim();
      const res = await callCCG(payloadForExplain(target));
      const tool = res?.tool && typeof res.tool === "object" ? res.tool : null;
      const md = String(res?.output || res?.markdown || res?.result || "").trim();
      setToolResult(tool);
      setMarkdown(md);
    } catch (e) {
      setApiErr(e?.message || (lang === "fa" ? "خطا در ارتباط با API" : "API error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="ccg-container">
        <div className="ccg-card px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200/80">{t("platform") || "Platform"}</span>
              <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="ccg-select text-sm">
                {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {!isNetwork ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-200/80">{t("shell") || "Shell"}</span>
                <select value={cli} onChange={(e)=>setCli(e.target.value)} className="ccg-select text-sm">
                  {shellOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700 dark:text-slate-200/80">{t("vendor") || "Vendor"}</span>
                  <select value={vendor} onChange={(e)=>setVendor(e.target.value)} className="ccg-select text-sm">
                    {NETWORK_VENDORS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700 dark:text-slate-200/80">{t("deviceType") || "Device"}</span>
                  <select value={deviceType} onChange={(e)=>setDeviceType(e.target.value)} className="ccg-select text-sm">
                    {NETWORK_DEVICE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200/80">Output</span>
              <select value={outputType} onChange={(e)=>setOutputType(e.target.value)} className="ccg-select text-sm">
                <option value="tool">Tool (UI)</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200/80">Verbosity</span>
              <select value={verbosity} onChange={(e)=>setVerbosity(e.target.value)} className="ccg-select text-sm">
                <option value="brief">brief</option>
                <option value="normal">normal</option>
                <option value="detailed">detailed</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200/80">
              <input type="checkbox" checked={advanced} onChange={(e)=>setAdvanced(e.target.checked)} />
              Advanced
            </label>
          </div>

          {advanced ? (
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200/80">
                <input type="checkbox" checked={customEnabled} onChange={(e)=>setCustomEnabled(e.target.checked)} />
                Custom OS/Shell
              </label>

              {customEnabled ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Custom OS (validated)</div>
                    <input value={customOS} onChange={(e)=>setCustomOS(e.target.value)} className="ccg-input text-sm w-full" placeholder="Ubuntu / FreeBSD / Windows Server 2022" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Custom Shell/CLI (validated)</div>
                    <input value={customShell} onChange={(e)=>setCustomShell(e.target.value)} className="ccg-input text-sm w-full" placeholder="bash / zsh / cmd / powershell" />
                  </div>
                </div>
              ) : platform === "linux" ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Distro</div>
                    <select value={linuxDistro} onChange={(e)=>setLinuxDistro(e.target.value)} className="ccg-select text-sm w-full">
                      {LINUX_DISTROS.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Version (optional)</div>
                    <input value={linuxVersion} onChange={(e)=>setLinuxVersion(e.target.value)} className="ccg-input text-sm w-full" placeholder="22.04 / 12 / 9 ..." />
                  </div>
                </div>
              ) : platform === "windows" ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Edition</div>
                    <select value={windowsEdition} onChange={(e)=>setWindowsEdition(e.target.value)} className="ccg-select text-sm w-full">
                      {WINDOWS_EDITIONS.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Version/Build (optional)</div>
                    <input value={windowsVersion} onChange={(e)=>setWindowsVersion(e.target.value)} className="ccg-input text-sm w-full" placeholder="23H2 / build 22631 ..." />
                  </div>
                </div>
              ) : platform === "mac" ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">macOS Version (optional)</div>
                    <input value={macVersion} onChange={(e)=>setMacVersion(e.target.value)} className="ccg-input text-sm w-full" placeholder="14 / 13.6 ..." />
                  </div>
                </div>
              ) : platform === "network" ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Network OS</div>
                    <select value={netOs} onChange={(e)=>setNetOs(e.target.value)} className="ccg-select text-sm w-full">
                      {(NETWORK_OS_FLAVOR[vendor] || ["Network OS"]).map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">OS Version (optional)</div>
                    <input value={netOsVersion} onChange={(e)=>setNetOsVersion(e.target.value)} className="ccg-input text-sm w-full" placeholder="16.12 / 7.2 / ..." />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Advanced options for this platform are limited.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ccg-container">
        <div className="ccg-card p-5 sm:p-6 space-y-4">
          <textarea
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            rows={4}
            className="ccg-textarea w-full"
            placeholder={t("placeholderReq") || "درخواستت را واضح بنویس."}
          />

          {formErr ? (
            <div className="ccg-error">
              <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
              <div className="text-sm">{formErr}</div>
            </div>
          ) : null}

          {apiErr ? (
            <div className="ccg-error">
              <div className="font-semibold mb-1">{lang === "fa" ? "خطا" : "Error"}</div>
              <div className="text-sm">{apiErr}</div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="ccg-btn w-full sm:w-auto" onClick={onGenerate} disabled={loading}>
              {loading ? (lang === "fa" ? "در حال تولید..." : "Generating...") : (lang === "fa" ? "Generate" : "Generate")}
            </button>

            <button className="ccg-btn w-full sm:w-auto" onClick={onExplain} disabled={loading || !toolResult?.primary?.command}>
              {lang === "fa" ? "Explain command" : "Explain command"}
            </button>
          </div>
        </div>
      </div>

      <div className="ccg-container">
        <div className="ccg-card p-5 sm:p-8">
          <h2 className="text-lg font-semibold mb-4">{t("output") || "Output"}</h2>

          {outputType === "tool" && toolResult ? (
            <ToolResult tool={toolResult} />
          ) : markdown ? (
            <SectionedMarkdown markdown={markdown} lang={lang} />
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-300/70">
              {t("outputPlaceholder") || "Output will appear here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

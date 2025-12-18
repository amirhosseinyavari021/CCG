import { useMemo, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import { useLanguage } from "../../context/LanguageContext";

export default function GeneratorPage() {
  const { isRTL, lang } = useLanguage();

  const [userRequest, setUserRequest] = useState("");
  const [platform, setPlatform] = useState("Linux");
  const [cli, setCli] = useState("bash");
  const [deviceType, setDeviceType] = useState("router");

  const isNetwork = useMemo(
    () => ["Cisco", "MikroTik", "FortiGate"].includes(platform),
    [platform]
  );

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
    return map[platform] || ["bash"];
  }, [platform]);

  // keep cli valid when platform changes
  useMemo(() => {
    if (!cliOptions.includes(cli)) setCli(cliOptions[0]);
  }, [cliOptions]); // eslint-disable-line

  // placeholder output for now (Phase 2 will connect to backend properly)
  const outputPlaceholder = isRTL
    ? "اینجا خروجی Markdown + Command نمایش داده می‌شود."
    : "Output (Markdown + Command) will appear here.";

  const leftCol = (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          {isRTL ? "ورودی‌ها" : "Inputs"}
        </h2>
        <span className="text-xs text-slate-400">
          {isRTL ? "Form" : "Form"}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            {isRTL ? "پلتفرم" : "Platform"}
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option>Linux</option>
            <option>macOS</option>
            <option>Windows</option>
            <option>Windows Server</option>
            <option>Cisco</option>
            <option>MikroTik</option>
            <option>FortiGate</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">
            {isRTL ? "CLI / Shell" : "CLI / Shell"}
          </label>
          <select
            value={cli}
            onChange={(e) => setCli(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {cliOptions.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>

        {isNetwork && (
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              {isRTL ? "نوع دیوایس" : "Device Type"}
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="router">{isRTL ? "روتر" : "Router"}</option>
              <option value="switch">{isRTL ? "سوییچ" : "Switch"}</option>
              <option value="firewall">{isRTL ? "فایروال" : "Firewall"}</option>
            </select>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-slate-300">
            {isRTL ? "درخواست" : "Request"}
          </label>
          <textarea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            dir={lang === "fa" ? "rtl" : "ltr"}
            placeholder={isRTL ? "مثلاً: بررسی فضای دیسک" : "e.g. Check disk usage"}
            className="min-h-[140px] w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-400"
          />
          <div className="mt-2 text-xs text-slate-500">
            {isRTL
              ? "خروجی بر اساس زبان انتخابی شما نمایش داده می‌شود."
              : "Output language follows your selected language."}
          </div>
        </div>

        <button
          className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-400"
          onClick={() => alert(isRTL ? "فاز ۲: اتصال به API" : "Phase 2: connect to API")}
        >
          {isRTL ? "تولید خروجی" : "Generate Output"}
        </button>
      </div>
    </section>
  );

  const rightCol = (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          {isRTL ? "خروجی" : "Output"}
        </h2>
        <span className="text-xs text-slate-400">
          {isRTL ? "Markdown + Cmd" : "Markdown + Cmd"}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
        {outputPlaceholder}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        {isRTL
          ? "فاز بعدی: CodeBlock + Markdown renderer + WarningBox و اتصال مستقیم به /api/ccg"
          : "Next: CodeBlock + Markdown renderer + WarningBox and connect to /api/ccg"}
      </div>
    </section>
  );

  // ✅ Flip columns by language (RTL => Inputs right, Output left)
  return (
    <MainLayout>
     <div className="grid gap-8 xl:gap-10 lg:grid-cols-2">
        {isRTL ? rightCol : leftCol}
        {isRTL ? leftCol : rightCol}
      </div>
    </MainLayout>
  );
}

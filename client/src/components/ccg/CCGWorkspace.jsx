// client/src/components/ccg/CCGWorkspace.jsx
import { useState } from "react";
import { Wand2, FileCode2, GitCompare, Info } from "lucide-react";
import { osDetails } from "../../constants/osDetails";
import { sendCCGRequest } from "../../api/apiService";

import CommandCard from "../output/CommandCard";
import ErrorAnalysis from "../output/ErrorAnalysis";
import ComparePanel from "../output/ComparePanel";

function TextareaField({ label, placeholder, value, onChange, rows = 4 }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs md:text-sm font-medium text-gray-200">
        {label}
      </label>
      <textarea
        rows={rows}
        className="w-full rounded-xl border border-gray-700/80 bg-black/40 px-3 py-2 text-sm md:text-base text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:border-amber-500/70 resize-y min-h-[96px]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs md:text-sm font-medium text-gray-200">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:border-amber-500/70 ${
          error ? "border-red-500/80" : "border-gray-700/80"
        }`}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

export default function CCGWorkspace({ lang, t }) {
  const [mode, setMode] = useState("generate"); // "generate" | "script" | "explain" | "compare"
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState("");

  // Shared fields
  const [userRequest, setUserRequest] = useState("");
  const [commandToExplain, setCommandToExplain] = useState("");

  // Compare fields
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");

  // OS / CLI / device
  const [os, setOs] = useState("ubuntu");
  const [osVersion, setOsVersion] = useState("");
  const [cli, setCli] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [knowledgeLevel, setKnowledgeLevel] = useState("beginner");

  // When OS changes -> default CLI
  const handleOsChange = (value) => {
    setOs(value);
    const defCli = osDetails[value]?.clis?.[0] || "";
    setCli(defCli);
  };

  const showDeviceType =
    os === "cisco" || os === "mikrotik" || os === "fortigate";

  const knowledgeOptions = [
    { value: "beginner", label: t.level_beginner },
    { value: "intermediate", label: t.level_intermediate },
    { value: "expert", label: t.level_expert },
  ];

  const deviceOptions = [
    { value: "router", label: t.device_router },
    { value: "switch", label: t.device_switch },
    { value: "firewall", label: t.device_firewall },
  ];

  const osOptions = [
    ...Object.keys(osDetails).filter((k) => k !== "other"),
    "other",
  ].map((key) => ({
    value: key,
    label:
      t[`os_${key}`] || key.charAt(0).toUpperCase() + key.slice(1),
  }));

  // Validation
  const validate = () => {
    const newErrors = {};

    if (mode === "generate" || mode === "script") {
      if (!userRequest.trim()) {
        newErrors.userRequest = t.fieldRequired;
      }
    }

    if (mode === "explain") {
      if (!commandToExplain.trim()) {
        newErrors.commandToExplain = t.fieldRequired;
      }
    }

    if (mode === "compare") {
      if (!codeA.trim()) newErrors.codeA = t.fieldRequired;
      if (!codeB.trim()) newErrors.codeB = t.fieldRequired;
    }

    if (!os) newErrors.os = t.fieldRequired;
    if (!cli && os !== "other") newErrors.cli = t.fieldRequired;
    if (showDeviceType && !deviceType) newErrors.deviceType = t.fieldRequired;
    if (!knowledgeLevel) newErrors.knowledgeLevel = t.fieldRequired;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (submitMode) => {
    const finalMode = submitMode || mode;
    setMode(finalMode);
    setApiError("");
    setResult(null);

    if (!validate()) return;

    let payload = {
      mode: finalMode,
      lang,
      os,
      osVersion,
      cli,
      deviceType: showDeviceType ? deviceType : undefined,
      knowledgeLevel,
    };

    if (finalMode === "generate" || finalMode === "script") {
      payload.user_request = userRequest;
    } else if (finalMode === "explain") {
      payload.command_to_explain = commandToExplain;
    } else if (finalMode === "compare") {
      payload.input_a = codeA;
      payload.input_b = codeB;
    }

    try {
      setIsLoading(true);
      const data = await sendCCGRequest(payload);

      // Backend expected to return { type, ... }
      if (!data?.type) {
        // Fallback: based on mode
        if (finalMode === "compare") {
          setResult({ type: "compare", ...data });
        } else if (finalMode === "explain") {
          setResult({ type: "explain", ...data });
        } else {
          setResult({ type: "command", ...data });
        }
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("CCG API error:", err);
      setApiError(
        err?.response?.data?.message ||
          t.errorDefault ||
          "Request failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isRTL = lang === "fa";

  return (
    <div
      className="w-full bg-black/50 border border-gray-800 rounded-2xl shadow-2xl shadow-black/60 p-4 md:p-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-full bg-gray-900/80 border border-gray-700 p-1">
          <button
            type="button"
            onClick={() => setMode("generate")}
            className={`px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full flex items-center gap-1.5 transition ${
              mode === "generate"
                ? "bg-amber-500 text-black shadow"
                : "text-gray-300"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>
              {lang === "fa" ? "تولید دستور" : "Generate Command"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("script")}
            className={`px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full flex items-center gap-1.5 transition ${
              mode === "script"
                ? "bg-emerald-500 text-black shadow"
                : "text-gray-300"
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>
              {lang === "fa" ? "تولید اسکریپت" : "Generate Script"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("explain")}
            className={`px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full flex items-center gap-1.5 transition ${
              mode === "explain"
                ? "bg-sky-500 text-black shadow"
                : "text-gray-300"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>
              {lang === "fa" ? "تحلیل دستور" : "Explain Command"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("compare")}
            className={`px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full flex items-center gap-1.5 transition ${
              mode === "compare"
                ? "bg-purple-500 text-black shadow"
                : "text-gray-300"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>
              {lang === "fa" ? "مقایسه هوشمند کد" : "Smart Code Compare"}
            </span>
          </button>
        </div>

        {/* Knowledge level */}
        <div className="w-full md:w-52">
          <SelectField
            label={t.knowledgeLevel}
            value={knowledgeLevel}
            onChange={setKnowledgeLevel}
            options={knowledgeOptions}
            error={errors.knowledgeLevel}
          />
        </div>
      </div>

      {/* Subheader */}
      <p className="text-xs md:text-sm text-gray-300 mb-4">
        {mode === "explain"
          ? t.explainSubheader
          : mode === "compare"
          ? t.compareSubheader
          : t.generateSubheader}
      </p>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Left side: inputs */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Main input */}
          {mode === "compare" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextareaField
                label={t.pasteCodeA || "Code A"}
                placeholder={
                  lang === "fa"
                    ? "کد نسخه اول را اینجا وارد کنید..."
                    : "Paste original code here..."
                }
                value={codeA}
                onChange={setCodeA}
              />
              <TextareaField
                label={t.pasteCodeB || "Code B"}
                placeholder={
                  lang === "fa"
                    ? "کد نسخه دوم را اینجا وارد کنید..."
                    : "Paste modified code here..."
                }
                value={codeB}
                onChange={setCodeB}
              />
              {errors.codeA && (
                <p className="text-[11px] text-red-400">{errors.codeA}</p>
              )}
              {errors.codeB && (
                <p className="text-[11px] text-red-400">{errors.codeB}</p>
              )}
            </div>
          ) : mode === "explain" ? (
            <TextareaField
              label={t.commandLabel}
              placeholder={t.commandPlaceholder}
              value={commandToExplain}
              onChange={setCommandToExplain}
            />
          ) : (
            <TextareaField
              label={t.questionLabel}
              placeholder={t.questionPlaceholder}
              value={userRequest}
              onChange={setUserRequest}
              rows={6}
            />
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleSubmit("generate")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && mode === "generate" ? (
                <span className="w-4 h-4 rounded-full border-2 border-black/40 border-t-transparent animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              <span>{t.generate}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("script")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && mode === "script" ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
              ) : (
                <FileCode2 className="w-4 h-4" />
              )}
              <span>{t.generateScript}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("explain")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && mode === "explain" ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
              ) : (
                <Info className="w-4 h-4" />
              )}
              <span>{t.explain}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("compare")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && mode === "compare" ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
              ) : (
                <GitCompare className="w-4 h-4" />
              )}
              <span>{t.compareWithAI}</span>
            </button>
          </div>

          {Object.values(errors).some(Boolean) && (
            <p className="text-[11px] text-red-400 mt-1">
              {lang === "fa"
                ? "لطفاً خطاهای قرمز را برطرف کنید."
                : "Please fix the highlighted errors."}
            </p>
          )}

          {apiError && (
            <p className="text-[12px] text-red-400 mt-2">{apiError}</p>
          )}
        </div>

        {/* Right side: OS / CLI / device */}
        <div className="lg:col-span-1 flex flex-col gap-3 bg-gray-950/60 border border-gray-800 rounded-2xl p-3">
          <SelectField
            label={t.os}
            value={os}
            onChange={handleOsChange}
            options={osOptions}
            error={errors.os}
          />

          <SelectField
            label={t.cli || "CLI / Shell"}
            value={cli}
            onChange={setCli}
            options={(osDetails[os]?.clis || []).map((c) => ({
              value: c,
              label: c,
            }))}
            error={errors.cli}
          />

          {showDeviceType && (
            <SelectField
              label={t.deviceType}
              value={deviceType}
              onChange={setDeviceType}
              options={deviceOptions}
              error={errors.deviceType}
            />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs md:text-sm font-medium text-gray-200">
              {t.osVersion}
            </label>
            <input
              className="w-full rounded-xl border border-gray-700/80 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:border-amber-500/70"
              placeholder={lang === "fa" ? "مثال: 22.04" : "e.g., 22.04"}
              value={osVersion}
              onChange={(e) => setOsVersion(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Result section */}
      {result && (
        <div className="mt-6 border-t border-gray-800 pt-4">
          {result.type === "compare" ? (
            <ComparePanel lang={lang} t={t} data={result} />
          ) : result.type === "explain" ? (
            <ErrorAnalysis lang={lang} t={t} response={result} />
          ) : (
            <CommandCard lang={lang} t={t} data={result} />
          )}
        </div>
      )}
    </div>
  );
}

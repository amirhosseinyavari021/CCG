// client/src/components/Form.jsx
import { useState, useEffect } from "react";
import { Wand2, FileCode2 } from "lucide-react";

import { osDetails } from "../constants/osDetails";
import { translations } from "../constants/translations";

import CustomSelect from "./common/CustomSelect";
import LoadingSpinner from "./common/LoadingSpinner";

// ----------------------
// Helper: initial lang
// ----------------------
const getInitialLang = () => {
  if (typeof window === "undefined") return "fa";
  const stored = localStorage.getItem("lang");
  if (stored === "en" || stored === "fa") return stored;
  return "fa";
};

export default function Form({
  // از بالا می‌تونه بیاد، ولی اجباری نیست
  lang: langProp,
  t: tProp,
  mode,            // "generate" | "explain" | "script"
  setMode,
  isLoading,
  onSubmit,        // (payload) => void
}) {
  // ----------------------
  // Language handling (ایمن)
  // ----------------------
  const [localLang, setLocalLang] = useState(() => langProp || getInitialLang());

  useEffect(() => {
    if (langProp && (langProp === "fa" || langProp === "en")) {
      setLocalLang(langProp);
    }
  }, [langProp]);

  const lang = langProp || localLang;
  const t = tProp || translations[lang] || translations["fa"];

  const isRTL = lang === "fa";

  // ----------------------
  // Form state
  // ----------------------
  const [userRequest, setUserRequest] = useState("");
  const [commandToExplain, setCommandToExplain] = useState("");

  const [os, setOs] = useState("ubuntu");
  const [osVersion, setOsVersion] = useState("");
  const [cli, setCli] = useState("");

  const [deviceType, setDeviceType] = useState("");
  const [knowledgeLevel, setKnowledgeLevel] = useState("beginner");

  const [customOsName, setCustomOsName] = useState("");
  const [customOsVersion, setCustomOsVersion] = useState("");
  const [customCli, setCustomCli] = useState("");

  const [errors, setErrors] = useState({});

  // ----------------------
  // When OS changes → set default CLI
  // ----------------------
  useEffect(() => {
    if (os in osDetails && os !== "other") {
      const defCli = osDetails[os].clis?.[0] || "";
      setCli(defCli);
      setCustomCli("");
      setCustomOsName("");
      setCustomOsVersion("");
      setOsVersion("");
    }
  }, [os]);

  // ----------------------
  // Derived data
  // ----------------------
  const osOptions = [
    ...Object.keys(osDetails).filter((k) => k !== "other"),
    "other",
  ];

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

  // ----------------------
  // Validation
  // ----------------------
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

    if (!os) {
      newErrors.os = t.fieldRequired;
    }

    if (os === "other") {
      if (!customOsName.trim()) {
        newErrors.customOsName = t.fieldRequired;
      }
      // osVersion سفارشی اختیاری است
      if (!customCli.trim()) {
        newErrors.customCli = t.fieldRequired;
      }
    } else {
      if (!cli) {
        newErrors.cli = t.fieldRequired;
      }
    }

    if (showDeviceType && !deviceType) {
      newErrors.deviceType = t.fieldRequired;
    }

    if (!knowledgeLevel) {
      newErrors.knowledgeLevel = t.fieldRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ----------------------
  // Submit handler
  // ----------------------
  const handleSubmit = (submitMode) => {
    if (submitMode && submitMode !== mode && setMode) {
      setMode(submitMode);
    }

    if (!validate()) return;

    let finalOs = os;
    let finalOsVersion = osVersion;
    let finalCli = cli;

    if (os === "other") {
      finalOs = customOsName;
      finalOsVersion = customOsVersion; // اختیاری
      finalCli = customCli;
    }

    const payload = {
      mode: submitMode || mode,
      lang,
      os: finalOs,
      osVersion: finalOsVersion || "",
      cli: finalCli || "",
      deviceType: showDeviceType ? deviceType : undefined,
      knowledgeLevel,
      user_request: userRequest,
      command_to_explain: commandToExplain,
    };

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  // ----------------------
  // Render
  // ----------------------
  return (
    <div
      className="w-full max-w-5xl mx-auto bg-white/80 dark:bg-gray-900/80 
                 rounded-2xl shadow-xl p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Mode tabs (تولید / اسکریپت / توضیح) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setMode && setMode("generate")}
            className={`px-4 py-1.5 text-xs md:text-sm rounded-full transition ${
              mode === "generate"
                ? "bg-amber-500 text-black shadow"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {t.modeGenerate}
          </button>
          <button
            type="button"
            onClick={() => setMode && setMode("script")}
            className={`px-4 py-1.5 text-xs md:text-sm rounded-full transition ${
              mode === "script"
                ? "bg-amber-500 text-black shadow"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {t.generateScript}
          </button>
          <button
            type="button"
            onClick={() => setMode && setMode("explain")}
            className={`px-4 py-1.5 text-xs md:text-sm rounded-full transition ${
              mode === "explain"
                ? "bg-amber-500 text-black shadow"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {t.modeExplain}
          </button>
        </div>

        {/* سطح دانش */}
        <div className="w-full md:w-52">
          <CustomSelect
            label={t.knowledgeLevel}
            value={knowledgeLevel}
            onChange={setKnowledgeLevel}
            options={knowledgeOptions}
            placeholder={t.selectLevel}
            lang={lang}
            error={errors.knowledgeLevel}
          />
        </div>
      </div>

      {/* توضیح بالای فرم */}
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm md:text-base text-center">
        {mode === "explain" ? t.explainSubheader : t.generateSubheader}
      </p>

      {/* ورودی اصلی (درخواست / دستور) */}
      <div className="mb-6">
        {mode === "explain" ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t.commandLabel}
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 
                         bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm md:text-base
                         min-h-[80px] md:min-h-[100px] focus:outline-none 
                         focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder={t.commandPlaceholder}
              value={commandToExplain}
              onChange={(e) => setCommandToExplain(e.target.value)}
            />
            {errors.commandToExplain && (
              <p className="text-xs text-red-500 mt-1">{errors.commandToExplain}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t.questionLabel}
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 
                         bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm md:text-base
                         min-h-[120px] md:min-h-[150px] focus:outline-none 
                         focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder={t.questionPlaceholder}
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
            />
            {errors.userRequest && (
              <p className="text-xs text-red-500 mt-1">{errors.userRequest}</p>
            )}
          </div>
        )}
      </div>

      {/* OS + CLI + DeviceType */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* OS */}
        <div>
          <CustomSelect
            label={t.os || "OS"}
            value={os}
            onChange={setOs}
            options={osOptions.map((opt) => ({
              value: opt,
              label:
                t[`os_${opt}`] ||
                opt.charAt(0).toUpperCase() + opt.slice(1),
            }))}
            placeholder={t.os}
            lang={lang}
            error={errors.os}
          />
        </div>

        {/* CLI یا Custom CLI */}
        <div>
          {os === "other" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t.customCliPlaceholder || "Custom CLI"}
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 
                           bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm focus:outline-none 
                           focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                placeholder={t.customCliPlaceholder || "e.g., sh"}
                value={customCli}
                onChange={(e) => setCustomCli(e.target.value)}
              />
              {errors.customCli && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.customCli}
                </p>
              )}
            </div>
          ) : (
            <CustomSelect
              label={t.cli || "CLI"}
              value={cli}
              onChange={setCli}
              options={(osDetails[os]?.clis || []).map((c) => ({
                value: c,
                label: c,
              }))}
              placeholder={t.selectCli}
              lang={lang}
              error={errors.cli}
            />
          )}
        </div>

        {/* Device Type (فقط برای دیوایس‌های شبکه‌ای) */}
        {showDeviceType ? (
          <div>
            <CustomSelect
              label={t.deviceType}
              value={deviceType}
              onChange={setDeviceType}
              options={deviceOptions}
              placeholder={t.selectDevice}
              lang={lang}
              error={errors.deviceType}
            />
          </div>
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      {/* OS Custom fields */}
      {os === "other" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t.customOsLabel}
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 
                         bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm focus:outline-none 
                         focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder={t.customOsPlaceholder}
              value={customOsName}
              onChange={(e) => setCustomOsName(e.target.value)}
            />
            {errors.customOsName && (
              <p className="text-xs text-red-500 mt-1">
                {errors.customOsName}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t.customOsVersionLabel}
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 
                         bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm focus:outline-none 
                         focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder={t.customOsVersionPlaceholder}
              value={customOsVersion}
              onChange={(e) => setCustomOsVersion(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center md:justify-between gap-3 mt-6">
        <div className="flex flex-wrap gap-3 justify-center">
          {/* Generate Commands */}
          <button
            type="button"
            onClick={() => handleSubmit("generate")}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                       bg-amber-500 hover:bg-amber-400 text-black text-sm md:text-base
                       font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && mode === "generate" ? (
              <LoadingSpinner />
            ) : (
              <Wand2 size={18} />
            )}
            <span>{t.generate}</span>
          </button>

          {/* Generate Script */}
          <button
            type="button"
            onClick={() => handleSubmit("script")}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                       bg-emerald-600 hover:bg-emerald-500 text-white text-sm md:text-base
                       font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && mode === "script" ? (
              <LoadingSpinner />
            ) : (
              <FileCode2 size={18} />
            )}
            <span>{t.generateScript}</span>
          </button>

          {/* Explain Command */}
          <button
            type="button"
            onClick={() => handleSubmit("explain")}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                       bg-gray-800 hover:bg-gray-700 text-white text-sm md:text-base
                       font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && mode === "explain" ? (
              <LoadingSpinner />
            ) : (
              <Wand2 size={18} />
            )}
            <span>{t.explain}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

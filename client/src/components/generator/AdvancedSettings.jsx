// /home/cando/CCG/client/src/components/generator/AdvancedSettings.jsx
import React, { useEffect, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * AdvancedSettings
 * - Keep structure stable: props = { platform, settings, onChange }
 * - Do NOT include "General" fields here (shell/vendor/device type, etc.)
 * - Advanced fields should only be platform-specific deep options.
 *
 * UX/UI Improvements:
 * - Stronger panel styling for light mode (border/ring/shadow)
 * - Field cards for better readability
 * - Better hint & current settings visibility
 *
 * Network Improvements:
 * - OS Type options are derived from networkVendor (NO custom OS)
 * - Auto-fix invalid os_type when vendor changes
 */
export default function AdvancedSettings({
  platform = "linux",
  settings = {},
  onChange,
  networkVendor,
  networkDeviceType, // kept for future use (not mandatory)
}) {
  const { lang } = useLanguage();
  const t = (fa, en) => (lang === "fa" ? fa : en);

  const vendorKey = String(networkVendor || "").trim().toLowerCase() || "generic";

  const networkOsOptions = useMemo(() => {
    const map = {
      cisco: [
        { value: "ios", label: "Cisco IOS" },
        { value: "ios_xe", label: "Cisco IOS XE" },
        { value: "nx_os", label: "Cisco NX-OS" },
        { value: "asa", label: "Cisco ASA" },
      ],
      mikrotik: [{ value: "routeros", label: "RouterOS" }],
      juniper: [{ value: "junos", label: "JunOS" }],
      huawei: [{ value: "vrp", label: "Huawei VRP" }],
      fortinet: [{ value: "fortios", label: "FortiOS" }],
      paloalto: [{ value: "panos", label: "PAN-OS" }],
      arista: [{ value: "eos", label: "Arista EOS" }],
      ubiquiti: [{ value: "unifi_os", label: "UniFi OS" }],
      generic: [
        { value: "ios", label: "Cisco IOS" },
        { value: "ios_xe", label: "Cisco IOS XE" },
        { value: "nx_os", label: "Cisco NX-OS" },
        { value: "routeros", label: "RouterOS" },
        { value: "fortios", label: "FortiOS" },
        { value: "junos", label: "JunOS" },
      ],
    };
    return map[vendorKey] || map.generic;
  }, [vendorKey]);

  // If vendor changes and current os_type becomes invalid, reset to first valid option.
  useEffect(() => {
    if (platform !== "network") return;
    const current = String(settings?.os_type || "").trim();
    const valid = new Set(networkOsOptions.map((x) => String(x.value)));
    if (!current || !valid.has(current)) {
      const next = networkOsOptions[0]?.value;
      if (next && typeof onChange === "function") {
        onChange({ ...(settings || {}), os_type: next });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, vendorKey]);

  const SCHEMA = useMemo(() => {
    return {
      linux: {
        title: { fa: "تنظیمات تخصصی لینوکس", en: "Linux Advanced Settings" },
        fields: [
          {
            type: "select",
            name: "distribution",
            label: { fa: "توزیع", en: "Distribution" },
            options: [
              { value: "ubuntu", label: "Ubuntu" },
              { value: "debian", label: "Debian" },
              { value: "centos", label: "CentOS" },
              { value: "fedora", label: "Fedora" },
              { value: "arch", label: "Arch Linux" },
              { value: "other", label: "Other Distro" },
            ],
          },
          {
            type: "version_input",
            name: "version",
            label: { fa: "ورژن", en: "Version" },
            placeholder: { fa: "مثال: 22.04, 12, 7", en: "e.g., 22.04, 12, 7" },
            suggestions: ["latest", "lts", "stable", "rolling"],
          },
          {
            type: "checkbox",
            name: "sudo",
            label: { fa: "نیاز به sudo", en: "Require sudo" },
            defaultValue: true,
          },
        ],
      },

      windows: {
        title: { fa: "تنظیمات تخصصی ویندوز", en: "Windows Advanced Settings" },
        fields: [
          {
            type: "select",
            name: "version",
            label: { fa: "ورژن ویندوز", en: "Windows Version" },
            options: [
              { value: "win11", label: "Windows 11" },
              { value: "win10", label: "Windows 10" },
              { value: "server2022", label: "Server 2022" },
              { value: "server2019", label: "Server 2019" },
              { value: "server2016", label: "Server 2016" },
              { value: "custom", label: "Custom Version" },
            ],
          },
          {
            type: "text",
            name: "custom_version",
            label: { fa: "ورژن سفارشی", en: "Custom Version" },
            placeholder: { fa: "مثال: 21H2, 19045", en: "e.g., 21H2, 19045" },
            showWhen: { field: "version", value: "custom" },
          },
          {
            type: "checkbox",
            name: "admin",
            label: { fa: "اجرا به عنوان Administrator", en: "Run as Administrator" },
            defaultValue: true,
          },
        ],
      },

      mac: {
        title: { fa: "تنظیمات تخصصی macOS", en: "macOS Advanced Settings" },
        fields: [
          {
            type: "select",
            name: "version",
            label: { fa: "ورژن macOS", en: "macOS Version" },
            options: [
              { value: "sonoma", label: "Sonoma (14)" },
              { value: "ventura", label: "Ventura (13)" },
              { value: "monterey", label: "Monterey (12)" },
              { value: "big_sur", label: "Big Sur (11)" },
              { value: "custom", label: "Custom Version" },
            ],
          },
          {
            type: "text",
            name: "custom_version",
            label: { fa: "ورژن سفارشی", en: "Custom Version" },
            placeholder: { fa: "مثال: 14.2.1, 13.6", en: "e.g., 14.2.1, 13.6" },
            showWhen: { field: "version", value: "custom" },
          },
          {
            type: "checkbox",
            name: "rosetta",
            label: { fa: "پشتیبانی Rosetta 2", en: "Rosetta 2 Support" },
            defaultValue: false,
          },
        ],
      },

      network: {
        title: { fa: "تنظیمات تخصصی شبکه", en: "Network Advanced Settings" },
        fields: [
          // vendor/device_type remain in General (GeneratorPage)
          {
            type: "select",
            name: "os_type",
            label: { fa: "نوع سیستم عامل", en: "OS Type" },
            options: networkOsOptions, // ✅ vendor-based, NO custom
          },
          {
            type: "version_input",
            name: "os_version",
            label: { fa: "ورژن سیستم عامل", en: "OS Version" },
            placeholder: { fa: "مثال: 17.9, 7.4.1", en: "e.g., 17.9, 7.4.1" },
            suggestions: ["latest", "stable", "lts"],
          },
          {
            type: "checkbox",
            name: "backup",
            label: { fa: "ایجاد Backup قبل از تغییر", en: "Create Backup Before Changes" },
            defaultValue: true,
          },
        ],
      },

      other: {
        title: { fa: "تنظیمات تخصصی سایر سیستم‌عامل‌ها", en: "Other OS Advanced Settings" },
        fields: [
          {
            type: "select",
            name: "os_type",
            label: { fa: "نوع سیستم عامل", en: "OS Type" },
            options: [
              { value: "freebsd", label: "FreeBSD" },
              { value: "openbsd", label: "OpenBSD" },
              { value: "netbsd", label: "NetBSD" },
              { value: "solaris", label: "Solaris" },
              { value: "aix", label: "AIX" },
              { value: "hpux", label: "HP-UX" },
              { value: "zos", label: "z/OS" },
              { value: "android", label: "Android" },
              { value: "ios", label: "iOS" },
              { value: "chromeos", label: "ChromeOS" },
            ],
          },
          {
            type: "version_input",
            name: "os_version",
            label: { fa: "ورژن", en: "Version" },
            placeholder: { fa: "مثال: 13.2-RELEASE", en: "e.g., 13.2-RELEASE" },
            suggestions: ["latest", "stable", "lts"],
          },
          {
            type: "select",
            name: "shell_hint",
            label: { fa: "نوع رابط (اختیاری)", en: "Interface Hint (Optional)" },
            options: [
              { value: "", label: t("پیش‌فرض", "Default") },
              { value: "sh", label: "sh" },
              { value: "bash", label: "bash" },
              { value: "ksh", label: "ksh" },
              { value: "tcsh", label: "tcsh" },
              { value: "zsh", label: "zsh" },
              { value: "adb", label: "ADB (Android)" },
              { value: "custom", label: "Custom" },
            ],
          },
          {
            type: "text",
            name: "custom_shell",
            label: { fa: "شل سفارشی", en: "Custom Shell" },
            placeholder: { fa: "مثال: busybox sh", en: "e.g., busybox sh" },
            showWhen: { field: "shell_hint", value: "custom" },
          },
          {
            type: "select",
            name: "architecture",
            label: { fa: "معماری", en: "Architecture" },
            options: [
              { value: "x86_64", label: "x86_64" },
              { value: "arm64", label: "ARM64" },
              { value: "aarch64", label: "AArch64" },
              { value: "i386", label: "i386" },
              { value: "amd64", label: "AMD64" },
              { value: "ppc64le", label: "PPC64LE" },
              { value: "s390x", label: "s390x" },
            ],
          },
          {
            type: "checkbox",
            name: "root_required",
            label: { fa: "نیاز به دسترسی root", en: "Root access required" },
            defaultValue: false,
          },
        ],
      },
    };
  }, [lang, networkOsOptions, t]);

  const schema = SCHEMA[platform] || SCHEMA.linux;

  const setField = (name, value) => {
    if (typeof onChange !== "function") return;
    onChange({ ...(settings || {}), [name]: value });
  };

  const isVisible = (field) => {
    if (!field.showWhen) return true;
    const { field: dep, value } = field.showWhen;
    return (settings?.[dep] ?? "") === value;
  };

  // UI helpers (stronger light-mode)
  const Panel = ({ children }) => (
    <div
      className="
        rounded-2xl border border-gray-200/80 bg-white
        shadow-sm ring-1 ring-black/5
        dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10
      "
    >
      {children}
    </div>
  );

  const FieldCard = ({ children }) => (
    <div
      className="
        rounded-xl border border-gray-200/70 bg-gray-50/80 p-3
        dark:border-white/10 dark:bg-white/[0.03]
      "
    >
      {children}
    </div>
  );

  const Label = ({ children }) => (
    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
      {children}
    </label>
  );

  const InputClass =
    "w-full rounded-xl px-3 py-2 text-sm border border-gray-300/70 bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 " +
    "dark:border-white/10 dark:bg-black/30";

  const SelectClass = InputClass;

  const renderField = (field) => {
    if (!isVisible(field)) return null;

    const label = typeof field.label === "object" ? field.label[lang] || field.label.en : field.label;
    const placeholder =
      field.placeholder
        ? typeof field.placeholder === "object"
          ? field.placeholder[lang] || field.placeholder.en
          : field.placeholder
        : "";

    if (field.type === "select") {
      const v = (settings?.[field.name] ?? "").toString();
      return (
        <FieldCard key={field.name}>
          <Label>{label}</Label>
          <select value={v} onChange={(e) => setField(field.name, e.target.value)} className={SelectClass}>
            {(field.options || []).map((opt) => (
              <option key={`${field.name}-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FieldCard>
      );
    }

    if (field.type === "text") {
      const v = (settings?.[field.name] ?? "").toString();
      return (
        <FieldCard key={field.name}>
          <Label>{label}</Label>
          <input
            type="text"
            value={v}
            onChange={(e) => setField(field.name, e.target.value)}
            placeholder={placeholder}
            className={InputClass}
          />
        </FieldCard>
      );
    }

    if (field.type === "version_input") {
      const v = (settings?.[field.name] ?? "").toString();
      return (
        <FieldCard key={field.name}>
          <Label>{label}</Label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={v}
              onChange={(e) => setField(field.name, e.target.value)}
              placeholder={placeholder}
              list={field.suggestions?.length ? `${field.name}-suggestions` : undefined}
              className={InputClass}
            />
            {field.suggestions?.length ? (
              <select
                className={`${SelectClass} w-40`}
                value=""
                onChange={(e) => {
                  if (e.target.value) setField(field.name, e.target.value);
                }}
              >
                <option value="">{t("پیشنهادها", "Suggestions")}</option>
                {field.suggestions.map((s) => (
                  <option key={`${field.name}-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {field.suggestions?.length ? (
            <datalist id={`${field.name}-suggestions`}>
              {field.suggestions.map((s) => (
                <option key={`${field.name}-dl-${s}`} value={s} />
              ))}
            </datalist>
          ) : null}
        </FieldCard>
      );
    }

    if (field.type === "checkbox") {
      const checked = settings?.[field.name] ?? field.defaultValue ?? false;
      return (
        <FieldCard key={field.name}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.name}
              checked={!!checked}
              onChange={(e) => setField(field.name, e.target.checked)}
              className="w-4 h-4 rounded border border-gray-300 dark:border-white/20"
            />
            <label htmlFor={field.name} className="text-sm text-gray-800 dark:text-gray-100">
              {label}
            </label>
          </div>
        </FieldCard>
      );
    }

    return null;
  };

  const hint = useMemo(() => {
    const map = {
      linux: {
        fa: "برای دقت بیشتر، توزیع و ورژن را وارد کنید. برای سرور معمولاً LTS پیشنهاد می‌شود.",
        en: "For better accuracy, set distro/version. LTS is recommended for servers.",
      },
      windows: {
        fa: "اگر دستور نیاز به دسترسی بالا دارد، گزینه Administrator را فعال کنید.",
        en: "Enable Administrator if elevated privileges are needed.",
      },
      mac: {
        fa: "اگر روی Apple Silicon هستید و ابزار قدیمی دارید، Rosetta ممکن است لازم باشد.",
        en: "On Apple Silicon, Rosetta might be needed for legacy tooling.",
      },
      network: {
        fa: "OS Type بر اساس Vendor تنظیم می‌شود. ورژن دقیق کمک می‌کند خروجی دقیق‌تر باشد.",
        en: "OS Type is derived from Vendor. Exact version improves accuracy.",
      },
      other: {
        fa: "برای سیستم‌های کمتر رایج، نوع OS و معماری را مشخص کنید تا خروجی دقیق‌تر شود.",
        en: "For niche OS, set OS type and architecture for more accurate output.",
      },
    };
    return map[platform]?.[lang] || map[platform]?.en || "";
  }, [platform, lang]);

  const title = typeof schema.title === "object" ? schema.title[lang] || schema.title.en : schema.title;

  return (
    <Panel>
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{title}</h3>
            {platform === "network" && networkVendor ? (
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {t("Vendor انتخاب‌شده:", "Selected vendor:")}{" "}
                <span className="font-semibold">{String(networkVendor)}</span>
                {networkDeviceType ? (
                  <>
                    {" "}
                    · {t("Device:", "Device:")} <span className="font-semibold">{String(networkDeviceType)}</span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* subtle badge */}
          <span className="px-2 py-1 rounded-full text-[11px] font-semibold border border-gray-200/70 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-200">
            {t("Advanced", "Advanced")}
          </span>
        </div>
      </div>

      {/* Fields */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{(schema.fields || []).map(renderField)}</div>

        {/* Hint */}
        {hint ? (
          <div className="mt-4 rounded-xl border border-blue-200/70 bg-blue-50/80 p-3 text-blue-800 shadow-sm dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-200">
            <div className="text-xs font-semibold mb-1">💡 {t("راهنما", "Tip")}</div>
            <div className="text-sm">{hint}</div>
          </div>
        ) : null}

        {/* Current settings (debug-ish) */}
        {settings && Object.keys(settings).length ? (
          <div className="mt-4 rounded-xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {t("تنظیمات فعلی:", "Current settings:")}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              {Object.entries(settings)
                .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{k}:</span>
                    <span className="font-mono">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

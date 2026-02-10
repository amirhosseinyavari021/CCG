import React, { useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * AdvancedSettings
 * - Keep structure stable: props = { platform, settings, onChange }
 * - Do NOT include "General" fields here (shell/vendor/device type, etc.)
 * - Advanced fields should only be platform-specific deep options.
 */
export default function AdvancedSettings({ platform = "linux", settings = {}, onChange }) {
  const { lang } = useLanguage();

  const t = (fa, en) => (lang === "fa" ? fa : en);

  const SCHEMA = useMemo(() => {
    return {
      linux: {
        title: { fa: "تنظیمات پیشرفته لینوکس", en: "Linux Advanced Settings" },
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
        title: { fa: "تنظیمات پیشرفته ویندوز", en: "Windows Advanced Settings" },
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
        title: { fa: "تنظیمات پیشرفته macOS", en: "macOS Advanced Settings" },
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
        title: { fa: "تنظیمات پیشرفته شبکه", en: "Network Advanced Settings" },
        fields: [
          // NOTE: vendor/device_type are in General (not here).
          {
            type: "select",
            name: "os_type",
            label: { fa: "نوع سیستم عامل", en: "OS Type" },
            options: [
              { value: "ios", label: "Cisco IOS" },
              { value: "ios_xe", label: "Cisco IOS XE" },
              { value: "nx_os", label: "Cisco NX-OS" },
              { value: "asa", label: "Cisco ASA" },
              { value: "routeros", label: "RouterOS" },
              { value: "fortios", label: "FortiOS" },
              { value: "junos", label: "JunOS" },
              { value: "custom", label: "Custom OS" },
            ],
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
        title: { fa: "تنظیمات پیشرفته سیستم‌عامل دیگر", en: "Other OS Advanced Settings" },
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
          // Shell is General; keep custom shell ONLY if user needs explicit override for niche OS:
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
  }, [lang]);

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

  const renderField = (field) => {
    if (!isVisible(field)) return null;

    const label = typeof field.label === "object" ? (field.label[lang] || field.label.en) : field.label;
    const placeholder =
      field.placeholder
        ? (typeof field.placeholder === "object" ? (field.placeholder[lang] || field.placeholder.en) : field.placeholder)
        : "";

    if (field.type === "select") {
      const v = (settings?.[field.name] ?? "").toString();
      return (
        <div key={field.name} className="space-y-1">
          <label className="block text-xs font-medium text-[var(--muted)]">{label}</label>
          <select
            value={v}
            onChange={(e) => setField(field.name, e.target.value)}
            className="ccg-select text-sm w-full"
          >
            {(field.options || []).map((opt) => (
              <option key={`${field.name}-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "text") {
      const v = (settings?.[field.name] ?? "").toString();
      return (
        <div key={field.name} className="space-y-1">
          <label className="block text-xs font-medium text-[var(--muted)]">{label}</label>
          <input
            type="text"
            value={v}
            onChange={(e) => setField(field.name, e.target.value)}
            placeholder={placeholder}
            className="ccg-input text-sm w-full"
          />
        </div>
      );
    }

    if (field.type === "version_input") {
      const v = (settings?.[field.name] ?? "").toString();
      return (
        <div key={field.name} className="space-y-1">
          <label className="block text-xs font-medium text-[var(--muted)]">{label}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={v}
              onChange={(e) => setField(field.name, e.target.value)}
              placeholder={placeholder}
              list={field.suggestions?.length ? `${field.name}-suggestions` : undefined}
              className="ccg-input text-sm flex-1"
            />
            {field.suggestions?.length ? (
              <select
                className="ccg-select text-sm"
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
        </div>
      );
    }

    if (field.type === "checkbox") {
      const checked = settings?.[field.name] ?? field.defaultValue ?? false;
      return (
        <div key={field.name} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={field.name}
            checked={!!checked}
            onChange={(e) => setField(field.name, e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor={field.name} className="text-xs text-[var(--text)]">
            {label}
          </label>
        </div>
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
        fa: "نوع OS و ورژن دقیق کمک می‌کند دستورها دقیق‌تر باشند. قبل از تغییرات Backup را فراموش نکنید.",
        en: "Exact OS/version improves accuracy. Don’t forget backup before changes.",
      },
      other: {
        fa: "برای سیستم‌های کمتر رایج، نوع OS و معماری را مشخص کنید تا خروجی دقیق‌تر شود.",
        en: "For niche OS, set OS type and architecture for more accurate output.",
      },
    };
    return map[platform]?.[lang] || map[platform]?.en || "";
  }, [platform, lang]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">{typeof schema.title === "object" ? (schema.title[lang] || schema.title.en) : schema.title}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(schema.fields || []).map(renderField)}
      </div>

      {hint ? (
        <div className="ccg-card p-3 bg-blue-50 dark:bg-blue-900/20">
          <div className="text-xs text-blue-700 dark:text-blue-300">💡 {hint}</div>
        </div>
      ) : null}

      {settings && Object.keys(settings).length ? (
        <div className="ccg-card p-3 bg-[var(--card2)]">
          <div className="text-xs font-medium mb-2">{t("تنظیمات فعلی:", "Current settings:")}</div>
          <div className="text-xs text-[var(--muted)] space-y-1">
            {Object.entries(settings)
              .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
              .map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-medium text-[var(--text)]">{k}:</span>
                  <span>{String(v)}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}


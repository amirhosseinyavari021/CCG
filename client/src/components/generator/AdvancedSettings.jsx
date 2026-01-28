import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

const PLATFORM_ADVANCED_CONFIG = {
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
          { value: "other", label: "Other Distro" }
        ]
      },
      {
        type: "version_input",
        name: "version",
        label: { fa: "ورژن", en: "Version" },
        placeholder: { fa: "مثال: 22.04, 12, 7", en: "e.g., 22.04, 12, 7" },
        suggestions: ["latest", "lts", "stable", "rolling"]
      },
      {
        type: "select",
        name: "shell",
        label: { fa: "شل", en: "Shell" },
        options: [
          { value: "bash", label: "bash" },
          { value: "zsh", label: "zsh" },
          { value: "sh", label: "sh" },
          { value: "fish", label: "fish" }
        ]
      },
      {
        type: "checkbox",
        name: "sudo",
        label: { fa: "نیاز به sudo", en: "Require sudo" },
        defaultValue: true
      }
    ]
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
          { value: "custom", label: "Custom Version" }
        ]
      },
      {
        type: "version_input",
        name: "custom_version",
        label: { fa: "ورژن سفارشی", en: "Custom Version" },
        placeholder: { fa: "مثال: 21H2, 19045", en: "e.g., 21H2, 19045" },
        showWhen: { field: "version", value: "custom" }
      },
      {
        type: "select",
        name: "shell",
        label: { fa: "شل", en: "Shell" },
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "CMD" },
          { value: "pwsh", label: "PowerShell Core" }
        ]
      },
      {
        type: "checkbox",
        name: "admin",
        label: { fa: "اجرا به عنوان Administrator", en: "Run as Administrator" },
        defaultValue: true
      }
    ]
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
          { value: "custom", label: "Custom Version" }
        ]
      },
      {
        type: "version_input",
        name: "custom_version",
        label: { fa: "ورژن سفارشی", en: "Custom Version" },
        placeholder: { fa: "مثال: 14.2.1, 13.6", en: "e.g., 14.2.1, 13.6" },
        showWhen: { field: "version", value: "custom" }
      },
      {
        type: "select",
        name: "shell",
        label: { fa: "شل", en: "Shell" },
        options: [
          { value: "zsh", label: "zsh (default)" },
          { value: "bash", label: "bash" }
        ]
      },
      {
        type: "checkbox",
        name: "rosetta",
        label: { fa: "پشتیبانی Rosetta 2", en: "Rosetta 2 Support" },
        defaultValue: false
      }
    ]
  },
  
  network: {
    title: { fa: "تنظیمات پیشرفته شبکه", en: "Network Advanced Settings" },
    fields: [
      {
        type: "select",
        name: "vendor",
        label: { fa: "سازنده", en: "Vendor" },
        options: [
          { value: "cisco", label: "Cisco" },
          { value: "mikrotik", label: "MikroTik" },
          { value: "fortinet", label: "Fortinet" },
          { value: "juniper", label: "Juniper" },
          { value: "huawei", label: "Huawei" },
          { value: "other", label: "Other Vendor" }
        ]
      },
      {
        type: "select",
        name: "device_type",
        label: { fa: "نوع دستگاه", en: "Device Type" },
        options: [
          { value: "router", label: "Router" },
          { value: "switch", label: "Switch" },
          { value: "firewall", label: "Firewall" },
          { value: "access_point", label: "Access Point" },
          { value: "load_balancer", label: "Load Balancer" }
        ]
      },
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
          { value: "custom", label: "Custom OS" }
        ]
      },
      {
        type: "version_input",
        name: "os_version",
        label: { fa: "ورژن سیستم عامل", en: "OS Version" },
        placeholder: { fa: "مثال: 17.9, 7.4.1, 22.4R1", en: "e.g., 17.9, 7.4.1, 22.4R1" },
        suggestions: ["latest", "stable", "lts"]
      },
      {
        type: "checkbox",
        name: "backup",
        label: { fa: "ایجاد Backup قبل از تغییر", en: "Create Backup Before Changes" },
        defaultValue: true
      }
    ]
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
          { value: "chromeos", label: "ChromeOS" }
        ]
      },
      {
        type: "version_input",
        name: "os_version",
        label: { fa: "ورژن", en: "Version" },
        placeholder: { fa: "مثال: 13.2-RELEASE, 11.4, 15", en: "e.g., 13.2-RELEASE, 11.4, 15" },
        suggestions: ["latest", "stable", "lts"]
      },
      {
        type: "select",
        name: "shell",
        label: { fa: "شل/CLI", en: "Shell/CLI" },
        options: [
          { value: "bash", label: "bash" },
          { value: "sh", label: "sh" },
          { value: "tcsh", label: "tcsh" },
          { value: "ksh", label: "ksh" },
          { value: "zsh", label: "zsh" },
          { value: "adb", label: "ADB (Android)" },
          { value: "custom", label: "Custom Shell" }
        ]
      },
      {
        type: "text",
        name: "custom_shell",
        label: { fa: "شل سفارشی", en: "Custom Shell" },
        placeholder: { fa: "اگر Custom انتخاب کردید", en: "If you selected Custom" },
        showWhen: { field: "shell", value: "custom" }
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
          { value: "s390x", label: "S390x" }
        ]
      },
      {
        type: "checkbox",
        name: "root_required",
        label: { fa: "نیاز به دسترسی root", en: "Root access required" },
        defaultValue: false
      }
    ]
  },
};

export default function AdvancedSettings({ platform, settings, onChange }) {
  const { lang } = useLanguage();
  const config = PLATFORM_ADVANCED_CONFIG[platform] || PLATFORM_ADVANCED_CONFIG.linux;
  
  const handleChange = (fieldName, value) => {
    onChange({
      ...settings,
      [fieldName]: value
    });
  };
  
  const shouldShowField = (field) => {
    if (!field.showWhen) return true;
    return settings[field.showWhen.field] === field.showWhen.value;
  };
  
  const renderField = (field) => {
    if (!shouldShowField(field)) return null;
    
    const label = typeof field.label === 'object' ? field.label[lang] || field.label.en : field.label;
    const placeholder = field.placeholder ? (typeof field.placeholder === 'object' ? field.placeholder[lang] || field.placeholder.en : field.placeholder) : '';
    
    switch (field.type) {
      case 'select':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <select
              value={settings[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{lang === "fa" ? "-- انتخاب کنید --" : "-- Select --"}</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
        
      case 'text':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={settings[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={placeholder}
              list={field.suggestions ? `${field.name}-suggestions` : undefined}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required={field.required}
            />
            {field.suggestions && (
              <datalist id={`${field.name}-suggestions`}>
                {field.suggestions.map(suggestion => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            )}
          </div>
        );
        
      case 'version_input':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={settings[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={placeholder}
                list={field.suggestions ? `${field.name}-suggestions` : undefined}
                className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {field.suggestions && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleChange(field.name, e.target.value);
                    }
                  }}
                  className="p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <option value="">{lang === "fa" ? "پیشنهادها" : "Suggest"}</option>
                  {field.suggestions.map(suggestion => (
                    <option key={suggestion} value={suggestion}>
                      {suggestion}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              checked={settings[field.name] ?? field.defaultValue ?? false}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.name} className="ml-2 text-xs">
              {label}
            </label>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">
        {typeof config.title === 'object' ? config.title[lang] || config.title.en : config.title}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {config.fields.map(renderField)}
      </div>
      
      {/* Platform-specific tips */}
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-700 dark:text-blue-300">
          💡 {getPlatformTip(platform, lang)}
        </div>
      </div>
      
      {/* Current settings summary */}
      {Object.keys(settings).length > 0 && (
        <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-xs font-medium mb-1">
            {lang === "fa" ? "تنظیمات فعلی:" : "Current settings:"}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {Object.entries(settings)
              .filter(([key, value]) => value !== undefined && value !== '')
              .map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="font-medium">{key}:</span>
                  <span className="mr-2">{String(value)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getPlatformTip(platform, lang) {
  const tips = {
    linux: {
      fa: "برای دستورات دقیق‌تر، توزیع و ورژن لینوکس خود را مشخص کنید. ورژن‌های LTS برای سرورها توصیه می‌شوند.",
      en: "For more accurate commands, specify your Linux distribution and version. LTS versions are recommended for servers."
    },
    windows: {
      fa: "PowerShell 7 برای ویندوز ۱۰/۱۱ و ویندوز سرور توصیه می‌شود. برای اسکریپت‌های قدیمی از CMD استفاده کنید.",
      en: "PowerShell 7 is recommended for Windows 10/11 and Server. Use CMD for legacy scripts."
    },
    mac: {
      fa: "macOS از zsh به عنوان شل پیش‌فرض استفاده می‌کند. برای سازگاری بهتر با لینوکس از bash استفاده کنید.",
      en: "macOS uses zsh as default shell. Use bash for better Linux compatibility."
    },
    network: {
      fa: "سازنده، مدل و ورژن دقیق دستگاه شبکه را وارد کنید. همیشه قبل از تغییرات backup بگیرید.",
      en: "Enter exact network device vendor, model and version. Always backup before changes."
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
          { value: "chromeos", label: "ChromeOS" }
        ]
      },
      {
        type: "version_input",
        name: "os_version",
        label: { fa: "ورژن", en: "Version" },
        placeholder: { fa: "مثال: 13.2-RELEASE, 11.4, 15", en: "e.g., 13.2-RELEASE, 11.4, 15" },
        suggestions: ["latest", "stable", "lts"]
      },
      {
        type: "select",
        name: "shell",
        label: { fa: "شل/CLI", en: "Shell/CLI" },
        options: [
          { value: "bash", label: "bash" },
          { value: "sh", label: "sh" },
          { value: "tcsh", label: "tcsh" },
          { value: "ksh", label: "ksh" },
          { value: "zsh", label: "zsh" },
          { value: "adb", label: "ADB (Android)" },
          { value: "custom", label: "Custom Shell" }
        ]
      },
      {
        type: "text",
        name: "custom_shell",
        label: { fa: "شل سفارشی", en: "Custom Shell" },
        placeholder: { fa: "اگر Custom انتخاب کردید", en: "If you selected Custom" },
        showWhen: { field: "shell", value: "custom" }
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
          { value: "s390x", label: "S390x" }
        ]
      },
      {
        type: "checkbox",
        name: "root_required",
        label: { fa: "نیاز به دسترسی root", en: "Root access required" },
        defaultValue: false
      }
    ]
  },
  
  return tips[platform]?.[lang] || tips[platform]?.en || '';
}

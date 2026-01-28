// Tips and Help Messages for CCG
export const TIPS = {
  // Platform Tips
  platform: {
    fa: "پلتفرم مناسب انتخاب کنید تا دستورات دقیق‌تری دریافت کنید",
    en: "Select appropriate platform for more accurate commands"
  },
  
  // Output Type Tips
  outputType: {
    tool: {
      fa: "دستور کامل + توضیح + هشدار + جایگزین",
      en: "Full command + explanation + warnings + alternatives"
    },
    command: {
      fa: "فقط دستور خالص - مناسب کپی/پیست سریع",
      en: "Only command - suitable for quick copy/paste"
    },
    python: {
      fa: "اسکریپت پایتون قابل اجرا - مناسب اتوماسیون",
      en: "Executable Python script - suitable for automation"
    }
  },
  
  // Knowledge Level Tips
  knowledge: {
    beginner: {
      fa: "توضیحات کامل و گام به گام - مناسب تازه‌کاران",
      en: "Full step-by-step explanations - for beginners"
    },
    intermediate: {
      fa: "توضیحات متوسط - مناسب کاربران با تجربه",
      en: "Moderate explanations - for experienced users"
    },
    expert: {
      fa: "دستورات مختصر و پیشرفته - مناسب حرفه‌ای‌ها",
      en: "Concise advanced commands - for experts"
    }
  },
  
  // Mode Tips
  mode: {
    learn: {
      fa: "حالت آموزشی - توضیحات کامل با مثال",
      en: "Learning mode - full explanations with examples"
    },
    operational: {
      fa: "حالت عملیاتی - دستورات سریع و اجرایی",
      en: "Operational mode - quick executable commands"
    }
  },
  
  // Request Tips
  request: {
    fa: "درخواست خود را واضح و کامل بنویسید. مثال: 'چگونه فضای دیسک سرور لینوکس را بررسی کنم؟'",
    en: "Write your request clearly and completely. Example: 'How to check disk space on Linux server?'"
  },
  
  // Network Tips
  network: {
    vendor: {
      fa: "سازنده تجهیزات شبکه خود را انتخاب کنید",
      en: "Select your network equipment vendor"
    },
    deviceType: {
      fa: "نوع دستگاه شبکه را انتخاب کنید",
      en: "Select network device type"
    }
  },
  
  // Advanced Tips
  advanced: {
    fa: "تنظیمات پیشرفته برای تولید دستورات دقیق‌تر",
    en: "Advanced settings for more precise commands"
  },
  
  // Custom Tips
  custom: {
    fa: "برای سیستم‌عامل‌های خاص، اطلاعات دقیق وارد کنید",
    en: "Enter precise information for specific OS"
  },
  
  // Validation Tips
  validation: {
    required: {
      fa: "این فیلد ضروری است",
      en: "This field is required"
    },
    invalid: {
      fa: "مقدار وارد شده معتبر نیست",
      en: "Entered value is not valid"
    }
  },
  
  // General Tips
  general: [
    {
      fa: "برای نتایج بهتر، درخواست خود را به زبان انگلیسی یا فارسی واضح بنویسید",
      en: "For better results, write your request clearly in English or Persian"
    },
    {
      fa: "از کلمات کلیدی مرتبط استفاده کنید: نصب، پاک‌کردن، بررسی، راه‌اندازی، عیب‌یابی",
      en: "Use relevant keywords: install, remove, check, setup, troubleshoot"
    },
    {
      fa: "اگر خطایی می‌بینید، پیام خطا را کپی و در درخواست قرار دهید",
      en: "If you see an error, copy error message and include in request"
    },
    {
      fa: "برای دستورات حساس، همیشه ابتدا در محیط آزمایشی تست کنید",
      en: "For sensitive commands, always test in safe environment first"
    }
  ]
};

// OS Suggestions for autocomplete
export const OS_SUGGESTIONS = [
  { value: "ubuntu", label: "Ubuntu Linux" },
  { value: "debian", label: "Debian Linux" },
  { value: "centos", label: "CentOS Linux" },
  { value: "fedora", label: "Fedora Linux" },
  { value: "arch", label: "Arch Linux" },
  { value: "alpine", label: "Alpine Linux" },
  { value: "windows", label: "Microsoft Windows" },
  { value: "macos", label: "Apple macOS" },
  { value: "freebsd", label: "FreeBSD" },
  { value: "openbsd", label: "OpenBSD" },
  { value: "netbsd", label: "NetBSD" },
  { value: "solaris", label: "Oracle Solaris" },
  { value: "aix", label: "IBM AIX" },
  { value: "hp-ux", label: "HP-UX" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "cisco-ios", label: "Cisco IOS" },
  { value: "junos", label: "Juniper JunOS" },
  { value: "routeros", label: "MikroTik RouterOS" },
  { value: "fortios", label: "Fortinet FortiOS" }
];

// Shell Suggestions
export const SHELL_SUGGESTIONS = [
  { value: "bash", label: "Bash" },
  { value: "zsh", label: "Zsh" },
  { value: "sh", label: "POSIX Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "cmd", label: "CMD" },
  { value: "tcsh", label: "Tcsh" },
  { value: "ksh", label: "Korn Shell" },
  { value: "fish", label: "Fish" },
  { value: "pwsh", label: "PowerShell Core" }
];

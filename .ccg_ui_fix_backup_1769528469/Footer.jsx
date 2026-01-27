import { useLanguage } from "../../context/LanguageContext";

export default function Footer() {
  const { t, lang } = useLanguage();
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "GitHub", href: "https://github.com/cando-ac/ccg", external: true },
    { label: "Documentation", href: "#", external: false },
    { label: "Privacy", href: "#", external: false },
    { label: "Terms", href: "#", external: false },
    { label: "Contact", href: "#", external: false },
  ];

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--card)]">
      <div className="ccg-container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo and description */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">CCG</span>
              </div>
              <span className="font-bold text-lg">Cando Command Generator</span>
            </div>
            <p className="text-sm text-[var(--muted)] text-center md:text-left max-w-md">
              {lang === "fa" 
                ? "ابزاری هوشمند برای تولید دستورات CLI و اسکریپت‌های خودکار با هوش مصنوعی"
                : "An AI-powered tool for generating CLI commands and automation scripts"}
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : "_self"}
                rel={link.external ? "noopener noreferrer" : ""}
                className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-[var(--border)]"></div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-[var(--muted)]">
            © {currentYear} CCG — Cando Command Generator.{" "}
            {lang === "fa" ? "تمامی حقوق محفوظ است." : "All rights reserved."}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted)]">
              {lang === "fa" ? "ساخته شده با ❤️ برای توسعه‌دهندگان" : "Built with ❤️ for developers"}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-[var(--muted)]">Status: Online</span>
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="mt-4 text-center">
          <span className="text-xs text-[var(--muted)]">
            v3.2.0 • {lang === "fa" ? "آخرین بروزرسانی" : "Last updated"}: {new Date().toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US")}
          </span>
        </div>
      </div>
    </footer>
  );
}

// client/src/pages/CCGLanding.jsx
import { Link } from "react-router-dom";

export default function CCGLanding() {
  return (
    <div className="min-h-screen w-full bg-gray-950 text-white flex flex-col">

      {/* Header */}
      <header className="w-full py-5 px-6 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center font-bold text-lg">
            C
          </div>
          <span className="text-xl font-bold">CCG</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
          >
            ورود / ثبت‌نام
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-sm"
          >
            استفاده سریع
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center py-20 px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          از <span className="text-cyan-400">فرمان</span> تا{" "}
          <span className="text-blue-400">نتیجه</span>  
          در یک لحظه
        </h1>
        <p className="text-gray-300 max-w-2xl text-lg md:text-xl mb-10">
          CCG نسل جدید ابزارهای هوشمند تولید فرمان، اسکریپت‌سازی، مقایسه کد و تحلیل امنیتی است.  
          با پشتیبانی از سیستم‌عامل‌های مختلف، شبکه و DevOps.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <Link
            to="/auth"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition"
          >
            شروع با ثبت‌نام
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-lg transition"
          >
            استفاده سریع بدون حساب
          </Link>
        </div>

        {/* Branding */}
        <div className="mt-12 text-gray-400 text-sm">
          ارائه شده توسط <span className="text-cyan-300 font-semibold">آموزشگاه کندو</span>  
          <br />
          ساخت و توسعه توسط{" "}
          <span className="text-blue-300 font-semibold">امیرحسین یاوری</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16 bg-gray-900/30 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6">

          <FeatureCard
            title="تولید فرمان هوشمند"
            desc="تولید دستور برای Windows, Linux, macOS, Cisco, MikroTik, FortiGate و بیش از 10 محیط دیگر."
            icon="⚡"
          />

          <FeatureCard
            title="مقایسه و تحلیل کد"
            desc="مقایسه پیشرفته دو کد، تحلیل امنیتی، پیشنهاد نسخه بهتر و رفع اشکال خودکار."
            icon="🔍"
          />

          <FeatureCard
            title="پشتیبانی از DevOps"
            desc="تولید اسکریپت Bash/PowerShell، YAML، Dockerfile، CI/CD و ابزارهای زیرساختی."
            icon="🚀"
          />

        </div>
      </section>
    </div>
  );
}

// Component
function FeatureCard({ title, desc, icon }) {
  return (
    <div className="p-6 bg-gray-900 rounded-2xl border border-white/5 shadow-lg hover:shadow-xl transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

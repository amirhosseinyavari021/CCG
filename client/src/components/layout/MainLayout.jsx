// client/src/components/layout/MainLayout.jsx
import { useLanguage } from "../../context/LanguageContext";
import Header from "../shared/Header";
import Footer from "../shared/Footer";

export default function MainLayout({ children }) {
  const { isRTL } = useLanguage();

  return (
    <div
      className="min-h-screen bg-[var(--bg-main)] text-[var(--text)]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Header />

      {/* ✅ فاصله درست زیر هدر */}
      <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}

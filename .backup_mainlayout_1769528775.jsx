import { useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { useLanguage } from "../../context/LanguageContext";

export default function MainLayout({ children }) {
  const { lang } = useLanguage();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle navigation events
  useEffect(() => {
    const handleNavigate = (event) => {
      const view = event.detail;
      console.log("Navigating to:", view);
      // TODO: Implement actual navigation logic
    };

    const handleAuthModal = (event) => {
      console.log("Auth modal:", event.detail);
      // TODO: Implement auth modal
    };

    window.addEventListener("ccg-navigate", handleNavigate);
    window.addEventListener("ccg-auth-modal", handleAuthModal);

    return () => {
      window.removeEventListener("ccg-navigate", handleNavigate);
      window.removeEventListener("ccg-auth-modal", handleAuthModal);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" dir={lang === "fa" ? "rtl" : "ltr"}>
      <Header />
      
      <main className="flex-grow ccg-container py-6 md:py-8">
        <div className="animate-fadeIn">
          {children}
        </div>
      </main>
      
      <Footer />
      
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 ccg-btn-primary p-3 rounded-full shadow-lg"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

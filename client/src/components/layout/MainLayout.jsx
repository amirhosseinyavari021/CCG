import Header from "./Header";
import Footer from "./Footer";
import { useLanguage } from "../../context/LanguageContext";

export default function MainLayout({ children }) {
  const { lang } = useLanguage();
  
  // تزریق styles
  if (typeof document !== 'undefined') {
    const styles = `
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
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
  
  return (
    <div className="min-h-screen flex flex-col" dir={lang === "fa" ? "rtl" : "ltr"}>
      <Header />
      
      <main className="flex-grow ccg-container py-6 md:py-8">
        <div className="animate-fadeIn">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

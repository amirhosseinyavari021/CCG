// src/components/layout/MainLayout.jsx
import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      {/* ⬇️ FIX: container + horizontal padding */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import MainLayout from "./components/layout/MainLayout";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import GeneratorPage from "./pages/generator/GeneratorPage";
import CodeComparatorPage from "./pages/comparator/CodeComparatorPage";

import ErrorAnalyzerModal from "./components/error/ErrorAnalyzerModal";

import { useAppView } from "./hooks/useAppView";

export default function App() {
  const { view, errorAnalyzerOpen, errorSeed, openErrorAnalyzer, closeErrorAnalyzer } =
    useAppView();

  // (kept) auth modal event hook placeholder
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const openAuth = () => setAuthOpen(true);
    window.addEventListener("open-auth-modal", openAuth);
    return () => window.removeEventListener("open-auth-modal", openAuth);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      openErrorAnalyzer(e?.detail || { command: "", context: "" });
    };
    window.addEventListener("open-error-analyzer", handler);
    return () => window.removeEventListener("open-error-analyzer", handler);
  }, [openErrorAnalyzer]);

  return (
    <MainLayout>
      <Toaster position="top-center" />

      <Header />

      <main className="ccg-container mx-auto py-6 sm:py-8">
        {view === "generator" && <GeneratorPage />}
        {view === "comparator" && <CodeComparatorPage />}
      </main>

      <Footer />

      {/* Modal overlay */}
      <ErrorAnalyzerModal
        open={errorAnalyzerOpen}
        onClose={closeErrorAnalyzer}
        seed={errorSeed}
      />

      {/* authOpen is kept for your future auth modal wiring */}
      {authOpen ? null : null}
    </MainLayout>
  );
}

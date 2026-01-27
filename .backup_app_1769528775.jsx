import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import MainLayout from "./components/layout/MainLayout";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import GeneratorPage from "./pages/generator/GeneratorPage";
import CodeComparatorPage from "./pages/comparator/CodeComparatorPage";

import ChatPage from "./pages/chat/ChatPage";

import ErrorAnalyzerModal from "./components/error/ErrorAnalyzerModal";

import { useAppView } from "./hooks/useAppView";

export default function App() {
  const { view } = useAppView();

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorSeed, setErrorSeed] = useState({ command: "", context: "" });

  useEffect(() => {
  useEffect(() => {
    const handleNavigate = (e) => {
      console.log("Navigating to:", e.detail);
      setView(e.detail);
    };
    window.addEventListener("ccg-navigate", handleNavigate);
    return () => window.removeEventListener("ccg-navigate", handleNavigate);
  }, []);
    const onOpen = (e) => {
      const d = e?.detail || {};
      setErrorSeed({ command: d.command || "", context: d.context || "" });
      setErrorOpen(true);
    };
    window.addEventListener("open-error-analyzer", onOpen);
    return () => window.removeEventListener("open-error-analyzer", onOpen);
  }, []);

  return (
    <MainLayout>
      <Toaster position="top-center" />
      <Header />

      <main className="ccg-container mx-auto py-8">
        {view === "generator" && <GeneratorPage />}
        {view === "comparator" && <CodeComparatorPage />}
      
        {view === "chat" && <ChatPage />}
</main>

      <Footer />

      <ErrorAnalyzerModal open={errorOpen} onClose={() => setErrorOpen(false)} seed={errorSeed} />
    </MainLayout>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

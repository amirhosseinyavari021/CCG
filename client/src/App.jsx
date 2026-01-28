import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import GeneratorPage from "./pages/generator/GeneratorPage";
import CodeComparatorPage from "./pages/compare/CodeComparatorPage";
import ChatPage from "./pages/chat/ChatPage";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

// Component to handle URL-based navigation
function AppContent() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(() => {
    // Read view from URL or default to generator
    const urlView = searchParams.get("view");
    return urlView || "generator";
  });

  // Listen for navigation events
  useEffect(() => {
    const handleNavigate = (event) => {
      const newView = event.detail;
      if (["generator", "comparator", "chat"].includes(newView)) {
        setView(newView);
        
        // Update URL without page reload
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("view", newView);
        window.history.pushState({}, "", `?${newSearchParams.toString()}`);
      }
    };
    
    window.addEventListener("ccg-navigate", handleNavigate);
    
    return () => {
      window.removeEventListener("ccg-navigate", handleNavigate);
    };
  }, [searchParams]);

  // Also handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const currentView = new URLSearchParams(window.location.search).get("view");
      if (currentView && currentView !== view) {
        setView(currentView);
      }
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [view]);

  return (
    <MainLayout>
      {view === "generator" && <GeneratorPage />}
      {view === "comparator" && <CodeComparatorPage />}
      {view === "chat" && <ChatPage />}
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<AppContent />} />
              <Route path="/generator" element={<Navigate to="/?view=generator" replace />} />
              <Route path="/compare" element={<Navigate to="/?view=comparator" replace />} />
              <Route path="/chat" element={<Navigate to="/?view=chat" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

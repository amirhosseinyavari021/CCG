// client/src/App.jsx

import { lazy, Suspense, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

// Lazy load pages
const GeneratorPage = lazy(() => import("./pages/generator/GeneratorPage"));
const CodeComparatorPage = lazy(() => import("./pages/compare/CodeComparatorPage"));
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));

function AppContent() {

  // ---- FORCE DOCUMENT LTR (keep your existing fix)
  useEffect(() => {
    document.documentElement.setAttribute("dir", "ltr");
    document.body.setAttribute("dir", "ltr");
  }, []);

  const codeDirectionCSS = useMemo(() => `
    pre, code, textarea, input {
      direction: ltr !important;
      text-align: left !important;
    }
  `, []);

  return (
    <>
      <style>{codeDirectionCSS}</style>

      <MainLayout>
        <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/generator" replace />} />
            <Route path="/generator" element={<GeneratorPage />} />
            <Route path="/compare" element={<CodeComparatorPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/generator" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

// client/src/App.jsx

import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

// Lazy load pages (performance optimized)
const GeneratorPage = lazy(() => import("./pages/generator/GeneratorPage"));
const CodeComparatorPage = lazy(() => import("./pages/compare/CodeComparatorPage"));
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));

// ==============================================
// AppContent (view-based navigation logic)
// ==============================================

function AppContent() {
  const [searchParams] = useSearchParams();

  // ---------- Hard Fix: Keep document direction LTR (forever) ----------
  // Root cause: global RTL on <html>/<body> breaks code editors and code blocks.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const enforceDocumentLTR = () => {
      // Force LTR on document root (UI can still be RTL inside your app wrapper/layout)
      if (html.getAttribute("dir") !== "ltr") html.setAttribute("dir", "ltr");
      if (body.getAttribute("dir") !== "ltr") body.setAttribute("dir", "ltr");

      if (html.style.direction !== "ltr") html.style.direction = "ltr";
      if (body.style.direction !== "ltr") body.style.direction = "ltr";
    };

    enforceDocumentLTR();

    // Prevent other code (e.g., language switch) from flipping it back later
    const obs = new MutationObserver(() => enforceDocumentLTR());

    obs.observe(html, { attributes: true, attributeFilter: ["dir", "style", "class"] });
    obs.observe(body, { attributes: true, attributeFilter: ["dir", "style", "class"] });

    return () => obs.disconnect();
  }, []);

  // ---------- Strong CSS Guard: Force LTR for code/editor surfaces ----------
  const codeDirectionCSS = useMemo(
    () => `
/* =========================================================
   CCG Permanent Fix: Force LTR for code/editor surfaces
   - Prevents RTL UI from flipping code direction.
   - Excludes textareas/inputs that explicitly have .rtl-text
   ========================================================= */

/* Monaco Editor */
.monaco-editor,
.monaco-editor * {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* CodeMirror 6 */
.cm-editor,
.cm-editor *,
.cm-scroller {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* CodeMirror 5 */
.CodeMirror,
.CodeMirror * {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* Code blocks / previews */
pre,
code {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* Textarea/Input that are used for code (default LTR).
   If you have Persian text fields, add className="rtl-text" to them. */
textarea:not(.rtl-text),
input:not(.rtl-text) {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}
`,
    []
  );

  // ---------- Get Initial View ----------
  const getInitialView = () => {
    // 1️⃣ Try URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlView = urlParams.get("view");

    if (urlView && ["generator", "comparator", "chat"].includes(urlView)) {
      return urlView;
    }

    // 2️⃣ Try localStorage (last visited page)
    const saved = localStorage.getItem("ccg_last_view");
    if (saved && ["generator", "comparator", "chat"].includes(saved)) {
      return saved;
    }

    // 3️⃣ Default fallback
    return "generator";
  };

  const [view, setView] = useState(getInitialView);

  // ---------- Persist Last View ----------
  useEffect(() => {
    try {
      localStorage.setItem("ccg_last_view", view);
    } catch {
      // ignore storage errors
    }
  }, [view]);

  // ---------- Keep view in sync if searchParams changes (react-router driven) ----------
  // This helps when something updates URL via router rather than manual pushState.
  useEffect(() => {
    const currentView = searchParams.get("view");
    if (currentView && ["generator", "comparator", "chat"].includes(currentView) && currentView !== view) {
      setView(currentView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ---------- Custom Navigation Event ----------
  useEffect(() => {
    const handleNavigate = (event) => {
      const newView = event.detail;

      if (["generator", "comparator", "chat"].includes(newView)) {
        setView(newView);

        const newSearchParams = new URLSearchParams(window.location.search);
        newSearchParams.set("view", newView);
        window.history.pushState({}, "", `?${newSearchParams.toString()}`);
      }
    };

    window.addEventListener("ccg-navigate", handleNavigate);
    return () => window.removeEventListener("ccg-navigate", handleNavigate);
  }, []);

  // ---------- Browser Back / Forward ----------
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

  // ---------- Render ----------
  return (
    <>
      {/* ✅ Inject hard LTR rules for editors & code surfaces */}
      <style>{codeDirectionCSS}</style>

      <MainLayout>
        <Suspense
          fallback={
            <div className="ccg-container">
              <div className="ccg-card ccg-glass p-6 text-center rounded-2xl">
                <div className="animate-pulse text-sm opacity-70">Loading...</div>
              </div>
            </div>
          }
        >
          {view === "generator" && <GeneratorPage />}
          {view === "comparator" && <CodeComparatorPage />}
          {view === "chat" && <ChatPage />}
        </Suspense>
      </MainLayout>
    </>
  );
}

// ==============================================
// Root App
// ==============================================

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

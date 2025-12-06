// client/src/App.jsx
import { useState, useContext, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { LanguageProvider, LanguageContext } from "./LanguageContext";
import AuthProvider, { AuthContext } from "./AuthContext";

import CCGMain from "./pages/CCGMain";
import CCGAuthPage from "./pages/CCGAuthPage";
import AboutPage from "./pages/AboutPage";
import Header from "./components/Header";
import MobileDrawer from "./components/MobileDrawer";
import Footer from "./components/Footer";
import PopupLanding from "./components/PopupLanding";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";

function AppShell() {
  const { lang } = useContext(LanguageContext);
  const { user, loading } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const location = useLocation();

  const isAuthPage = location.pathname.startsWith("/auth");

  useEffect(() => {
    // تا وقتی یوزر نال باشه (گست) و تو صفحه auth نباشه → popup
    if (!user && !isAuthPage) {
      setShowWelcome(true);
    } else {
      setShowWelcome(false);
    }
  }, [user, isAuthPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p>{lang === "fa" ? "در حال آماده‌سازی..." : "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {!isAuthPage && (
        <>
          <Header onMenu={() => setDrawerOpen(true)} />
          <MobileDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<CCGMain />} />
          <Route path="/auth" element={<CCGAuthPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAuthPage && <Footer />}

      {/* Popup Landing برای guestها */}
      {showWelcome && !isAuthPage && (
        <PopupLanding
          onClose={() => setShowWelcome(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppShell />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

import { createContext, useContext, useState, useMemo } from "react";

/**
 * view:
 *  - generator
 *  - comparator
 *  - error
 */
const AppViewCtx = createContext(null);

export function AppViewProvider({ children }) {
  const [view, setView] = useState("generator");
  const [errorAnalyzerOpen, setErrorAnalyzerOpen] = useState(false);

  const openErrorAnalyzer = () => {
    setView("error");
    setErrorAnalyzerOpen(true);
  };

  const closeErrorAnalyzer = () => {
    setErrorAnalyzerOpen(false);
    setView("generator");
  };

  const value = useMemo(
    () => ({
      view,
      setView,
      errorAnalyzerOpen,
      openErrorAnalyzer,
      closeErrorAnalyzer,
    }),
    [view, errorAnalyzerOpen]
  );

  return (
    <AppViewCtx.Provider value={value}>
      {children}
    </AppViewCtx.Provider>
  );
}

export function useAppView() {
  const ctx = useContext(AppViewCtx);
  if (!ctx) {
    throw new Error("useAppView must be used within AppViewProvider");
  }
  return ctx;
}


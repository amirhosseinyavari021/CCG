import { createContext, useContext, useMemo, useState } from "react";

/**
 * view:
 *  - generator
 *  - comparator
 *  - chat
 *
 * error analyzer is a modal overlay (NOT a separate page)
 */
const AppViewCtx = createContext(null);

export function AppViewProvider({ children }) {
  const [view, setView] = useState("generator");

  // Error Analyzer modal state
  const [errorAnalyzerOpen, setErrorAnalyzerOpen] = useState(false);
  const [errorSeed, setErrorSeed] = useState({ command: "", context: "" });

  const openErrorAnalyzer = (seed) => {
    setErrorSeed({
      command: seed?.command || "",
      context: seed?.context || "",
    });
    setErrorAnalyzerOpen(true);
}

  const closeErrorAnalyzer = () => setErrorAnalyzerOpen(false);

  const value = useMemo(
    () => ({
      view,
      setView,

      errorAnalyzerOpen,
      errorSeed,
      openErrorAnalyzer,
      closeErrorAnalyzer,
    }),
    [view, errorAnalyzerOpen, errorSeed]
  );

  return <AppViewCtx.Provider value={value}>{children}</AppViewCtx.Provider>;
}

export function useAppView() {
  const ctx = useContext(AppViewCtx);
  if (!ctx) throw new Error("useAppView must be used within AppViewProvider");
  return ctx;
}

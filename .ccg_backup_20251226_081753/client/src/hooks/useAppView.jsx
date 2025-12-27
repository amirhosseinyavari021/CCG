import { createContext, useContext, useMemo, useState } from "react";

/**
 * view:
 *  - generator
 *  - comparator
 */
const AppViewCtx = createContext(null);

export function AppViewProvider({ children }) {
  const [view, setView] = useState("generator");

  const value = useMemo(
    () => ({
      view,
      setView,
    }),
    [view]
  );

  return <AppViewCtx.Provider value={value}>{children}</AppViewCtx.Provider>;
}

export function useAppView() {
  const ctx = useContext(AppViewCtx);
  if (!ctx) throw new Error("useAppView must be used within AppViewProvider");
  return ctx;
}

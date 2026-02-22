import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeCtx = createContext(null);

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function resolveTheme(theme) {
  const t = String(theme || "system").toLowerCase();
  if (t === "dark" || t === "light") return t;

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  // ✅ supports: dark | light | system
  const [theme, setTheme] = useState(() => safeGet("ccg_theme") || "system");

  // ✅ apply resolved theme to <html>
  useEffect(() => {
    safeSet("ccg_theme", theme);

    const resolved = resolveTheme(theme);
    const html = document.documentElement;

    html.classList.toggle("dark", resolved === "dark");
    html.setAttribute("data-theme", resolved);
    html.style.colorScheme = resolved === "dark" ? "dark" : "light";
  }, [theme]);

  // ✅ if theme=system and OS theme changes, update UI live
  useEffect(() => {
    if (String(theme).toLowerCase() !== "system") return;

    const mm = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mm) return;

    const handler = () => {
      const resolved = resolveTheme("system");
      const html = document.documentElement;
      html.classList.toggle("dark", resolved === "dark");
      html.setAttribute("data-theme", resolved);
      html.style.colorScheme = resolved === "dark" ? "dark" : "light";
    };

    try {
      mm.addEventListener("change", handler);
      return () => mm.removeEventListener("change", handler);
    } catch {
      // safari fallback
      mm.addListener?.(handler);
      return () => mm.removeListener?.(handler);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () =>
        setTheme((p) => (String(p).toLowerCase() === "dark" ? "light" : "dark")),
      setSystem: () => setTheme("system"),
      resolvedTheme: resolveTheme(theme),
    }),
    [theme]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

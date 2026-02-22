// client/src/utils/themeBoot.js

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function bootTheme() {
  const saved = String(safeGet("ccg_theme") || "system").toLowerCase();

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const finalTheme =
    saved === "dark" ? "dark" : saved === "light" ? "light" : prefersDark ? "dark" : "light";

  const html = document.documentElement;
  if (!html) return finalTheme;

  html.classList.toggle("dark", finalTheme === "dark");
  html.setAttribute("data-theme", finalTheme);
  html.style.colorScheme = finalTheme === "dark" ? "dark" : "light";

  return finalTheme;
}

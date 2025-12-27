/**
 * Robust API base helper
 * - Supports same-origin (default)
 * - Supports VITE_API_BASE (e.g. https://api.example.com or https://example.com)
 * - Avoids accidental "/api/api/..." double prefix
 */
export const API_BASE = (import.meta.env.VITE_API_BASE || "").trim();

function stripSlashes(x) {
  return x.replace(/\/+$/g, "");
}
function stripLeading(x) {
  return x.replace(/^\/+/g, "");
}

export function withBase(path) {
  const p = `/${stripLeading(path || "")}`;
  if (!API_BASE) return p;

  const b = stripSlashes(API_BASE);

  // Prevent double /api prefix:
  // If base ends with /api and path starts with /api, drop one.
  if (b.endsWith("/api") && p.startsWith("/api/")) {
    return `${b}${p.slice(4)}`; // remove leading "/api"
  }

  return `${b}${p}`;
}

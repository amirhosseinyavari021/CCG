// client/src/config/api.js
/**
 * Fixes "/api/api/..." duplication issues.
 *
 * You can set:
 *   VITE_API_BASE="https://your-domain.com"
 * or if you already reverse-proxy /api in nginx, keep it empty.
 */
const RAW_BASE = (import.meta.env.VITE_API_BASE || "").trim();

/**
 * Normalize joining base + path
 */
function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");

  if (!b) return p.startsWith("/") ? p : `/${p}`;

  const cleanP = p.startsWith("/") ? p : `/${p}`;
  return `${b}${cleanP}`;
}

/**
 * withBase("/api/ccg") -> correct URL
 * prevents:
 *  base="/api" + path="/api/ccg" => "/api/ccg" (not "/api/api/ccg")
 */
export function withBase(path = "") {
  const base = RAW_BASE;

  // If base ends with /api and path starts with /api, remove duplication
  const b = base.replace(/\/+$/, "");
  const p = String(path || "");

  if (b.endsWith("/api") && p.startsWith("/api/")) {
    return joinUrl(b.slice(0, -4), p); // remove "/api"
  }

  return joinUrl(b, p);
}

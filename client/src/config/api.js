// client/src/config/api.js

// Prefer same-origin in production (nginx will proxy /ai/* to backend)
export const API_BASE =
  import.meta.env.VITE_API_BASE?.trim() ||
  ""; // "" => same origin, e.g. https://ccg.cando.ac

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 45000);

export function withBase(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

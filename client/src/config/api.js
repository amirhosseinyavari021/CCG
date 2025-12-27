// client/src/config/api.js
// یکدست‌سازی Base URL برای فرانت
// اگر VITE_API_BASE ست باشد (مثلاً https://domain.com) از آن استفاده می‌شود
// در غیر این صورت، درخواست‌ها relative می‌روند (همان دامنه)

export function apiBase() {
  const b = (import.meta?.env?.VITE_API_BASE || "").trim();
  return b.replace(/\/+$/, "");
}

export function withBase(path) {
  const base = apiBase();
  if (!path.startsWith("/")) path = "/" + path;
  return base ? base + path : path;
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");

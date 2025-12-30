#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_domainGuard_fix"
mkdir -p "$BK"

echo "== CCG FIX domainGuard -> STOP 502 =="
echo "Backup: $BK"

# sanity
[ -d "$ROOT/server" ] || { echo "❌ server folder not found"; exit 1; }
[ -f "$ROOT/server.js" ] || { echo "❌ server.js not found"; exit 1; }

# backup
cp -f "$ROOT/server.js" "$BK/server.js.bak" || true
cp -f "$ROOT/server/middleware/domainGuard.js" "$BK/domainGuard.js.bak" 2>/dev/null || true

# write correct middleware (ESM) - provides BOTH named + default export
mkdir -p "$ROOT/server/middleware"
cat > "$ROOT/server/middleware/domainGuard.js" <<'JS'
export function domainGuard(req, res, next) {
  try {
    // اگر گارد واقعی داری، اینجا شرط‌ها رو اضافه کن.
    // فعلاً فقط fail-safe: هیچ چیزی رو بلاک نکن و باعث کرش نشو.
    return next();
  } catch (e) {
    return next();
  }
}

export default domainGuard;
JS

echo "✅ domainGuard.js rewritten (named + default export)"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

# detect port from .env or fallback 3000
PORT="3000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi
echo "== Test local backend: http://127.0.0.1:${PORT} =="

echo "--- curl POST /api/ccg (local) ---"
set +e
curl -sS -i -X POST "http://127.0.0.1:${PORT}/api/ccg" \
  -H "Content-Type: application/json" \
  --data '{"ping":"test"}' | tee "$BK/curl_local_api_ccg.txt"
CURL_EXIT=$?
set -e

echo
if [ "$CURL_EXIT" -ne 0 ]; then
  echo "❌ curl نتونست وصل بشه => هنوز سرویس بالا نیست یا پورت اشتباهه."
  echo "== Last PM2 logs =="
  (pm2 logs ccg --lines 80 --nostream || true) | tee "$BK/pm2_logs_tail.txt" >/dev/null || true
  echo "📌 فایل لاگ: $BK/pm2_logs_tail.txt"
  exit 1
fi

echo "✅ اگر اینجا HTTP response می‌بینی، یعنی 502 کرش حل شده و بک‌اند بالا اومده."
echo "📌 خروجی curl ذخیره شد: $BK/curl_local_api_ccg.txt"

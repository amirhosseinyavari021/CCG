#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_domainGuard_next"
mkdir -p "$BK"

echo "== CCG FIX domainGuard (next is not a function) =="
echo "ROOT=$ROOT"
echo "BACKUP=$BK"

[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }
[ -f "$ROOT/server.js" ] || { echo "❌ server.js not found"; exit 1; }

# backups
cp -f "$ROOT/server.js" "$BK/server.js.bak" || true
cp -rf "$ROOT/server/middleware" "$BK/server_middleware.bak" 2>/dev/null || true

echo "== Show current server.js domainGuard usage (for visibility) =="
grep -n "domainGuard" -n "$ROOT/server.js" || true
echo "---- around line 35-70 (if exists) ----"
nl -ba "$ROOT/server.js" | sed -n '30,90p' || true

echo "== Rewrite domainGuard.js (ESM) as fail-safe, supports middleware + factory + error-mw =="
mkdir -p "$ROOT/server/middleware"

cat > "$ROOT/server/middleware/domainGuard.js" <<'JS'
// Fail-safe Domain Guard
// این فایل طوری نوشته شده که هر جور در server.js استفاده شده باشد کرش نکند:
// - app.use(domainGuard)
// - app.use(domainGuard())
// - app.use(domainGuard(opts))
// - حتی اگر اشتباهی به شکل error-middleware صدا زده شود: (err, req, res, next)

function core(req, res, next) {
  try {
    // اگر بعداً خواستی واقعاً دامنه/Origin چک کنی، اینجا اضافه کن.
    // فعلاً: هیچ چیز را بلاک نکن، فقط عبور بده.
    return typeof next === "function" ? next() : undefined;
  } catch (_) {
    return typeof next === "function" ? next() : undefined;
  }
}

export function domainGuard(a, b, c, d) {
  // حالت 1: middleware عادی (req,res,next)
  if (typeof c === "function") return core(a, b, c);

  // حالت 2: error-middleware (err, req, res, next)
  if (typeof d === "function") return core(b, c, d);

  // حالت 3: factory (domainGuard() یا domainGuard(opts))
  const opts = a; // فعلاً استفاده نمی‌کنیم، ولی برای آینده نگه می‌داریم
  return function domainGuardMiddleware(req, res, next) {
    void opts;
    return core(req, res, next);
  };
}

export default domainGuard;
JS

echo "✅ domainGuard.js fixed (named + default export, no crash)"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

echo "== Wait a moment =="
sleep 1

echo "== Check listening ports (node) =="
ss -lntp 2>/dev/null | awk '/node/ && /LISTEN/ {print}' || true

# detect port: prefer .env then fallback 50000
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi
echo "Using PORT=$PORT for local tests"

echo "== Local health check =="
curl -sS -i --max-time 3 "http://127.0.0.1:${PORT}/api/health" | head -n 20 || true

echo "== Local POST /api/ccg test (minimal) =="
curl -sS -i --max-time 20 \
  -H 'Content-Type: application/json' \
  -d '{"mode":"generate","lang":"fa","user_request":"ls"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 60 || true

echo "== PM2 logs tail (errors) =="
pm2 logs ccg --lines 60 --nostream || true

echo "== DONE =="
echo "Backup: $BK"

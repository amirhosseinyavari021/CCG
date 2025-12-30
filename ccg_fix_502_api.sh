#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
SERVER_JS="$ROOT/server.js"
ENV_FILE="$ROOT/.env"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_502"
mkdir -p "$BK"

echo "== CCG FIX 502 API =="
echo "ROOT=$ROOT"
[ -d "$ROOT" ] || { echo "❌ ROOT پیدا نشد"; exit 1; }
[ -f "$SERVER_JS" ] || { echo "❌ server.js پیدا نشد: $SERVER_JS"; exit 1; }

cp -f "$SERVER_JS" "$BK/server.js.bak" || true
[ -f "$ENV_FILE" ] && cp -f "$ENV_FILE" "$BK/.env.bak" || true

echo "== PM2 status =="
pm2 ls | tee "$BK/pm2_ls.txt" || true
pm2 describe ccg | tee "$BK/pm2_describe_ccg.txt" || true

echo "== Save PM2 logs (last 250 lines) =="
(pm2 logs ccg --lines 250 --nostream || true) | tee "$BK/pm2_ccg_logs_last250.txt" >/dev/null || true

# ---- detect PORT ----
PORT=""
if [ -f "$ENV_FILE" ]; then
  PORT="$(grep -E '^PORT=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi

if [ -z "${PORT}" ]; then
  # try parse server.js: process.env.PORT || 3000   OR app.listen(3000)
  PORT="$(node - <<'NODE'
const fs=require('fs');
const s=fs.readFileSync(process.env.SERVER_JS,'utf8');
let m=s.match(/process\.env\.PORT\s*\|\|\s*(\d+)/);
if(!m) m=s.match(/listen\s*\(\s*(\d+)/);
console.log(m?m[1]:'3000');
NODE
  )"
fi

export SERVER_JS="$SERVER_JS"
PORT="${PORT:-3000}"
echo "== Detected PORT: $PORT ==" | tee "$BK/port.txt"

echo "== Check listening socket on PORT =="
(ss -lntp 2>/dev/null || true) | grep -E ":${PORT}\b" | tee "$BK/ss_listen_port.txt" || true

echo "== Local API test (direct, bypass proxy) =="
set +e
curl -sS -i \
  -X POST "http://127.0.0.1:${PORT}/api/ccg" \
  -H "Content-Type: application/json" \
  --data '{"ping":"test"}' \
  | tee "$BK/curl_local_api_ccg.txt" >/dev/null
CURL_EXIT=$?
set -e

if [ "$CURL_EXIT" -ne 0 ]; then
  echo "❌ curl مستقیم به بک‌اند شکست خورد (احتمالاً سرویس/پورت بالا نیست)."
else
  echo "✅ curl مستقیم به بک‌اند جواب داد. (پس مشکل بیشتر سمت Nginx/Proxy یا مسیر /api/ccg روی دامنه است)"
fi

echo "== Add safe global error handling to server.js (prevent crash) =="
# Add handlers only if not already present
if ! grep -q "CCG_GLOBAL_ERROR_HANDLER" "$SERVER_JS"; then
  cat >> "$SERVER_JS" <<'APPEND'

/* CCG_GLOBAL_ERROR_HANDLER (do not remove)
   هدف: جلوگیری از کرش شدن سرور و اینکه همیشه JSON برگرده
*/
process.on('unhandledRejection', (reason) => {
  console.error('[CCG] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[CCG] uncaughtException:', err);
});

APPEND
fi

# ensure express error middleware exists (append at end)
if ! grep -q "CCG_EXPRESS_ERROR_MW" "$SERVER_JS"; then
  cat >> "$SERVER_JS" <<'APPEND'

/* CCG_EXPRESS_ERROR_MW (do not remove) */
try{
  // اگر app در این فایل تعریف شده باشد، این middleware خطاها را JSON می‌کند
  // (اگر app در scope نبود، مشکلی ایجاد نمی‌کند)
  if (typeof app !== 'undefined' && app && app.use) {
    app.use((err, req, res, next) => {
      console.error('[CCG] ExpressError:', err);
      if (res.headersSent) return next(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    });
  }
}catch(e){
  // silent
}

APPEND
fi

echo "== Restart PM2 (with update env) =="
pm2 restart ccg --update-env | tee "$BK/pm2_restart.txt" || true

echo "== Re-check local API after restart =="
set +e
curl -sS -i \
  -X POST "http://127.0.0.1:${PORT}/api/ccg" \
  -H "Content-Type: application/json" \
  --data '{"ping":"test"}' \
  | tee "$BK/curl_local_api_ccg_after.txt" >/dev/null
set -e

echo "✅ DONE."
echo "📦 گزارش‌ها و خروجی‌ها داخل: $BK"
echo "مرحله بعد (اگر هنوز 502 روی دامنه داری): باید nginx proxy_pass رو با همین PORT چک کنیم."

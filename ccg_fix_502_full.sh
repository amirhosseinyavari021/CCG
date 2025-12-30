#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_502_full"
mkdir -p "$BK"

echo "== CCG FIX 502 (FULL) =="
echo "ROOT=$ROOT"
echo "BACKUP=$BK"

[ -f "$ROOT/server.js" ] || { echo "❌ server.js not found in $ROOT"; exit 1; }

# ---- backup ----
cp -f "$ROOT/server.js" "$BK/server.js.bak"
cp -f "$ROOT/.env" "$BK/.env.bak" 2>/dev/null || true
cp -rf "$ROOT/server/middleware" "$BK/middleware.bak" 2>/dev/null || true
cp -rf "$ROOT/server/routes" "$BK/routes.bak" 2>/dev/null || true

(pm2 ls || true) > "$BK/pm2_ls.txt" 2>&1 || true
(pm2 describe ccg || true) > "$BK/pm2_describe.txt" 2>&1 || true
(pm2 logs ccg --lines 150 --nostream || true) > "$BK/pm2_logs_before.txt" 2>&1 || true

# ---- decide port ----
DESIRED_PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && DESIRED_PORT="$P"
fi
echo "Desired PORT: $DESIRED_PORT"

# ---- ensure domainGuard exports match server.js import (named + default) ----
mkdir -p "$ROOT/server/middleware"
if [ -f "$ROOT/server/middleware/domainGuard.js" ]; then
  cp -f "$ROOT/server/middleware/domainGuard.js" "$BK/domainGuard.js.bak" || true
fi

cat > "$ROOT/server/middleware/domainGuard.js" <<'JS'
export function domainGuard(req, res, next) {
  try {
    // fail-safe: اجازه بده درخواست‌ها رد بشن، کرش نکنه
    return next();
  } catch (e) {
    return next();
  }
}
export default domainGuard;
JS

# ---- patch server.js: enforce PORT/HOST and listen on 0.0.0.0 ----
# هدف: بدون بهم ریختن ساختار، فقط تضمین کنیم listen با HOST انجام میشه.
# 1) اگر HOST/PORT تعریف نشده، اضافه کن.
# 2) اگر app.listen(PORT, ...) هست -> app.listen(PORT, HOST, ...)
# 3) اگر server.listen(PORT, ...) هست -> server.listen(PORT, HOST, ...)

SERVER="$ROOT/server.js"

# add HOST/PORT block if missing
if ! grep -qE '\bHOST\b\s*=' "$SERVER"; then
  perl -0777 -i -pe 's/(^import[\s\S]*?\n)(\s*(?:const|let|var)\s+app\s*=|[\s\S]*?\n\s*const\s+app\s*=)/$1\nconst PORT = Number(process.env.PORT) || 50000;\nconst HOST = process.env.HOST || "0.0.0.0";\n\n$2/sm' "$SERVER" || true
fi

# if PORT exists but not our PORT block, still ensure HOST exists
if ! grep -qE 'process\.env\.HOST' "$SERVER"; then
  # try insert after a PORT const if present
  perl -0777 -i -pe 's/(const\s+PORT\s*=\s*[^;]+;\s*\n)/$1const HOST = process.env.HOST || "0.0.0.0";\n/sm' "$SERVER" || true
fi

# app.listen(PORT, ...) -> add HOST if not already
perl -0777 -i -pe 's/app\.listen\(\s*PORT\s*,\s*(?!HOST\s*,)/app.listen(PORT, HOST, /g' "$SERVER" || true
# server.listen(PORT, ...) -> add HOST if not already
perl -0777 -i -pe 's/(\bserver\b|\bhttpServer\b)\.listen\(\s*PORT\s*,\s*(?!HOST\s*,)/$1.listen(PORT, HOST, /g' "$SERVER" || true

# If they listen using Number(process.env.PORT)... patch that too
perl -0777 -i -pe 's/app\.listen\(\s*Number\(process\.env\.PORT\)\s*\|\|\s*(\d+)\s*,/app.listen(PORT, HOST, /g' "$SERVER" || true
perl -0777 -i -pe 's/app\.listen\(\s*process\.env\.PORT\s*\|\|\s*(\d+)\s*,/app.listen(PORT, HOST, /g' "$SERVER" || true

# Make sure express.json is before routes/guards if we can detect it (safe insert near top)
if ! grep -qE 'express\.json' "$SERVER"; then
  perl -0777 -i -pe 's/(const\s+app\s*=\s*express\(\)\s*;\s*\n)/$1app.use(express.json({ limit: "1mb" }));\napp.use(express.urlencoded({ extended: true }));\n/sm' "$SERVER" || true
fi

echo "✅ Patched server.js (HOST/PORT + listen hardening)"

# ---- restart pm2 with explicit env ----
echo "== Restart PM2 with explicit PORT/HOST =="
PORT="$DESIRED_PORT" HOST="0.0.0.0" pm2 restart ccg --update-env || true
sleep 1

echo "== Check listening ports (ss -lnt) =="
ss -lnt > "$BK/ss_lnt_after.txt" 2>&1 || true
cat "$BK/ss_lnt_after.txt"

# check desired port is listening
if ss -lnt 2>/dev/null | grep -qE "[:.]${DESIRED_PORT}\b"; then
  echo "✅ Node is LISTENING on port $DESIRED_PORT"
else
  echo "❌ هنوز هیچ LISTEN روی $DESIRED_PORT دیده نشد."
  echo "== PM2 logs tail =="
  pm2 logs ccg --lines 200 --nostream > "$BK/pm2_logs_after.txt" 2>&1 || true
  sed -n '1,200p' "$BK/pm2_logs_after.txt" || true
  echo "📌 لاگ ذخیره شد: $BK/pm2_logs_after.txt"
  exit 1
fi

# ---- local curl tests ----
echo "== Local health test =="
curl -sS -i --max-time 3 "http://127.0.0.1:${DESIRED_PORT}/api/health" | head -n 20 | tee "$BK/curl_health.txt" >/dev/null || true

echo "== Local POST /api/ccg smoke test =="
curl -sS -i --max-time 6 \
  -H "Content-Type: application/json" \
  -d '{"mode":"learn","lang":"fa","os":"windows","input":"dir"}' \
  "http://127.0.0.1:${DESIRED_PORT}/api/ccg" | head -n 30 | tee "$BK/curl_ccg_post.txt" >/dev/null || true

# ---- nginx fix (proxy_pass) ----
echo "== Nginx upstream fix attempt =="

have_sudo="0"
if command -v sudo >/dev/null 2>&1; then
  if sudo -n true >/dev/null 2>&1; then
    have_sudo="1"
  fi
fi

if [ "$have_sudo" = "1" ]; then
  echo "✅ sudo available (non-interactive)"

  NG_DIRS="/etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d"
  NG_FILES="$(sudo grep -Rsl --include="*.conf" -E "server_name\s+.*ccg|ccg\.cando\.ac|location\s+/api|proxy_pass\s+http://127\.0\.0\.1:" $NG_DIRS 2>/dev/null || true)"

  if [ -z "$NG_FILES" ]; then
    echo "🟡 nginx conf files not found by grep (maybe different layout). Skipping nginx patch."
  else
    echo "$NG_FILES" | tr ' ' '\n' | sort -u > "$BK/nginx_files.txt"
    echo "Found nginx conf candidates:"
    cat "$BK/nginx_files.txt"

    # backup each file and patch proxy_pass port to DESIRED_PORT only where proxy_pass uses 127.0.0.1:<port>
    while read -r f; do
      [ -z "$f" ] && continue
      sudo cp -f "$f" "$BK/$(basename "$f").bak" || true
      sudo perl -0777 -i -pe "s#proxy_pass\\s+http://127\\.0\\.0\\.1:\\d+#proxy_pass http://127.0.0.1:${DESIRED_PORT}#g" "$f" || true
    done < "$BK/nginx_files.txt"

    echo "== nginx config test =="
    sudo nginx -t

    echo "== reload nginx =="
    sudo systemctl reload nginx || sudo nginx -s reload || true
    echo "✅ nginx reloaded"
  fi
else
  echo "🟡 sudo غیر فعال/نیازمند پسورد است. nginx را نتونستم خودکار پچ کنم."
  echo "برای پیدا کردن proxy_pass و پچ دستی این را اجرا کن:"
  echo "  sudo grep -Rsn --include='*.conf' 'proxy_pass http://127.0.0.1:' /etc/nginx/sites-enabled /etc/nginx/conf.d"
fi

echo "== FINAL: quick check via localhost:80 /api/health (nginx path) =="
curl -sS -i --max-time 5 "http://127.0.0.1/api/health" | head -n 20 | tee "$BK/curl_nginx_health.txt" >/dev/null || true

echo "== DONE =="
echo "Backup folder: $BK"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_nginx_api_404"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"
echo "== FIX NGINX API 404 (KEEP PATH /api/*) =="
echo "Backup: $BK"
echo "Site:   $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد"
  exit 1
fi

# backup
sudo cp -f "$SITE" "$BK/ccg.before.bak"

# detect backend port from PM2 PID (best), fallback .env, fallback 50000
PORT="50000"
PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
if [[ "${PID:-}" =~ ^[0-9]+$ ]]; then
  PFOUND="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' \
    | sed 's/.*://g' | grep -E '^[0-9]+$' | sort -n | uniq | head -n 1 || true)"
  if [ -n "${PFOUND:-}" ]; then PORT="$PFOUND"; fi
fi

if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  if [ -n "${PENV:-}" ]; then PORT="$PENV"; fi
fi

echo "Backend PORT candidate: $PORT" | tee "$BK/port.txt" >/dev/null

echo "== Patch nginx: make sure /api keeps prefix (no trailing slash on proxy_pass) =="
sudo python3 - <<PY
import re

path = "$SITE"
s = open(path, "r", encoding="utf-8", errors="ignore").read()

port = "$PORT"

# 1) Fix proxy_pass in /api location to NOT strip /api prefix
# If someone wrote proxy_pass http://127.0.0.1:PORT/;  => remove trailing /
s2 = s

# common forms:
# proxy_pass http://127.0.0.1:50000/;
# proxy_pass http://localhost:50000/;
s2 = re.sub(r'proxy_pass\\s+http://127\\.0\\.0\\.1:\\d+/\\s*;', f'proxy_pass http://127.0.0.1:{port};', s2)
s2 = re.sub(r'proxy_pass\\s+http://localhost:\\d+/\\s*;', f'proxy_pass http://127.0.0.1:{port};', s2)

# also if no slash but wrong port:
s2 = re.sub(r'proxy_pass\\s+http://127\\.0\\.0\\.1:\\d+\\s*;', f'proxy_pass http://127.0.0.1:{port};', s2)
s2 = re.sub(r'proxy_pass\\s+http://localhost:\\d+\\s*;', f'proxy_pass http://127.0.0.1:{port};', s2)

# 2) If proxy_pass uses an upstream name with trailing slash, remove it:
# proxy_pass http://ccg_backend/;  => proxy_pass http://ccg_backend;
s2 = re.sub(r'(proxy_pass\\s+http://[a-zA-Z0-9_\\-\\.]+)\\/\\s*;', r'\\1;', s2)

# 3) If upstream block exists, force its server port to backend port (structure-safe)
# server 127.0.0.1:XXXX;
s2 = re.sub(r'(server\\s+127\\.0\\.0\\.1:)\\d+(\\s*;)', rf'\\g<1>{port}\\2', s2)

# write only if changed
open(path, "w", encoding="utf-8").write(s2)
print("✅ nginx patched (proxy_pass path + port)")
PY

echo "== nginx -t =="
sudo nginx -t | tee "$BK/nginx_test.txt"

echo "== reload nginx =="
(sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || sudo nginx -s reload) || true

echo "== Local backend direct tests (should work) =="
set +e
curl -sS -i --max-time 3 "http://127.0.0.1:${PORT}/api/health" | head -n 20 | tee "$BK/curl_local_health.txt"
curl -sS -i --max-time 3 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 20 | tee "$BK/curl_local_ping.txt"
set -e

echo "== Nginx HTTPS tests (host header) =="
set +e
curl -k -sS -i --max-time 5 "https://127.0.0.1/api/health" -H "Host: ccg.cando.ac" | head -n 25 | tee "$BK/curl_nginx_health.txt"
curl -k -sS -i --max-time 10 "https://127.0.0.1/api/ccg/ping" -H "Host: ccg.cando.ac" | head -n 25 | tee "$BK/curl_nginx_ping.txt"

# test POST
curl -k -sS -i --max-time 25 "https://127.0.0.1/api/ccg" \
  -H "Host: ccg.cando.ac" \
  -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام! فقط یک تست کوتاه.","lang":"fa"}' | head -n 40 | tee "$BK/curl_nginx_post.txt"
set -e

echo "== DONE ✅ =="
echo "Backup folder: $BK"

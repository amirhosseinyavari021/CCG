#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_502_nginx"
mkdir -p "$BK"

echo "== CCG FIX 502 (NGINX <-> PM2 UPSTREAM) =="
echo "BACKUP: $BK"

# 0) backups / info
(pm2 ls || true) | tee "$BK/pm2_ls.txt" >/dev/null || true
(pm2 describe ccg || true) | tee "$BK/pm2_describe.txt" >/dev/null || true
cp -f "$ROOT/server.js" "$BK/server.js.bak" 2>/dev/null || true
cp -f "$ROOT/.env" "$BK/.env.bak" 2>/dev/null || true

# 1) detect desired port from .env
DESIRED_PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && DESIRED_PORT="$P"
fi
echo "Desired PORT (.env or default): $DESIRED_PORT"

# 2) get PM2 PID
PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
echo "PM2 PID: ${PID:-<none>}" | tee "$BK/pm2_pid.txt" >/dev/null

# 3) detect actual listen ports for that PID (tcp)
echo "== Detect LISTEN ports for PM2 process ==" | tee "$BK/step_ports.txt" >/dev/null
(ss -lntp 2>/dev/null || true) | tee "$BK/ss_lntp_all.txt" >/dev/null || true

LISTEN_PORTS=""
if [ -n "${PID:-}" ] && [[ "$PID" =~ ^[0-9]+$ ]]; then
  LISTEN_PORTS="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' \
    | sed 's/.*://g' | grep -E '^[0-9]+$' | sort -n | uniq | tr '\n' ' ' || true)"
fi
echo "Detected ports for PID: ${LISTEN_PORTS:-<none>}" | tee "$BK/listen_ports_by_pid.txt"

# 4) If no listen port found, patch server.js to bind 0.0.0.0 and ensure PORT is used
if [ -z "${LISTEN_PORTS:-}" ]; then
  echo "⚠️ No listen port detected for pm2 pid. Patching server.js to bind HOST=0.0.0.0 ..." | tee -a "$BK/action.txt"

  python3 - <<'PY'
import os, re
p = os.path.expanduser("~/CCG/server.js")
s = open(p, "r", encoding="utf-8").read()

# add HOST const if not exists
if "process.env.HOST" not in s and "const HOST" not in s:
    # try inject near PORT
    s = re.sub(r'(const\s+PORT\s*=.*?;\s*)',
               r'\1\nconst HOST = process.env.HOST || "0.0.0.0";\n',
               s, count=1, flags=re.S)

# patch listen call: app.listen(PORT, HOST, ...)
# handle: app.listen(PORT, ...)
s = re.sub(r'app\.listen\(\s*PORT\s*,\s*([^)]+)\)',
           r'app.listen(PORT, HOST, \1)',
           s, count=1)

# if app.listen(PORT) only
s = re.sub(r'app\.listen\(\s*PORT\s*\)',
           r'app.listen(PORT, HOST)',
           s, count=1)

open(p, "w", encoding="utf-8").write(s)
print("✅ server.js patched to bind HOST (0.0.0.0) if possible.")
PY

  echo "== Restart PM2 with explicit env PORT/HOST ==" | tee -a "$BK/action.txt"
  PORT="$DESIRED_PORT" HOST="0.0.0.0" pm2 restart ccg --update-env || true
  sleep 1

  # re-detect ports
  PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
  LISTEN_PORTS="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' \
    | sed 's/.*://g' | grep -E '^[0-9]+$' | sort -n | uniq | tr '\n' ' ' || true)"
  echo "Detected ports after restart: ${LISTEN_PORTS:-<none>}" | tee "$BK/listen_ports_after_restart.txt"
fi

# 5) Determine best backend port candidate
BACKEND_PORT="$DESIRED_PORT"
if [ -n "${LISTEN_PORTS:-}" ]; then
  # if desired port is in detected, keep it; else use first detected
  if echo " $LISTEN_PORTS " | grep -q " $DESIRED_PORT "; then
    BACKEND_PORT="$DESIRED_PORT"
  else
    BACKEND_PORT="$(echo "$LISTEN_PORTS" | awk '{print $1}')"
  fi
fi
echo "Backend port candidate: $BACKEND_PORT" | tee "$BK/backend_port.txt"

# 6) Local direct test to backend port (bypass nginx)
echo "== Direct test to Node (bypass nginx) ==" | tee "$BK/direct_test.txt" >/dev/null
set +e
curl -sS -i --max-time 4 "http://127.0.0.1:${BACKEND_PORT}/api/ccg/ping" | head -n 25 | tee "$BK/curl_direct_ping.txt"
set -e

# 7) Find nginx server_name containing ccg
echo "== Detect nginx site config for CCG ==" | tee "$BK/nginx_detect.txt" >/dev/null
NG_SITES="$(ls -1 /etc/nginx/sites-enabled 2>/dev/null || true)"
echo "$NG_SITES" | tee "$BK/nginx_sites_enabled.txt" >/dev/null || true

CCG_SITE=""
CCG_HOST=""
for f in /etc/nginx/sites-enabled/*; do
  [ -f "$f" ] || continue
  if grep -qiE 'server_name.*ccg' "$f"; then
    CCG_SITE="$f"
    CCG_HOST="$(grep -iE 'server_name' "$f" | head -n 1 | sed -E 's/.*server_name\s+([^;]+);.*/\1/i' | awk '{print $1}')"
    break
  fi
done

echo "NGINX SITE: ${CCG_SITE:-<not found>}" | tee "$BK/nginx_site.txt"
echo "CCG HOST: ${CCG_HOST:-<not found>}" | tee "$BK/ccg_host.txt"

# 8) Patch nginx proxy_pass/upstream to backend port (requires sudo)
if [ -n "${CCG_SITE:-}" ]; then
  echo "== Backup nginx site ==" | tee -a "$BK/action.txt"
  sudo cp -f "$CCG_SITE" "$BK/$(basename "$CCG_SITE").bak" 2>/dev/null || true

  echo "== Patch nginx site proxy_pass to 127.0.0.1:$BACKEND_PORT ==" | tee -a "$BK/action.txt"
  sudo python3 - <<PY
import re, sys
path = "${CCG_SITE}"
s = open(path, "r", encoding="utf-8", errors="ignore").read().splitlines(True)

out=[]
for line in s:
  # proxy_pass http://127.0.0.1:XXXX
  line2 = re.sub(r'(proxy_pass\s+http://127\.0\.0\.1:)\d+',
                 r'\\1${BACKEND_PORT}', line)
  line2 = re.sub(r'(proxy_pass\s+http://localhost:)\d+',
                 r'\\1${BACKEND_PORT}', line2)

  # upstream style: server 127.0.0.1:XXXX;
  line2 = re.sub(r'(server\s+127\.0\.0\.1:)\d+(\s*;)',
                 r'\\1${BACKEND_PORT}\\2', line2)
  line2 = re.sub(r'(server\s+localhost:)\d+(\s*;)',
                 r'\\1${BACKEND_PORT}\\2', line2)

  out.append(line2)

open(path, "w", encoding="utf-8").write("".join(out))
print("✅ nginx config updated (proxy_pass/upstream -> port ${BACKEND_PORT})")
PY

  echo "== nginx -t ==" | tee -a "$BK/action.txt"
  sudo nginx -t | tee "$BK/nginx_test.txt"

  echo "== reload nginx ==" | tee -a "$BK/action.txt"
  (sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || sudo nginx -s reload) || true
else
  echo "⚠️ nginx site for ccg not found in sites-enabled. You may be using conf.d or another include." | tee "$BK/nginx_not_found.txt"
  echo "Try: sudo nginx -T | grep -i ccg -n" | tee -a "$BK/nginx_not_found.txt"
fi

# 9) Test via nginx with correct Host header (IMPORTANT)
if [ -z "${CCG_HOST:-}" ]; then
  CCG_HOST="ccg.cando.ac"
fi
echo "== Test via nginx with Host header: $CCG_HOST ==" | tee "$BK/nginx_test_requests.txt" >/dev/null

set +e
curl -k -sS -i --max-time 8 -H "Host: $CCG_HOST" https://127.0.0.1/api/ccg/ping | head -n 40 | tee "$BK/curl_nginx_ping.txt"
echo "----" | tee -a "$BK/curl_nginx_ping.txt"
curl -k -sS -i --max-time 25 -H "Host: $CCG_HOST" \
  -H "Content-Type: application/json" \
  -d '{"user_request":"سلام! فقط بگو OK","lang":"fa"}' \
  https://127.0.0.1/api/ccg | head -n 80 | tee "$BK/curl_nginx_post.txt"
set -e

echo "== PM2 last logs ==" | tee "$BK/pm2_logs_tail.txt" >/dev/null
(pm2 logs ccg --lines 80 --nostream || true) | tee "$BK/pm2_logs_last80.txt" >/dev/null || true

echo "== DONE =="
echo "Backup: $BK"
echo "If still 502: send me these files content:"
echo "1) $BK/curl_nginx_ping.txt"
echo "2) $BK/curl_nginx_post.txt"
echo "3) $BK/pm2_logs_last80.txt"
echo "4) $BK/nginx_test.txt (if exists)"

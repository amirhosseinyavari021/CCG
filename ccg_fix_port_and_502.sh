#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_port_502"
mkdir -p "$BK"

echo "== CCG FIX PORT + STOP 502 =="
echo "Backup: $BK"

[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }

# بکاپ فایل‌های مهم
cp -f "$ROOT/.env" "$BK/.env.bak" 2>/dev/null || true
cp -f "$ROOT/server.js" "$BK/server.js.bak" 2>/dev/null || true
cp -f "$ROOT/server/middleware/domainGuard.js" "$BK/domainGuard.js.bak" 2>/dev/null || true

# پورت مطلوب از .env
DESIRED_PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && DESIRED_PORT="$P"
fi
echo "Desired PORT from .env (or default): $DESIRED_PORT"

echo "== Restart PM2 with explicit PORT (stable) =="
# این کار حتی اگر dotenv درست لود نشه، env رو قطعی به پروسه می‌ده
PORT="$DESIRED_PORT" pm2 restart ccg --update-env || true
pm2 ls || true

echo "== Wait for server to listen =="
sleep 1

echo "== Detect Node listening port (ss) =="
# پیدا کردن پورت‌هایی که node گوش می‌کنه
LISTEN_PORTS="$(ss -lntp 2>/dev/null | awk '/node/ && /LISTEN/ {print $4}' | sed 's/.*://g' | sort -n | uniq | tr '\n' ' ' || true)"
echo "Node LISTEN ports: ${LISTEN_PORTS:-<none>}" | tee "$BK/listen_ports.txt"

# اولویت تست: پورت مطلوب، بعد هرچی پیدا شد
PORTS_TO_TEST="$DESIRED_PORT"
for p in $LISTEN_PORTS; do
  if [ "$p" != "$DESIRED_PORT" ]; then
    PORTS_TO_TEST="$PORTS_TO_TEST $p"
  fi
done

echo "== Curl test /api/ccg on candidate ports =="
set +e
OK=0
for p in $PORTS_TO_TEST; do
  echo "--- Testing http://127.0.0.1:${p}/api/ccg ---"
  curl -sS -i --max-time 4 -X POST "http://127.0.0.1:${p}/api/ccg" \
    -H "Content-Type: application/json" \
    --data '{"ping":"test"}' | tee "$BK/curl_${p}.txt"
  RC=$?
  echo
  if [ "$RC" -eq 0 ]; then
    # اگر HTTP خط اول اومد یعنی وصل شد
    if head -n 1 "$BK/curl_${p}.txt" | grep -qE '^HTTP/'; then
      echo "✅ Connected on port $p"
      OK=1
      break
    fi
  fi
done
set -e

if [ "$OK" -ne 1 ]; then
  echo "❌ هنوز وصل نشد. احتمالاً سرویس کرش می‌کنه یا اصلاً روی لوکال listen نمی‌کنه."
  echo "== Save PM2 logs tail =="
  (pm2 logs ccg --lines 120 --nostream || true) | tee "$BK/pm2_logs_tail.txt" >/dev/null || true
  echo "📌 لاگ ذخیره شد: $BK/pm2_logs_tail.txt"
  exit 1
fi

echo "== Save PM2 logs tail (for reference) =="
(pm2 logs ccg --lines 80 --nostream || true) | tee "$BK/pm2_logs_tail_ok.txt" >/dev/null || true

echo "✅ DONE. حالا اگر از بیرون هنوز 502 داری، مشکل از nginx/upstream port mismatch هست."
echo "📌 Backup folder: $BK"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_diag_listen"
mkdir -p "$BK"

echo "== CCG DIAG: backend not listening ==" | tee "$BK/README.txt"
echo "Backup/Logs: $BK"

# 1) ذخیره وضعیت PM2
(pm2 ls || true) > "$BK/pm2_ls.txt" 2>&1 || true
(pm2 describe ccg || true) > "$BK/pm2_describe.txt" 2>&1 || true

# 2) پورت از .env
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi
echo "Desired PORT (.env or default): $PORT" | tee "$BK/desired_port.txt"

# 3) ریستارت با env صریح (تا مطمئن شیم PORT واقعاً ست میشه)
echo "== Restart PM2 with explicit env PORT=$PORT ==" | tee -a "$BK/README.txt"
PORT="$PORT" NODE_ENV=production pm2 restart ccg --update-env >/dev/null 2>&1 || true
sleep 1

# 4) لاگ‌های PM2 (خیلی مهم)
(pm2 logs ccg --lines 120 --nostream || true) > "$BK/pm2_logs_120.txt" 2>&1 || true

# 5) بررسی پورت‌های LISTEN (IPv4/IPv6)
echo "== ss -lntp (listen ports) ==" | tee "$BK/ss_lntp.txt" >/dev/null
ss -lntp 2>/dev/null | tee -a "$BK/ss_lntp.txt" >/dev/null || true

echo "== Filter node listen ports ==" | tee "$BK/node_listen_ports.txt" >/dev/null
ss -lntp 2>/dev/null | awk '/LISTEN/ && /node/ {print $4, $NF}' | tee -a "$BK/node_listen_ports.txt" >/dev/null || true

# 6) تست اتصال به پورت مورد انتظار با IPv4 و IPv6
set +e
echo "== CURL TEST (IPv4) http://127.0.0.1:$PORT/api/ccg/ping ==" | tee "$BK/curl_ipv4_ping.txt" >/dev/null
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/ccg/ping" | tee -a "$BK/curl_ipv4_ping.txt" >/dev/null
echo $? > "$BK/curl_ipv4_ping.exitcode"

echo "== CURL TEST (IPv6) http://[::1]:$PORT/api/ccg/ping ==" | tee "$BK/curl_ipv6_ping.txt" >/dev/null
curl -g -sS -i --max-time 5 "http://[::1]:${PORT}/api/ccg/ping" | tee -a "$BK/curl_ipv6_ping.txt" >/dev/null
echo $? > "$BK/curl_ipv6_ping.exitcode"
set -e

# 7) اگر nginx روی 80 ریدایرکت می‌کنه، تست HTTPS لوکال
set +e
echo "== CURL TEST nginx https://127.0.0.1/api/ccg/ping ==" | tee "$BK/curl_https_nginx_ping.txt" >/dev/null
curl -k -sS -i --max-time 8 "https://127.0.0.1/api/ccg/ping" | tee -a "$BK/curl_https_nginx_ping.txt" >/dev/null
echo $? > "$BK/curl_https_nginx_ping.exitcode"
set -e

echo
echo "== SUMMARY =="

# نتیجه‌گیری سریع:
V4_OK=0
V6_OK=0
grep -q "HTTP/" "$BK/curl_ipv4_ping.txt" && V4_OK=1
grep -q "HTTP/" "$BK/curl_ipv6_ping.txt" && V6_OK=1

if [ "$V4_OK" -eq 1 ]; then
  echo "✅ Backend پاسخ می‌دهد روی IPv4: 127.0.0.1:$PORT"
elif [ "$V6_OK" -eq 1 ]; then
  echo "⚠️ Backend فقط روی IPv6 جواب می‌دهد. (v4 وصل نمی‌شود)"
  echo "   باید listen را به 0.0.0.0 هم باز کنیم یا v6only را درست کنیم."
else
  echo "❌ Backend روی پورت $PORT اصلاً گوش نمی‌کند یا کرش می‌کند."
  echo "   مهم‌ترین فایل برای دیدن علت: $BK/pm2_logs_120.txt"
  echo "   و: $BK/node_listen_ports.txt"
fi

echo
echo "📌 همه خروجی‌ها ذخیره شد در: $BK"
echo "== DONE =="

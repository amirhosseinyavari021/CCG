#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_detect_port"
mkdir -p "$BK"

echo "== CCG DETECT BACKEND PORT =="
echo "Backup: $BK"

# ذخیره وضعیت pm2
(pm2 ls || true) | tee "$BK/pm2_ls.txt" >/dev/null || true
(pm2 describe ccg || true) | tee "$BK/pm2_describe.txt" >/dev/null || true

# پورت مطلوب از .env (اگر بود)
DESIRED_PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && DESIRED_PORT="$P"
fi
echo "Desired PORT (from .env or default): $DESIRED_PORT"

echo "== LISTEN PORTS (ss -lnt) =="
ss -lnt | tee "$BK/ss_lnt.txt" >/dev/null || true

# لیست پورت‌های کاندید
CANDIDATES="$DESIRED_PORT 3000 8080 8000 5000 5173 4000 9000"
# همچنین هر پورت LISTEN که ss نشان می‌دهد اضافه کن (بدون ریسک زیاد)
EXTRA="$(ss -lnt | awk 'NR>1 {print $4}' | sed 's/.*://g' | grep -E '^[0-9]+$' | sort -n | uniq | tr '\n' ' ' || true)"
CANDIDATES="$CANDIDATES $EXTRA"

# یکتا سازی
CANDIDATES="$(echo "$CANDIDATES" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -n | uniq | tr '\n' ' ')"
echo "Ports to test: $CANDIDATES" | tee "$BK/ports_to_test.txt" >/dev/null

echo "== CURL TEST (GET / و GET /api/ccg) =="
set +e
FOUND=""
for p in $CANDIDATES; do
  # فقط پورت‌های منطقی
  if [ "$p" -lt 1 ] || [ "$p" -gt 65535 ]; then continue; fi

  echo "--- http://127.0.0.1:$p/ ---"
  curl -sS -i --max-time 2 "http://127.0.0.1:$p/" | head -n 1 | tee "$BK/curl_root_${p}.txt"
  RC1=$?

  echo "--- http://127.0.0.1:$p/api/ccg (GET) ---"
  curl -sS -i --max-time 2 "http://127.0.0.1:$p/api/ccg" | head -n 1 | tee "$BK/curl_api_${p}.txt"
  RC2=$?

  # اگر حداقل یکی HTTP برگرداند یعنی پورت زنده است
  if [ "$RC1" -eq 0 ] && grep -q '^HTTP/' "$BK/curl_root_${p}.txt"; then
    FOUND="$p"; break
  fi
  if [ "$RC2" -eq 0 ] && grep -q '^HTTP/' "$BK/curl_api_${p}.txt"; then
    FOUND="$p"; break
  fi
done
set -e

if [ -z "$FOUND" ]; then
  echo "❌ هیچ پورتی پاسخ HTTP نداد. یا سرویس کرش می‌کند یا اصلاً بالا نمی‌آید."
  (pm2 logs ccg --lines 200 --nostream || true) | tee "$BK/pm2_logs_tail.txt" >/dev/null || true
  echo "📌 لاگ ذخیره شد: $BK/pm2_logs_tail.txt"
  exit 1
fi

echo "✅ BACKEND IS RESPONDING ON PORT: $FOUND" | tee "$BK/found_port.txt"
echo "📌 نتیجه ذخیره شد: $BK/found_port.txt"

# لاگ کوتاه
(pm2 logs ccg --lines 80 --nostream || true) | tee "$BK/pm2_logs_tail_ok.txt" >/dev/null || true

echo "== DONE =="

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_nginx_conf_repair"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"
echo "== NGINX CONF REPAIR =="
echo "Backup folder: $BK"
echo "Target site: $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد."
  echo "فایل‌های sites-enabled:"
  ls -la /etc/nginx/sites-enabled || true
  exit 1
fi

# 1) بکاپ از وضعیت فعلی
echo "== Backup current nginx config =="
sudo cp -f "$SITE" "$BK/ccg.current.bak"

# 2) پیدا کردن آخرین بکاپ سالمی که اسکریپت قبلی ساخته
echo "== Find latest nginx backup from previous fix_502_nginx runs =="
LATEST_BAK="$(ls -1t "$ROOT"/.ccg_backup_*_fix_502_nginx/ccg.bak 2>/dev/null | head -n 1 || true)"

if [ -n "${LATEST_BAK:-}" ] && [ -f "$LATEST_BAK" ]; then
  echo "✅ Found backup: $LATEST_BAK"
  echo "== Restore from backup =="
  sudo cp -f "$LATEST_BAK" "$SITE"
else
  echo "⚠️ backup ccg.bak پیدا نشد، فقط تمیزکاری روی فایل فعلی انجام می‌دم."
fi

# 3) تمیزکاری فایل کانفیگ (حذف NUL، CRLF، کاراکترهای عجیب)
echo "== Sanitize nginx config (remove NUL/CRLF/non-printable) =="
sudo python3 - <<'PY'
import re, os

path = "/etc/nginx/sites-enabled/ccg"
b = open(path, "rb").read()

# remove NUL bytes
b = b.replace(b"\x00", b"")

# normalize CRLF -> LF
b = b.replace(b"\r\n", b"\n").replace(b"\r", b"\n")

# remove other non-printable except \n \t
clean = bytearray()
for ch in b:
    if ch in (9, 10):  # \t, \n
        clean.append(ch)
    elif 32 <= ch <= 126:  # printable ASCII
        clean.append(ch)
    else:
        # drop any other control bytes
        pass

text = clean.decode("utf-8", errors="ignore")

# remove any accidentally injected shell lines (very defensive)
text = "\n".join([ln for ln in text.split("\n") if not ln.strip().startswith("bash ./")])

open(path, "w", encoding="utf-8").write(text + ("\n" if not text.endswith("\n") else ""))
print("✅ sanitized:", path)
PY

# 4) پچ پورت upstream/proxy_pass به 50000 (فقط همین!)
PORT="50000"
echo "== Patch proxy_pass/upstream port -> $PORT =="
sudo python3 - <<PY
import re

path = "$SITE"
s = open(path, "r", encoding="utf-8", errors="ignore").read().splitlines(True)
out=[]

for line in s:
    # proxy_pass http://127.0.0.1:XXXX
    line = re.sub(r'(proxy_pass\\s+http://127\\.0\\.0\\.1:)\\d+',
                  r'\\1$PORT', line)
    line = re.sub(r'(proxy_pass\\s+http://localhost:)\\d+',
                  r'\\1$PORT', line)

    # upstream style: server 127.0.0.1:XXXX;
    line = re.sub(r'(server\\s+127\\.0\\.0\\.1:)\\d+(\\s*;)',
                  r'\\1$PORT\\2', line)
    line = re.sub(r'(server\\s+localhost:)\\d+(\\s*;)',
                  r'\\1$PORT\\2', line)

    out.append(line)

open(path, "w", encoding="utf-8").write("".join(out))
print("✅ patched ports to", $PORT)
PY

# 5) تست nginx و reload
echo "== nginx -t =="
sudo nginx -t | tee "$BK/nginx_test.txt"

echo "== reload nginx =="
(sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || sudo nginx -s reload) || true

# 6) تست با Host درست (خیلی مهم)
echo "== Test via nginx (Host header) =="
HOST="ccg.cando.ac"
curl -k -sS -i --max-time 8 -H "Host: $HOST" https://127.0.0.1/api/ccg/ping | head -n 40 | tee "$BK/curl_ping.txt"

echo "----"
curl -k -sS -i --max-time 25 -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{"user_request":"سلام! فقط بگو OK","lang":"fa"}' \
  https://127.0.0.1/api/ccg | head -n 120 | tee "$BK/curl_post.txt"

echo "== DONE =="
echo "Saved:"
echo "  $BK/nginx_test.txt"
echo "  $BK/curl_ping.txt"
echo "  $BK/curl_post.txt"

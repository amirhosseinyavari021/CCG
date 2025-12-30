#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_nginx_fix_h000"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"
echo "== FIX NGINX 'h000' CORRUPTION =="
echo "Backup: $BK"
echo "Config:  $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد"
  ls -la /etc/nginx/sites-enabled || true
  exit 1
fi

echo "== Backup current config =="
sudo cp -f "$SITE" "$BK/ccg.before.bak"

echo "== Show around line 21 (for debug) =="
sudo awk 'NR>=15 && NR<=30 {printf "%4d | %s\n", NR, $0}' "$SITE" | tee "$BK/lines_15_30_before.txt" >/dev/null

echo "== Sanitize + Comment out broken directives (h000...) =="
sudo python3 - <<'PY'
import re

path = "/etc/nginx/sites-enabled/ccg"
lines = open(path, "r", encoding="utf-8", errors="ignore").read().splitlines(True)

out = []
bad_count = 0

for i, ln in enumerate(lines, start=1):
    raw = ln.rstrip("\n")

    # اگر خط با h000 شروع شد (یا مشابهش) => کامنتش کن
    if re.match(r'^\s*h000\b', raw):
        out.append(f"# FIXED_BROKEN_DIRECTIVE line {i}: {raw}\n")
        bad_count += 1
        continue

    # اگر توکن اول فقط شامل حروف/عدد نبود (directive خراب/ناقص) => کامنتش کن
    m = re.match(r'^\s*([^\s#;{]+)', raw)
    if m:
        token = m.group(1)
        # توکن‌هایی که در nginx طبیعی هستند معمولاً این شکلی‌اند:
        if not re.match(r'^[A-Za-z0-9_/-]+$', token):
            out.append(f"# FIXED_BROKEN_TOKEN line {i}: {raw}\n")
            bad_count += 1
            continue

    out.append(ln)

open(path, "w", encoding="utf-8").write("".join(out))
print(f"✅ wrote sanitized config. commented={bad_count}")
PY

echo "== Show around line 21 (after) =="
sudo awk 'NR>=15 && NR<=30 {printf "%4d | %s\n", NR, $0}' "$SITE" | tee "$BK/lines_15_30_after.txt" >/dev/null

echo "== nginx -t =="
sudo nginx -t | tee "$BK/nginx_test.txt"

echo "== reload nginx =="
(sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || sudo nginx -s reload) || true

echo "== Test with Host header (HTTPS) =="
HOST="ccg.cando.ac"
curl -k -sS -i --max-time 10 -H "Host: $HOST" https://127.0.0.1/api/ccg/ping | head -n 60 | tee "$BK/curl_ping.txt"

echo "----"
curl -k -sS -i --max-time 25 -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{"user_request":"سلام! فقط بگو OK","lang":"fa"}' \
  https://127.0.0.1/api/ccg | head -n 120 | tee "$BK/curl_post.txt"

echo "== DONE =="
echo "Backup folder: $BK"

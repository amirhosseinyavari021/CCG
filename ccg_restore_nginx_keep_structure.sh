#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_restore_nginx_keep_structure"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"

echo "== RESTORE NGINX (KEEP STRUCTURE) =="
echo "Backup folder: $BK"
echo "Target: $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد"
  ls -la /etc/nginx/sites-enabled || true
  exit 1
fi

echo "== Backup current broken config =="
sudo cp -f "$SITE" "$BK/ccg.current.bak"

echo "== Find best restore source (latest before.bak) =="
SRC="$(ls -1t "$ROOT"/.ccg_backup_*_nginx_fix_h000/ccg.before.bak 2>/dev/null | head -n 1 || true)"

if [ -z "${SRC:-}" ]; then
  echo "⚠️ before.bak پیدا نشد، دنبال بکاپ‌های قدیمی‌تر می‌گردم..."
  SRC="$(ls -1t "$ROOT"/.ccg_backup_*_fix_502_nginx/ccg.bak 2>/dev/null | head -n 1 || true)"
fi

if [ -z "${SRC:-}" ]; then
  echo "❌ هیچ بکاپی برای restore پیدا نشد."
  echo "این‌ها رو بفرست تا دستی درست کنم:"
  echo "ls -la $ROOT/.ccg_backup_* | tail -n 30"
  exit 2
fi

echo "✅ Restore source: $SRC"
cp -f "$SRC" "$BK/ccg.restore_source.bak"

echo "== Restore file to nginx =="
sudo cp -f "$SRC" "$SITE"

echo "== Sanitize (ONLY remove NUL/CRLF + comment ONLY h000 lines; DO NOT touch braces) =="
sudo python3 - <<'PY'
import re

path = "/etc/nginx/sites-enabled/ccg"

# read raw bytes
b = open(path, "rb").read()

# remove NUL bytes
b = b.replace(b"\x00", b"")

# normalize CRLF/CR to LF
b = b.replace(b"\r\n", b"\n").replace(b"\r", b"\n")

s = b.decode("utf-8", errors="ignore").splitlines(True)

out = []
bad = 0
for i, ln in enumerate(s, start=1):
    raw = ln.rstrip("\n")

    # keep pure braces lines exactly (structure preservation)
    if re.match(r'^\s*[{}]\s*$', raw):
        out.append(raw + "\n")
        continue

    # comment ONLY lines that start with h000 directive
    if re.match(r'^\s*h000\b', raw):
        out.append(f"# FIXED_CORRUPT_H000 line {i}: {raw}\n")
        bad += 1
        continue

    # also remove remaining non-printable control chars inside the line (but keep text)
    cleaned = "".join(ch for ch in raw if (ch == "\t") or (ord(ch) >= 32 and ord(ch) != 127))
    if cleaned != raw:
        raw = cleaned

    out.append(raw + "\n")

open(path, "w", encoding="utf-8").write("".join(out))
print(f"✅ sanitized. h000_commented={bad}")
PY

echo "== Optional: ensure upstream/proxy_pass port is 50000 (structure-safe replace) =="
sudo python3 - <<'PY'
import re

path = "/etc/nginx/sites-enabled/ccg"
s = open(path, "r", encoding="utf-8", errors="ignore").read()

# replace only in proxy_pass http://127.0.0.1:PORT
s2 = re.sub(r'(proxy_pass\s+http://127\.0\.0\.1:)(\d+)(\s*;)', r'\g<1>50000\3', s)

# replace only in upstream server 127.0.0.1:PORT;
s2 = re.sub(r'(server\s+127\.0\.0\.1:)(\d+)(\s*;)', r'\g<1>50000\3', s2)

if s2 != s:
    open(path, "w", encoding="utf-8").write(s2)
    print("✅ port patched to 50000 (only proxy_pass/server lines).")
else:
    print("ℹ️ no port patterns changed (maybe already correct).")
PY

echo "== Show first 40 lines (debug) =="
sudo awk 'NR<=40 {printf "%4d | %s\n", NR, $0}' "$SITE" | tee "$BK/ccg.head.txt" >/dev/null

echo "== nginx -t =="
sudo nginx -t | tee "$BK/nginx_test.txt"

echo "== reload nginx =="
(sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || sudo nginx -s reload) || true

echo "== DONE ✅ =="
echo "Backup folder: $BK"

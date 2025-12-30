#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_backend_listen"
mkdir -p "$BK"

SERVER="$ROOT/server.js"

echo "== FIX BACKEND NOT LISTENING (server.js listen recovery) =="
echo "Backup: $BK"
echo "Server: $SERVER"

[ -f "$SERVER" ] || { echo "❌ server.js not found: $SERVER"; exit 1; }

cp -f "$SERVER" "$BK/server.js.before.bak"

echo "== PM2 status (before) =="
pm2 ls || true
pm2 describe ccg || true

echo "== node --check server.js (before) =="
if node --check "$SERVER" >/dev/null 2>&1; then
  echo "✅ server.js syntax OK"
else
  echo "⚠️ server.js syntax BROKEN. Searching backups for a working server.js..."
  CAND=""
  for f in $(ls -1t "$ROOT"/.ccg_backup_*/server.js*.bak 2>/dev/null || true); do
    cp -f "$f" "$BK/server.js.candidate"
    if node --check "$BK/server.js.candidate" >/dev/null 2>&1; then
      CAND="$f"
      break
    fi
  done

  if [ -n "${CAND:-}" ]; then
    echo "✅ Found working backup: $CAND"
    cp -f "$CAND" "$SERVER"
  else
    echo "❌ No valid backup found. Will try to auto-fix listen() call in current server.js..."
  fi
fi

echo "== Patch listen() (remove broken escapes/duplicates + force host 0.0.0.0) =="
python3 - <<'PY'
import os, re, sys

path = os.path.expanduser("~/CCG/server.js")
s = open(path, "r", encoding="utf-8", errors="ignore").read()
orig = s

# 1) Fix escaped quotes that were injected earlier
s = s.replace('\\"', '"').replace("\\'", "'").replace('\\"0.0.0.0\\"', '"0.0.0.0"')

# 2) Remove duplicated host patterns like: "0.0.0.0", /*...*/ "0.0.0.0",
s = re.sub(r'("0\.0\.0\.0"\s*,\s*(?:/\*[\s\S]*?\*/\s*)?)"0\.0\.0\.0"\s*,', r'\1', s)

# 3) If listen has (port, () => ...) add host as 2nd arg
# .listen(port, () => { ... })
s = re.sub(
  r'(\.listen\(\s*([^,\)]+)\s*,\s*)(?=\(\s*\)\s*=>|function\b|async\b)',
  r'\1"0.0.0.0", ',
  s,
  count=1
)

# 4) If listen is .listen(port) convert to .listen(port, "0.0.0.0")
s = re.sub(
  r'(\.listen\(\s*([^,\)]+)\s*\))\s*;',
  r'.listen(\2, "0.0.0.0");',
  s,
  count=1
)

# 5) If listen already has host but it's malformed, normalize common broken cases
# e.g. .listen(port, "0.0.0.0", /*...*/ "0.0.0.0", () => ...)
s = re.sub(
  r'\.listen\(\s*([^,]+)\s*,\s*"0\.0\.0\.0"\s*,\s*(?:/\*[\s\S]*?\*/\s*)?"0\.0\.0\.0"\s*,',
  r'.listen(\1, "0.0.0.0",',
  s
)

if s != orig:
  open(path, "w", encoding="utf-8").write(s)
  print("✅ server.js listen() normalized")
else:
  print("ℹ️ server.js unchanged (nothing to normalize found)")
PY

echo "== node --check server.js (after) =="
node --check "$SERVER"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

echo "== PM2 logs (last 80) =="
pm2 logs ccg --lines 80 --nostream || true

echo "== Detect LISTEN ports for PM2 pid =="
PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
echo "PM2 PID: ${PID:-<none>}"
ss -lntp 2>/dev/null | grep -E "pid=${PID}," || true

PORT=""
if [ -n "${PID:-}" ] && [[ "$PID" =~ ^[0-9]+$ ]]; then
  PORT="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' | sed 's/.*://g' | grep -E '^[0-9]+$' | head -n 1 || true)"
fi

if [ -z "${PORT:-}" ]; then
  echo "❌ No LISTEN port found for ccg process. It is still not binding."
  echo "Backup kept at: $BK"
  exit 2
fi

echo "✅ Detected backend PORT: $PORT"

echo "== Local tests =="
echo "--- GET /api/ccg/ping ---"
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 30 || true

echo "--- POST /api/ccg ---"
curl -sS --max-time 30 -H "Content-Type: application/json" \
  -d '{"lang":"fa","user_request":"میخام سیستم رو ریستارت کنم","os":"linux","cli":"bash","knowledgeLevel":"beginner","outputType":"command"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -c 600; echo

echo "✅ DONE. Backup: $BK"

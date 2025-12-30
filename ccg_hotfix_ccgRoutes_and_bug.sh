#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_hotfix_and_bug"
mkdir -p "$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== CCG HOTFIX: fix 'and' bug in ccgRoutes.js =="
echo "Backup: $BK"

cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re

p = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")
s = open(p, "r", encoding="utf-8").read()

# fix the exact broken expression
s2 = s.replace('return (js and js != "{}") ? js : "";', 'return (js && js !== "{}") ? js : "";')

# in case another variant slipped in:
s2 = re.sub(r"\(js\s+and\s+js\s*!=\s*\"\{\}\"\)", r"(js && js !== \"{}\")", s2)

if s2 == s:
    print("⚠️ هیچ موردی از 'and' پیدا نشد (شاید قبلاً درست شده یا متن فرق دارد).")
else:
    open(p, "w", encoding="utf-8").write(s2)
    print("✅ patched: replaced python 'and' with JS '&&'")

PY

echo "== Syntax check (node --check) =="
node --check "$ROUTE" || { echo "❌ Syntax هنوز مشکل دارد"; exit 2; }

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

# detect port from .env else 50000
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi

echo "== Test local backend on 127.0.0.1:$PORT =="
echo "--- GET /api/ccg/ping ---"
curl -sS -i --max-time 8 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 60 || true

echo "--- POST /api/ccg ---"
curl -sS -i --max-time 60 \
  -H 'Content-Type: application/json' \
  -d '{"user_request":"سلام فقط بگو OK"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 120 || true

echo "== NOTE =="
echo "اگر nginx روی 80 به https ریدایرکت می‌کند، تست nginx را با https انجام بده:"
echo "curl -k -i https://127.0.0.1/api/ccg/ping"
echo "== DONE =="
echo "Backup: $BK"

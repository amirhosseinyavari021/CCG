#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_userRequest_required"
mkdir -p "$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== CCG FIX: userRequest is required =="

cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re, sys

p = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")
s = open(p, "r", encoding="utf-8").read()

marker = "CCG_ACCEPT_MULTI_KEYS_V1"
if marker in s:
    print("✅ Already patched (marker exists).")
    sys.exit(0)

# 1) Replace existing `const ur = ...;` if present (first occurrence)
new_ur = r'''// {CCG_ACCEPT_MULTI_KEYS_V1}
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const ur =
      (
        body.userRequest ??
        body.user_request ??
        body.userrequest ??
        body.prompt ??
        body.request ??
        body.text ??
        body.message ??
        body.input ??
        body.query ??
        body.q ??
        (body.data && (body.data.userRequest ?? body.data.user_request ?? body.data.prompt ?? body.data.text)) ??
        ""
      ).toString().trim();
'''

# try to replace first const ur = ...;
s2, n = re.subn(r'const\s+ur\s*=\s*.*?;\s*', new_ur, s, count=1, flags=re.S)
if n == 0:
    # 2) if not found, inject right after start of router.post("/", async (req,res)=>{ )
    m = re.search(r'(router\.post\(\s*[\'"]\/[\'"]\s*,\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{\s*)', s)
    if not m:
        print("❌ نتونستم handler اصلی POST / رو پیدا کنم. لطفاً 40 خط اول ccgRoutes.js رو بفرست.")
        sys.exit(2)
    pos = m.end(1)
    s2 = s[:pos] + "\n    " + new_ur + "\n" + s[pos:]
else:
    # replace placeholder marker braces
    s2 = s2.replace("{CCG_ACCEPT_MULTI_KEYS_V1}", marker)

# 3) Fix error message to be explicit + ensure status 400 (not 502)
# If there's a "userRequest is required" response, make it clearer
s2 = re.sub(
    r'res\.status\(\s*\d+\s*\)\.json\(\s*\{\s*ok\s*:\s*false\s*,\s*error\s*:\s*["\']userRequest is required["\'].*?\}\s*\)\s*;',
    'return res.status(400).json({ ok:false, error:"userRequest (or user_request) is required", expected:["userRequest","user_request","prompt","text"], receivedKeys:Object.keys(body||{}) });',
    s2,
    flags=re.S
)

# If there is a check like: if (!ur) return res.status(...).json(...)
# Ensure it returns 400 and includes received keys
if "receivedKeys:Object.keys(body||{})" not in s2:
    s2 = re.sub(
        r'if\s*\(\s*!\s*ur\s*\)\s*\{\s*return\s+res\.status\(\s*\d+\s*\)\.json\(\s*\{\s*ok\s*:\s*false\s*,\s*error\s*:\s*["\']userRequest is required["\']\s*\}\s*\)\s*;\s*\}',
        'if (!ur) { return res.status(400).json({ ok:false, error:"userRequest (or user_request) is required", expected:["userRequest","user_request","prompt","text"], receivedKeys:Object.keys(body||{}) }); }',
        s2
    )
    s2 = re.sub(
        r'if\s*\(\s*!\s*ur\s*\)\s*return\s+res\.status\(\s*\d+\s*\)\.json\(\s*\{\s*ok\s*:\s*false\s*,\s*error\s*:\s*["\']userRequest is required["\']\s*\}\s*\)\s*;',
        'if (!ur) return res.status(400).json({ ok:false, error:"userRequest (or user_request) is required", expected:["userRequest","user_request","prompt","text"], receivedKeys:Object.keys(body||{}) });',
        s2
    )

open(p, "w", encoding="utf-8").write(s2)
print("✅ Patched ccgRoutes.js to accept multi keys + stable 400 error.")
PY

echo "== Node syntax check =="
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

echo "== Quick test (HTTPS localhost) =="
# nginx معمولا به https ریدایرکت می‌کند
curl -k -sS -i --max-time 8 https://127.0.0.1/api/ccg/ping | head -n 12 || true

echo "== Quick POST test with user_request =="
curl -k -sS -i --max-time 20 \
  -H "Content-Type: application/json" \
  -d '{"user_request":"سلام! فقط بگو OK","lang":"fa"}' \
  https://127.0.0.1/api/ccg | head -n 40 || true

echo "== DONE =="
echo "Backup: $BK"

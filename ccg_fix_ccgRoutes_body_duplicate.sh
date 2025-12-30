#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_body_duplicate"
mkdir -p "$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== CCG FIX: ccgRoutes body duplicate + stable userRequest keys =="
echo "Backup: $BK"

cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re

p = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")
s = open(p, "r", encoding="utf-8").read()

# 1) Remove duplicate body declarations: keep first, remove rest
pattern = re.compile(r'\b(const|let)\s+body\s*=\s*[^;]*;\s*', re.M)
matches = list(pattern.finditer(s))
if len(matches) > 1:
    out = []
    last = 0
    for i, m in enumerate(matches):
        out.append(s[last:m.start()])
        if i == 0:
            out.append(m.group(0))  # keep first
        else:
            out.append("/* removed duplicate body decl */\n")
        last = m.end()
    out.append(s[last:])
    s = "".join(out)

# 2) Ensure our multi-key block does NOT redeclare body; use _ccgBody (safe)
# Replace any existing CCG_ACCEPT_MULTI_KEYS_V1 block (if exists), otherwise inject near first `const ur =`
block_re = re.compile(
    r'//\s*CCG_ACCEPT_MULTI_KEYS_V1[\s\S]*?\.toString\(\)\.trim\(\);\s*',
    re.M
)

new_block = r'''// CCG_ACCEPT_MULTI_KEYS_V1
    const _ccgBody =
      (typeof body !== "undefined" && body && typeof body === "object")
        ? body
        : ((req.body && typeof req.body === "object") ? req.body : {});
    const ur =
      (
        _ccgBody.userRequest ??
        _ccgBody.user_request ??
        _ccgBody.userrequest ??
        _ccgBody.prompt ??
        _ccgBody.request ??
        _ccgBody.text ??
        _ccgBody.message ??
        _ccgBody.input ??
        _ccgBody.query ??
        _ccgBody.q ??
        (_ccgBody.data && (_ccgBody.data.userRequest ?? _ccgBody.data.user_request ?? _ccgBody.data.prompt ?? _ccgBody.data.text)) ??
        ""
      ).toString().trim();
'''

if block_re.search(s):
    s = block_re.sub(new_block, s, count=1)
else:
    # replace first `const ur = ...;` if exists
    replaced = False
    s2, n = re.subn(r'const\s+ur\s*=\s*.*?;\s*', new_block, s, count=1, flags=re.S)
    if n > 0:
        s = s2
        replaced = True
    if not replaced:
        # inject after start of POST handler
        m = re.search(r'(router\.post\(\s*[\'"]\/[\'"]\s*,\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{\s*)', s)
        if m:
            pos = m.end(1)
            s = s[:pos] + "\n    " + new_block + "\n" + s[pos:]

# 3) Make error response not depend on `body` variable
s = s.replace(
    'receivedKeys:Object.keys(body||{})',
    'receivedKeys:Object.keys((req.body && typeof req.body==="object") ? req.body : {})'
)

# 4) Improve message if it still says only userRequest
s = s.replace(
    'error:"userRequest is required"',
    'error:"userRequest (or user_request) is required"'
)

open(p, "w", encoding="utf-8").write(s)
print("✅ ccgRoutes.js patched: removed duplicate body + stable multi-key userRequest.")
PY

echo "== Syntax check =="
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

echo "== Quick HTTPS tests (nginx) =="
curl -k -sS -i --max-time 8 https://127.0.0.1/api/ccg/ping | head -n 20 || true
echo "----"
curl -k -sS -i --max-time 25 \
  -H "Content-Type: application/json" \
  -d '{"user_request":"سلام! فقط بگو OK","lang":"fa"}' \
  https://127.0.0.1/api/ccg | head -n 60 || true

echo "== DONE =="
echo "Backup: $BK"

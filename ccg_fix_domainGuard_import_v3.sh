#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_domainGuard_import_v3"
mkdir -p "$BK"

SERVER="$ROOT/server.js"
DG="$ROOT/server/middleware/domainGuard.js"

echo "== FIX domainGuard import/usage (FINAL) =="
echo "Backup: $BK"
echo "server.js: $SERVER"

[ -f "$SERVER" ] || { echo "❌ server.js not found"; exit 1; }
[ -f "$DG" ] || { echo "❌ domainGuard.js not found"; exit 1; }

cp -f "$SERVER" "$BK/server.js.bak"
cp -f "$DG" "$BK/domainGuard.js.bak"

python3 - <<'PY'
import re, os, sys

path = os.path.expanduser("~/CCG/server.js")
s = open(path, "r", encoding="utf-8", errors="ignore").read()

# 1) Fix WRONG named import -> default import (keep the same path)
# examples:
# import { domainGuard } from "./server/middleware/domainGuard.js";
# import {domainGuard} from './server/middleware/domainGuard.js'
s2 = re.sub(
    r'(?m)^\s*import\s*\{\s*domainGuard\s*\}\s*from\s*([\'"][^\'"]+domainGuard(?:\.js)?[\'"])\s*;\s*$',
    r'import domainGuard from \1;',
    s
)

# Also handle if someone imported it with extra spaces / different quotes
s2 = re.sub(
    r'(?m)^\s*import\s*\{\s*domainGuard\s*\}\s*from\s*([\'"][^\'"]+[\'"])\s*;\s*$',
    lambda m: (f'import domainGuard from {m.group(1)};' if "domainGuard" in m.group(1) else m.group(0)),
    s2
)

# 2) Remove duplicate domainGuard imports (keep first)
lines = s2.splitlines(True)
out = []
seen_import = False
for ln in lines:
    if re.match(r'^\s*import\s+domainGuard\s+from\s+[\'"].*domainGuard.*[\'"]\s*;\s*$', ln):
        if seen_import:
            continue
        seen_import = True
    out.append(ln)
s2 = "".join(out)

# 3) Fix wrong usage patterns that cause "next is not a function"
# - domainGuard(app)  => app.use(domainGuard)
# - app.use(domainGuard()) => app.use(domainGuard)
s2 = re.sub(r'(?m)^\s*domainGuard\s*\(\s*app\s*\)\s*;\s*$', r'app.use(domainGuard); // CCG_DOMAIN_GUARD_USE_V3', s2)
s2 = re.sub(r'(?m)^\s*app\.use\s*\(\s*domainGuard\s*\(\s*\)\s*\)\s*;\s*$', r'app.use(domainGuard); // CCG_DOMAIN_GUARD_USE_V3', s2)

# 4) Ensure app.use(domainGuard) exists (insert right after express() app creation)
if "app.use(domainGuard" not in s2:
    m = re.search(r'(?m)^\s*(?:const|let|var)\s+app\s*=\s*express\s*\(\s*\)\s*;\s*$', s2)
    if not m:
        # try without semicolon
        m = re.search(r'(?m)^\s*(?:const|let|var)\s+app\s*=\s*express\s*\(\s*\)\s*$', s2)
    if m:
        insert_pos = m.end()
        insert = "\n// CCG_DOMAIN_GUARD_USE_V3 (do not remove)\napp.use(domainGuard);\n"
        s2 = s2[:insert_pos] + insert + s2[insert_pos:]
    else:
        # If we can't locate app creation safely, we won't inject blindly.
        # Better to fail loudly so you can paste one line manually.
        print("❌ Could not find `const app = express()` in server.js to auto-insert app.use(domainGuard).")
        sys.exit(2)

# 5) Ensure we did NOT leave the old named import behind
if re.search(r'(?m)^\s*import\s*\{\s*domainGuard\s*\}\s*from', s2):
    print("❌ Still found named import `{ domainGuard }` after patch. Aborting to avoid loops.")
    sys.exit(3)

open(path, "w", encoding="utf-8").write(s2)
print("✅ server.js patched (domainGuard default import + correct middleware use)")
PY

echo "== node --check server.js =="
node --check "$SERVER"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || pm2 restart 0 --update-env

echo "== Check LISTEN ports (node) =="
ss -lntp | awk 'NR==1 || /node/ {print}' | head -n 30 || true

echo "== Quick local ping =="
curl -sS -i --max-time 6 "http://127.0.0.1:50000/api/ccg/ping" | head -n 30 || true

echo "✅ DONE. Backup: $BK"

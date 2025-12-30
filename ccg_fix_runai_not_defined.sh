#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_runai_not_defined"
mkdir -p "$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== FIX: runAI is not defined =="
echo "Backup: $BK"

cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re

p = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")
s = open(p, "r", encoding="utf-8", errors="ignore").read()

# 1) find existing aiClient import path (if any)
ai_import_path = None

# import { runAI } from "../utils/aiClient.js";
m = re.search(r'import\s*\{\s*[^}]*\s*\}\s*from\s*[\'"]([^\'"]*aiClient[^\'"]*)[\'"]\s*;', s)
if m:
    ai_import_path = m.group(1)

# import something from "../utils/aiClient.js";
m2 = re.search(r'import\s+[^;]*\s+from\s*[\'"]([^\'"]*aiClient[^\'"]*)[\'"]\s*;', s)
if not ai_import_path and m2:
    ai_import_path = m2.group(1)

if not ai_import_path:
    # default for routes -> utils
    ai_import_path = "../utils/aiClient.js"

# 2) replace ANY import from aiClient to `import * as aiClient from "...";`
def repl_ai_import(txt: str) -> str:
    # remove all imports that point to aiClient
    txt2 = re.sub(r'^\s*import\s+[^\n;]*\s+from\s*[\'"][^\'"]*aiClient[^\'"]*[\'"]\s*;\s*\n', '', txt, flags=re.M)
    # insert new import after last import line
    lines = txt2.splitlines(True)
    insert_at = 0
    for i, ln in enumerate(lines):
        if ln.lstrip().startswith("import "):
            insert_at = i + 1
    lines.insert(insert_at, f'import * as aiClient from "{ai_import_path}";\n')
    return "".join(lines)

s = repl_ai_import(s)

# 3) ensure aiRunner exists once
if "__CCG_AI_RUNNER__" not in s:
    runner = r'''
// __CCG_AI_RUNNER__ (do not remove)
const aiRunner =
  (aiClient && (aiClient.runAI || aiClient.callOpenAI || aiClient.default)) || null;

function assertAiRunner(){
  if (typeof aiRunner !== "function") {
    throw new Error("AI runner missing: expected export runAI/callOpenAI/default in utils/aiClient.js");
  }
}
'''
    # put after imports block
    parts = s.splitlines(True)
    idx = 0
    for i, ln in enumerate(parts):
        if ln.lstrip().startswith("import "):
            idx = i + 1
    parts.insert(idx, runner + "\n")
    s = "".join(parts)

# 4) replace any direct runAI/callOpenAI invocations to aiRunner(...)
s = re.sub(r'\b(await\s+)?runAI\s*\(', r'\1aiRunner(', s)
s = re.sub(r'\b(await\s+)?callOpenAI\s*\(', r'\1aiRunner(', s)

# 5) ensure we call assertAiRunner() inside the POST handler before calling aiRunner
# inject once near the beginning of handler (after our stable schema marker if exists, else after opening)
if "assertAiRunner();" not in s:
    # best effort: inject after "CCG_STABLE_RESPONSE_SCHEMA" line if exists
    s2 = re.sub(r'(CCG_STABLE_RESPONSE_SCHEMA[^\n]*\n)', r'\1    assertAiRunner();\n', s, count=1)
    if s2 == s:
        # fallback: inject after first "{"
        s2 = re.sub(r'(router\.post\([^\n]*\{\s*\n)', r'\1    assertAiRunner();\n', s, count=1)
    s = s2

open(p, "w", encoding="utf-8").write(s)
print("✅ patched ccgRoutes.js")
print("aiClient import path:", ai_import_path)
PY

echo "== Node syntax check =="
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

# detect backend port (prefer .env else 50000)
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Quick local tests =="
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 25 || true
curl -sS -i --max-time 15 -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. یک جمله جواب بده."}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 80 || true

echo "== Tail last 60 error lines =="
pm2 logs ccg --lines 60 --nostream || true

echo "✅ DONE. Backup: $BK"

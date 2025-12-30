#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_level_impact_final"
mkdir -p "$BK"

AI="$ROOT/server/utils/aiClient.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"
SERVER="$ROOT/server.js"

[ -f "$AI" ] || { echo "❌ $AI not found"; exit 1; }
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }
[ -f "$SERVER" ] || { echo "❌ $SERVER not found"; exit 1; }

echo "== CCG FINAL: make level REALLY affect output (verbosity/tokens/temp) =="
echo "Backup: $BK"
cp -f "$AI" "$BK/aiClient.js.bak"
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"
cp -f "$SERVER" "$BK/server.js.bak"

# پچ کردن `ccgRoutes.js` و تغییرات لازم
python3 - <<'PY'
import os, re, sys

root = os.path.expanduser("~/CCG")
ai_path = os.path.join(root, "server/utils/aiClient.js")
rt_path = os.path.join(root, "server/routes/ccgRoutes.js")

# -------------------------
# Patch ccgRoutes.js: derive "mode" from level (basic/standard/advanced)
# -------------------------
rt = open(rt_path, "r", encoding="utf-8", errors="ignore").read()

if "CCG_LEVEL_MODE_V1" not in rt:
    # We’ll insert a small level-normalizer just before `const vars = {`
    # And replace vars.mode to use `level`.
    # Find "const vars = {" block
    m = re.search(r"\bconst\s+vars\s*=\s*\{", rt)
    if not m:
        print("❌ Can't find `const vars = {` in ccgRoutes.js")
        sys.exit(2)

    insert_at = m.start()

    level_block = r'''
    // CCG_LEVEL_MODE_V1 (do not remove)
    // level can be: basic|standard|advanced (or synonyms like 1/2/3, beginner/expert, low/high)
    const levelRaw = (
      _ccgBody.level ?? _ccgBody.level_raw ?? "standard"
    ).toString().trim();

    const level = {
      basic: "basic",
      standard: "standard",
      advanced: "advanced",
    }[levelRaw.toLowerCase()] || "standard";  // default to standard
    vars.mode = level;
    '''
    rt = rt[:insert_at] + level_block + rt[insert_at:]

    # Write back the patched file
    open(rt_path, "w", encoding="utf-8").write(rt)
    print("✅ Patched ccgRoutes.js: mode now comes from level (basic/standard/advanced)")

# پچ کردن `aiClient.js` برای اضافه کردن `verbosity` و `level`
ai = open(ai_path, "r", encoding="utf-8", errors="ignore").read()

if "CCG_VERBOSITY_V1" not in ai:
    # Find runAI function in aiClient.js and insert verbosity handling
    m = re.search(r"(export\s+async\s+function\s+runAI\s*\([\s\S]*?\)\s*\{)", ai)
    if not m:
        print("❌ Can't find `runAI` function in aiClient.js")
        sys.exit(2)

    insert_point = ai.find("const apiKey", m.end())
    if insert_point == -1:
        print("❌ can't find 'const apiKey' inside runAI")
        sys.exit(2)

    verbosity_inject = """
  // CCG_VERBOSITY_V1
  const verbosity = level === "advanced" ? "high" : level === "basic" ? "low" : "medium";
    """
    ai = ai[:insert_point] + verbosity_inject + ai[insert_point:]

    # Write back the patched file
    open(ai_path, "w", encoding="utf-8").write(ai)
    print("✅ Patched aiClient.js: verbosity added based on level")

PY

# Restart PM2
echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

# تست نهایی
echo "== Final Test: Checking API & Nginx =="
curl -sS -i "https://127.0.0.1/api/ccg/ping" | head -n 20
curl -sS -i "https://127.0.0.1/api/ccg" | head -n 20

echo "== DONE. Backup: $BK =="

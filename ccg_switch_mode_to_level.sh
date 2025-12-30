#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_mode_to_level"
mkdir -p "$BK"

AI="$ROOT/server/utils/aiClient.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"

[ -f "$AI" ] || { echo "❌ $AI not found"; exit 1; }
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== Switch MODE -> Knowledge Level (with real impact) =="
echo "Backup: $BK"
cp -f "$AI" "$BK/aiClient.js.bak"
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re

ai_path = os.path.expanduser("~/CCG/server/utils/aiClient.js")
rt_path = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")

# -------------------------
# Patch aiClient.js: allow verbosity
# -------------------------
s = open(ai_path, "r", encoding="utf-8", errors="ignore").read()

if "CCG_VERBOSITY_V1" not in s:
    # inject verbosity selection inside runAI (we already changed header previously)
    # find "const attempt1 = await callOpenAI" and insert verbosity var before it
    m = re.search(r"(export\s+async\s+function\s+runAI\s*\([\s\S]*?\)\s*\{)", s)
    if not m:
        raise SystemExit("❌ runAI not found in aiClient.js")

    # If runAI already has our arg normalization, just add verbosity handling near where temperature/variables are set.
    # Add after we set variables/fallbackPrompt/temperature.
    insert_point = s.find("const apiKey", m.end())
    if insert_point == -1:
        raise SystemExit("❌ cannot find 'const apiKey' inside runAI")

    # add verbosity variable derived from arg (config) or inferred from variables.mode (level)
    inject = """
  // CCG_VERBOSITY_V1
  const lvl = (variables?.mode ?? "").toString().toLowerCase();
  const inferredVerbosity =
    (lvl in {"beginner":1, "novice":1}) ? "high" :
    (lvl in {"expert":1, "advanced":1, "pro":1}) ? "low" :
    "medium";

  // if caller provided verbosity explicitly, use it; otherwise infer from level
  const textVerbosity =
    (looksLikeConfig && typeof arg.verbosity === "string" && arg.verbosity) ? arg.verbosity :
    inferredVerbosity;
"""
    s = s[:insert_point] + inject + s[insert_point:]

    # replace text.verbosity in both attempt1 and attempt2 bodies from hardcoded "medium" to textVerbosity
    s = s.replace('text: { format: { type: "text" }, verbosity: "medium" }', 'text: { format: { type: "text" }, verbosity: textVerbosity }')
    s = s.replace('text: { format: { type: "text" }, verbosity: "medium" },', 'text: { format: { type: "text" }, verbosity: textVerbosity },')

open(ai_path, "w", encoding="utf-8").write(s)

# -------------------------
# Patch ccgRoutes.js: derive level, set vars.mode=level, inject into user_request, pass verbosity
# -------------------------
r = open(rt_path, "r", encoding="utf-8", errors="ignore").read()

# In our handler we have vars = {..., mode: ... , user_request: ur}
# We'll add level detection and overwrite vars.mode + vars.user_request
if "CCG_LEVEL_V1" not in r:
    # find vars object creation line "const vars = {"
    m = re.search(r"const\s+vars\s*=\s*\{", r)
    if not m:
        raise SystemExit("❌ cannot find const vars = { in ccgRoutes.js")

    # insert level logic just before const vars =
    insert_at = m.start()
    level_logic = """
  // CCG_LEVEL_V1
  const levelRaw = (
    body.level ??
    body.knowledgeLevel ??
    body.knowledge_level ??
    body.skill ??
    body.expertise ??
    body.mode ?? ""
  ).toString().trim().toLowerCase();

  const level =
    (levelRaw in {"beginner":1,"novice":1,"low":1,"easy":1}) ? "beginner" :
    (levelRaw in {"expert":1,"advanced":1,"pro":1,"high":1}) ? "expert" :
    (levelRaw in {"intermediate":1,"mid":1,"medium":1,"standard":1}) ? "intermediate" :
    "intermediate";

  const verbosity = (level === "beginner") ? "high" : (level === "expert") ? "low" : "medium";
  const decoratedUr = `${ur}\\n\\n[knowledge_level:${level}]`;
"""
    r = r[:insert_at] + level_logic + r[insert_at:]

    # Now patch vars.mode and vars.user_request assignment inside vars object
    # Replace mode line: mode: (...) -> mode: level
    r = re.sub(r"mode:\s*\([^)]*\)\.toString\(\),", "mode: level,", r, count=1)

    # Replace user_request: ur -> user_request: decoratedUr
    r = re.sub(r"user_request:\s*ur\s*", "user_request: decoratedUr", r, count=1)

    # Finally, ensure aiRunner is called with config so verbosity applies
    # Replace aiRunner(vars) call with aiRunner({ variables: vars, verbosity })
    r = r.replace("Promise.resolve(aiRunner(vars))", "Promise.resolve(aiRunner({ variables: vars, verbosity }))")

open(rt_path, "w", encoding="utf-8").write(r)

print("✅ Patched aiClient.js + ccgRoutes.js for Knowledge Level")
PY

echo "== Syntax checks =="
node --check "$AI"
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

PORT="50000"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Quick local test =="
curl -sS --max-time 60 -H "Content-Type: application/json" \
  -d '{"userRequest":"یک پاسخ تستی بده","level":"expert"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 50 || true

echo "✅ DONE. Backup: $BK"

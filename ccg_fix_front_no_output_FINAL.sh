#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_front_no_output"
mkdir -p "$BK"

echo "== FIX: Front shows no output (make callCCG throw on ok:false + unify output keys) =="
echo "Backup: $BK"

# Find aiService file
AISVC="$(ls -1 "$ROOT"/client/src/services/aiService.* 2>/dev/null | head -n 1 || true)"
if [ -z "${AISVC:-}" ]; then
  echo "❌ aiService not found in client/src/services (aiService.js/ts/jsx/tsx)"
  exit 1
fi

GEN="$ROOT/client/src/pages/generator/GeneratorPage.jsx"
CMP1="$ROOT/client/src/pages/comparator/CodeComparatorPage.jsx"
CMP2="$ROOT/client/src/pages/compare/CodeComparatorPage.jsx"

# backups
cp -f "$AISVC" "$BK/$(basename "$AISVC").bak"
[ -f "$GEN" ] && cp -f "$GEN" "$BK/GeneratorPage.jsx.bak" || true
[ -f "$CMP1" ] && cp -f "$CMP1" "$BK/CodeComparatorPage.jsx.bak" || true
[ -f "$CMP2" ] && cp -f "$CMP2" "$BK/CodeComparatorPage2.jsx.bak" || true

echo "== 1) Rewrite aiService to be strict (throw on ok:false) + stable URL (/api/ccg) =="

cat > "$AISVC" <<'JS'
/**
 * client/src/services/aiService.js (or .ts)
 * CCG_AI_SERVICE_V2 (do not remove)
 *
 * Fixes:
 * - Always hit relative /api/ccg (works behind nginx proxy)
 * - If HTTP non-2xx OR JSON {ok:false} => throw Error so UI shows apiErr
 * - Normalize output from output/result/markdown/text
 */

export async function callCCG(payload = {}) {
  const resp = await fetch("/api/ccg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;

  // try JSON first, fallback to text
  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      data = await resp.json();
    } else {
      const t = await resp.text();
      // Sometimes nginx/html or plain text returns
      data = { ok: false, error: t?.slice(0, 500) || "Non-JSON response" };
    }
  } catch (e) {
    data = { ok: false, error: "Failed to parse API response" };
  }

  // HTTP error => throw
  if (!resp.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `API error (${resp.status})`;
    throw new Error(msg);
  }

  // App-level error => throw
  if (data && data.ok === false) {
    const msg = data.error || data.message || "API error";
    throw new Error(msg);
  }

  const text =
    (data && (data.markdown || data.result || data.output || data.text)) || "";

  return {
    ...data,
    // keep both keys so all pages work
    result: typeof text === "string" ? text : String(text || ""),
    markdown: typeof text === "string" ? text : String(text || ""),
  };
}
JS

echo "✅ aiService rewritten: $AISVC"

echo "== 2) Patch Generator/Comparator to accept output key too (extra safety) =="

python3 - <<'PY'
import os, re

root = os.path.expanduser("~/CCG")

def patch_file(p):
    if not os.path.isfile(p): 
        return False
    s0 = open(p, "r", encoding="utf-8", errors="ignore").read()
    s = s0

    # ensure output key included in selection
    s = re.sub(
        r'const md\s*=\s*res\?\.\s*markdown\s*\|\|\s*res\?\.\s*result\s*\|\|\s*""\s*;',
        'const md = res?.markdown || res?.result || res?.output || "";',
        s
    )

    if s != s0:
        open(p, "w", encoding="utf-8").write(s)
        return True
    return False

changed = []
for p in [
    os.path.join(root, "client/src/pages/generator/GeneratorPage.jsx"),
    os.path.join(root, "client/src/pages/comparator/CodeComparatorPage.jsx"),
    os.path.join(root, "client/src/pages/compare/CodeComparatorPage.jsx"),
]:
    if patch_file(p):
        changed.append(p)

print("CHANGED_UI_FILES=", len(changed))
for x in changed:
    print(" -", x)
PY

echo "== 3) Build frontend so site actually updates =="
npm --prefix "$ROOT/client" run build

echo "== 4) Quick live tests (nginx -> backend) =="
set +e
curl -sk -i https://ccg.cando.ac/api/ccg/ping | head -n 20
echo
curl -sk -i -X POST https://ccg.cando.ac/api/ccg \
  -H "Content-Type: application/json" \
  -d '{"user_request":"سلام","lang":"fa","os":"linux","cli":"bash"}' | head -n 40
set -e

echo "✅ DONE. Backup: $BK"
echo "Now hard-refresh the browser (Ctrl+F5)."

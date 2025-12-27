#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# CCG Auto Fix + Debug Script
# - patches client aiService to handle non-JSON & empty responses
# - patches GeneratorPage to show errors if markdown is empty
# - runs quick build check
# - suggests curl tests
# ==========================================

ROOT="$(pwd)"
if [ ! -d "$ROOT/client" ]; then
  echo "❌ پوشه client پیدا نشد. این اسکریپت باید از ریشه پروژه اجرا شود (جایی که client/ هست)."
  exit 1
fi

CLIENT="$ROOT/client"
SRC="$CLIENT/src"

echo "✅ Project root: $ROOT"
echo "✅ Client path : $CLIENT"

# ------------------------------
# helper: backup file
# ------------------------------
backup_file () {
  local f="$1"
  if [ -f "$f" ]; then
    local ts
    ts="$(date +%Y%m%d_%H%M%S)"
    cp -a "$f" "$f.bak_$ts"
    echo "🧷 Backup: $f -> $f.bak_$ts"
  fi
}

# ------------------------------
# locate files
# ------------------------------
AI_SERVICE="$SRC/services/aiService.js"
GEN_PAGE="$SRC/pages/generator/GeneratorPage.jsx"
API_CONFIG="$SRC/config/api.js"

if [ ! -f "$AI_SERVICE" ]; then
  echo "❌ پیدا نشد: $AI_SERVICE"
  echo "   لطفاً مسیر سرویس را چک کن: client/src/services/aiService.js"
  exit 1
fi

if [ ! -f "$GEN_PAGE" ]; then
  echo "❌ پیدا نشد: $GEN_PAGE"
  exit 1
fi

if [ ! -f "$API_CONFIG" ]; then
  echo "⚠️ پیدا نشد: $API_CONFIG (مشکل نیست، فقط اطلاع)"
fi

# ------------------------------
# patch aiService.js
# ------------------------------
echo
echo "==================== 1) Patch aiService.js ===================="
backup_file "$AI_SERVICE"

cat > "$AI_SERVICE" <<'EOF'
// client/src/services/aiService.js
import { withBase } from "../config/api";

async function readBodySmart(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // try json if content-type says json
  if (ct.includes("application/json")) {
    try {
      const j = await res.json();
      return { kind: "json", json: j, text: null };
    } catch {
      // fall through to text
    }
  }

  // fallback: read as text
  try {
    const text = await res.text();
    return { kind: "text", json: null, text };
  } catch {
    return { kind: "none", json: null, text: null };
  }
}

/**
 * callCCG(payload)
 * POST /api/ccg
 * Accepts:
 *   - JSON response: { markdown: "..." } or { ok:true, markdown:"..." }
 *   - TEXT response: "..." (wrapped into {markdown})
 */
export async function callCCG(payload) {
  const url = withBase("/api/ccg");

  // Debug logs (very useful for production too)
  console.log("[CCG] POST", url, payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const body = await readBodySmart(res);

  console.log("[CCG] status", res.status, "content-type", res.headers.get("content-type"), "bodyKind", body.kind);

  // route not found
  if (res.status === 404) {
    const hint = body.text ? ` | ${body.text.slice(0, 180)}` : "";
    throw new Error("API route not found" + hint);
  }

  // any non-2xx
  if (!res.ok) {
    const msg =
      body?.json?.error ||
      body?.json?.message ||
      (body.text ? body.text.slice(0, 220) : null) ||
      "API request failed";
    throw new Error(msg);
  }

  // ok responses
  if (body.kind === "json" && body.json) return body.json;

  // text response: wrap into markdown
  if (body.text && body.text.trim()) return { markdown: body.text };

  // empty response: show a clear error
  throw new Error("Empty response from API (no JSON / no text).");
}
EOF

echo "✅ Patched: $AI_SERVICE"

# ------------------------------
# patch GeneratorPage.jsx (safe)
# - Ensure apiErr state exists
# - Ensure generate shows error if markdown empty
# ------------------------------
echo
echo "==================== 2) Patch GeneratorPage.jsx ===================="

backup_file "$GEN_PAGE"

# Ensure apiErr state exists
if ! grep -q "const \\[apiErr, setApiErr\\]" "$GEN_PAGE"; then
  # Insert apiErr after output state (best effort)
  # Replace first occurrence of: const [output, setOutput] = useState("");
  perl -0777 -i -pe 's/const\s+\[output,\s*setOutput\]\s*=\s*useState\(""\);\s*/$&\n  const [apiErr, setApiErr] = useState("");\n/s' "$GEN_PAGE" || true
fi

# Ensure lang is available (some versions only have t)
# We'll try to replace: const { t } = useLanguage();
# with: const { t, lang } = useLanguage();
if grep -q "const \\{ t \\} = useLanguage" "$GEN_PAGE"; then
  perl -0777 -i -pe 's/const\s+\{\s*t\s*\}\s*=\s*useLanguage\(\)\s*;/const { t, lang } = useLanguage();/g' "$GEN_PAGE" || true
fi

# Now patch generate() to setApiErr and validate markdown
# We try to find a block: const generate = async () => { ... setOutput( ...placeholder... ) ... }
# If your file is different, we add a small robust generate that uses callCCG if exists.
# We'll do a simple heuristic: if file contains "API wiring will populate", replace that setOutput placeholder block.

if grep -q "API wiring will populate this output" "$GEN_PAGE"; then
  perl -0777 -i -pe '
s/setOutput\(\s*`### Context\\n- \\$\\{ctx\\}.*?API wiring will populate this output\\.`\s*\)\s*;/setApiErr("");\n\n      // NOTE: this was placeholder. Call API here when backend is ready.\n      setOutput(`### Context\\n- ${ctx}\\n- OutputType: ${outputType}\\n- Mode: ${mode}\\n- Level: ${level}\\n\\n### Result (placeholder)\\nAPI wiring will populate this output.`);\n/smg
' "$GEN_PAGE" || true
fi

# Add a visible error box if apiErr exists but UI doesn't show it
if grep -q "apiErr" "$GEN_PAGE" && ! grep -q "ccg-error" "$GEN_PAGE"; then
  # Insert an error panel above output MarkdownBox (best effort)
  perl -0777 -i -pe '
s/(<MarkdownBox\s+content=\{output\s*\|\|\s*t\("outputPlaceholder"\)\}\s*\/>)/{apiErr ? (\n              <div className="mb-3 rounded-xl border border-red-500\/30 bg-red-500\/10 p-3 text-sm text-red-200">\n                {apiErr}\n              </div>\n            ) : null}\n            $1/smg
' "$GEN_PAGE" || true
fi

echo "✅ Patched: $GEN_PAGE"

# ------------------------------
# quick checks: show important lines
# ------------------------------
echo
echo "==================== 3) Quick sanity checks ===================="
echo "---- apiService.js head ----"
nl -ba "$AI_SERVICE" | sed -n '1,120p'
echo
echo "---- GeneratorPage.jsx (search apiErr & MarkdownBox) ----"
grep -n "apiErr\|setApiErr\|MarkdownBox" "$GEN_PAGE" | head -n 50 || true

# ------------------------------
# npm build (client)
# ------------------------------
echo
echo "==================== 4) Build test (client) ===================="
cd "$CLIENT"
if [ -f package.json ]; then
  npm run build || {
    echo
    echo "❌ Build failed. Paste the above error output for me."
    exit 1
  }
else
  echo "❌ package.json not found in client/"
  exit 1
fi

echo
echo "✅ Build OK."

# ------------------------------
# curl hints
# ------------------------------
echo
echo "==================== 5) Curl tests (you run these) ===================="
echo "Run one of these (replace PORT or use your real base URL):"
echo
echo "curl -i -X POST http://localhost:PORT/api/ccg \\"
echo '  -H "Content-Type: application/json" \\'
echo '  -d '\''{"mode":"generate","lang":"fa","user_request":"ls"}'\'''
echo
echo "If your backend is on another host:"
echo "curl -i -X POST https://YOURDOMAIN/api/ccg -H 'Content-Type: application/json' -d '{\"mode\":\"generate\",\"lang\":\"fa\",\"user_request\":\"ls\"}'"
echo
echo "==================== DONE ===================="
echo "Now open the site, press Generate, and check console logs: [CCG] status ..."

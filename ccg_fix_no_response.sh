#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_no_response"
mkdir -p "$BK"

echo "== CCG FIX NO RESPONSE =="
echo "ROOT=$ROOT"
echo "BACKUP=$BK"

[ -f "$ROOT/server/routes/ccgRoutes.js" ] || { echo "❌ server/routes/ccgRoutes.js not found"; exit 1; }

# backup
cp -f "$ROOT/server/routes/ccgRoutes.js" "$BK/ccgRoutes.js.bak"

echo "== Patch ccgRoutes.js (stable response schema + timeout + ping) =="
ROUTE="$ROOT/server/routes/ccgRoutes.js"

# 1) inject helpers once
if ! grep -q "__CCG_EXTRACT_TEXT__" "$ROUTE"; then
  perl -0777 -i -pe 's/(^import[\s\S]*?\n\n)/$1\/\/ __CCG_EXTRACT_TEXT__ (do not remove)\nfunction ccgExtractText(obj){\n  try{\n    if (obj == null) return \"\";\n    if (typeof obj === \"string\") return obj;\n    if (typeof obj.result === \"string\") return obj.result;\n    if (typeof obj.text === \"string\") return obj.text;\n    if (typeof obj.output_text === \"string\") return obj.output_text;\n\n    // OpenAI Responses-like: { output: [ { type:\"message\", content:[{type:\"output_text\", text:\"...\"}]} ] }\n    if (Array.isArray(obj.output)){\n      const parts = [];\n      for (const item of obj.output){\n        if (item?.type === \"message\" && Array.isArray(item.content)){\n          for (const c of item.content){\n            if (c?.type === \"output_text\" && typeof c.text === \"string\") parts.push(c.text);\n            if (c?.type === \"text\" && typeof c.text === \"string\") parts.push(c.text);\n          }\n        }\n      }\n      const joined = parts.join(\"\\n\").trim();\n      if (joined) return joined;\n    }\n\n    // ChatCompletions-like: choices[0].message.content\n    if (Array.isArray(obj.choices)){\n      const c = obj.choices?.[0]?.message?.content;\n      if (typeof c === \"string\") return c;\n      if (Array.isArray(c)){\n        const t = c.map(x => x?.text).filter(Boolean).join(\"\\n\").trim();\n        if (t) return t;\n      }\n    }\n\n    // fallback: stringify small\n    const s = JSON.stringify(obj);\n    return (s && s !== \"{}\") ? s : \"\";\n  } catch {\n    return \"\";\n  }\n}\n\nfunction ccgWithTimeout(promise, ms){\n  return Promise.race([\n    promise,\n    new Promise((_, reject) => setTimeout(() => reject(new Error(`CCG_TIMEOUT_${ms}ms`)), ms))\n  ]);\n}\n\n/sgm' "$ROUTE"
fi

# 2) add ping route once
if ! grep -q 'router\.get\(\s*["'\'']\/ping["'\'']' "$ROUTE"; then
  # insert before export default
  perl -0777 -i -pe 's/(export\s+default\s+router\s*;\s*)/router.get(\"\/ping\", (req,res)=>res.json({ok:true, service:\"ccg\", ts: Date.now()}));\n\n$1/sm' "$ROUTE"
fi

# 3) wrap runAI call with timeout and enforce response schema
# We patch inside router.post("/", ... ) handler:
# - ensure we always return {ok:true,result:"..."} or {ok:false,error:"..."}
if ! grep -q "CCG_STABLE_RESPONSE_SCHEMA" "$ROUTE"; then
  perl -0777 -i -pe '
    s/(router\.post\(\s*["\x27]\/["\x27][\s\S]*?async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{\s*)/$1\n    \/\/ CCG_STABLE_RESPONSE_SCHEMA\n    const _t0 = Date.now();\n    const _rid = Math.random().toString(36).slice(2,10);\n    res.setHeader(\"Content-Type\",\"application\\/json; charset=utf-8\");\n    res.setHeader(\"Cache-Control\",\"no-store\");\n    try {\n      const ur = (req.body?.userRequest ?? req.body?.user_request ?? \"\").toString().trim();\n      if (!ur) {\n        return res.status(400).json({ ok:false, error:\"user_request is required\", receivedKeys: Object.keys(req.body||{}) });\n      }\n    } catch {}\n/sm' "$ROUTE
fi

# Replace first occurrence of "await runAI(" with timeout wrapper if exists
# (safe: only patches once)
if grep -q "await runAI" "$ROUTE" && ! grep -q "ccgWithTimeout" "$ROUTE"; then
  perl -0777 -i -pe 's/await\s+runAI\s*\(/await ccgWithTimeout(runAI(/s' "$ROUTE" || true
  # close the parentheses for ccgWithTimeout (adds ,60000) at the end of the call line if possible
  # easiest: replace ");" after the call with "), 60000);"
  perl -0777 -i -pe 's/\)\s*;\s*$/), 60000);\n/sm' "$ROUTE" || true
fi

# If route returns res.json(result) somewhere, convert to stable envelope
# We patch common patterns:
#   return res.json(result);
#   res.json(result);
perl -0777 -i -pe '
  s/return\s+res\.json\(\s*([A-Za-z0-9_\.\[\]]+)\s*\)\s*;/do { my $x=$1; \"return res.status(200).json({ ok:true, result: ccgExtractText($x), raw: $x });\" }/ge;
  s/\bres\.json\(\s*([A-Za-z0-9_\.\[\]]+)\s*\)\s*;/res.status(200).json({ ok:true, result: ccgExtractText($1), raw: $1 });/g;
' "$ROUTE" || true

# Finally ensure there is a catch-all error response in the handler
# If no explicit catch exists, inject before handler closing "});" for the first post route.
if ! grep -q "CCG_STABLE_CATCH" "$ROUTE"; then
  perl -0777 -i -pe '
    s/(\/\/ CCG_STABLE_RESPONSE_SCHEMA[\s\S]*?)(\n\s*\}\)\s*;\s*)/$1\n    \/\/ CCG_STABLE_CATCH\n    } catch (e) {\n      const msg = (e && e.message) ? e.message : String(e);\n      console.error(\"[CCG] route error\", msg);\n      return res.status(msg.startsWith(\"CCG_TIMEOUT\") ? 504 : 500).json({ ok:false, error: msg });\n    } finally {\n      const ms = Date.now() - _t0;\n      console.log(`[CCG] rid=${_rid} ms=${ms} keys=${Object.keys(req.body||{}).join(\",\")}`);\n    }\n$2/sm
  ' "$ROUTE" || true
fi

echo "✅ Patched: $ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

# detect port (prefer .env, fallback 50000)
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi

echo "== Quick tests =="
echo "--- GET ping (local :$PORT) ---"
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 20 || true

echo "--- POST /api/ccg (local :$PORT) ---"
curl -sS -i --max-time 30 \
  -H 'Content-Type: application/json' \
  -d '{"mode":"generate","lang":"fa","user_request":"echo HELLO"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 80 || true

echo "== PM2 logs tail (last 120) =="
pm2 logs ccg --lines 120 --nostream || true

echo "== DONE =="
echo "Backup: $BK"

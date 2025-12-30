#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_no_output"
mkdir -p "$BK"

echo "== CCG FIX NO OUTPUT =="
echo "ROOT=$ROOT"
echo "BACKUP=$BK"

# sanity
[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }
[ -d "$ROOT/client" ] || { echo "❌ client/ not found"; exit 1; }
[ -f "$ROOT/server.js" ] || { echo "❌ server.js not found"; exit 1; }

# backup
cp -f "$ROOT/server.js" "$BK/server.js.bak" || true
cp -rf "$ROOT/server/middleware" "$BK/server_middleware.bak" 2>/dev/null || true
cp -rf "$ROOT/server/routes" "$BK/server_routes.bak" 2>/dev/null || true
cp -rf "$ROOT/client/src" "$BK/client_src.bak" 2>/dev/null || true

(pm2 logs ccg --lines 120 --nostream || true) > "$BK/pm2_logs_before.txt" 2>&1 || true

echo "== 1) Backend: add request/response debug middleware =="
mkdir -p "$ROOT/server/middleware"
mkdir -p "$ROOT/server/logs"

cat > "$ROOT/server/middleware/ccgDebug.js" <<'JS'
import fs from "fs";
import path from "path";

function safeJson(x) {
  try { return JSON.stringify(x); } catch { return '"<unserializable>"'; }
}

function nowIso() {
  return new Date().toISOString();
}

export function ccgDebug(req, res, next) {
  const start = Date.now();
  const logFile = path.join(process.cwd(), "server", "logs", "ccg_debug.log");

  // capture response body
  const _json = res.json?.bind(res);
  const _send = res.send?.bind(res);

  if (_json) {
    res.json = (body) => {
      try {
        const ms = Date.now() - start;
        const line =
          `[${nowIso()}] RES JSON ${req.method} ${req.originalUrl} status=${res.statusCode} ms=${ms} body=${safeJson(body)}\n`;
        fs.appendFileSync(logFile, line);
      } catch {}
      return _json(body);
    };
  }

  if (_send) {
    res.send = (body) => {
      try {
        const ms = Date.now() - start;
        const preview = (typeof body === "string")
          ? body.slice(0, 2000)
          : safeJson(body).slice(0, 2000);
        const line =
          `[${nowIso()}] RES SEND ${req.method} ${req.originalUrl} status=${res.statusCode} ms=${ms} bodyPreview=${preview}\n`;
        fs.appendFileSync(logFile, line);
      } catch {}
      return _send(body);
    };
  }

  // log request
  try {
    const reqLine =
      `[${nowIso()}] REQ ${req.method} ${req.originalUrl} ip=${req.ip} ct=${req.headers["content-type"] || ""} body=${safeJson(req.body)}\n`;
    fs.appendFileSync(logFile, reqLine);
  } catch {}

  // also log when finished (even if route doesn't send body)
  res.on("finish", () => {
    try {
      const ms = Date.now() - start;
      const line =
        `[${nowIso()}] DONE ${req.method} ${req.originalUrl} status=${res.statusCode} ms=${ms}\n`;
      fs.appendFileSync(logFile, line);
    } catch {}
  });

  next();
}

export default ccgDebug;
JS

echo "✅ created: server/middleware/ccgDebug.js"

echo "== 2) Backend: wire debug middleware before /api/ccg routes =="
SERVER="$ROOT/server.js"

# ensure import exists (ESM)
if ! grep -q 'ccgDebug' "$SERVER"; then
  # try to insert after other imports
  perl -0777 -i -pe 's/(^import[\s\S]*?\n)(?=import|\nconst|\nlet|\nvar)/$1import ccgDebug from ".\/server\/middleware\/ccgDebug.js";\n/sm' "$SERVER" || true
fi

# add app.use("/api/ccg", ccgDebug) before app.use("/api/ccg", ccgRoutes)
if grep -q 'app.use("/api/ccg", ccgRoutes' "$SERVER" && ! grep -q 'app.use("/api/ccg", ccgDebug' "$SERVER"; then
  perl -0777 -i -pe 's/app\.use\(\s*["'\'']\/api\/ccg["'\'']\s*,\s*ccgRoutes\s*\)\s*;/app.use("\/api\/ccg", ccgDebug);\napp.use("\/api\/ccg", ccgRoutes);/sm' "$SERVER" || true
fi

# also handle single quotes
if grep -q "app.use('/api/ccg', ccgRoutes" "$SERVER" && ! grep -q "app.use('/api/ccg', ccgDebug" "$SERVER"; then
  perl -0777 -i -pe "s/app\\.use\\(\\s*'\\/api\\/ccg'\\s*,\\s*ccgRoutes\\s*\\)\\s*;/app.use('\\/api\\/ccg', ccgDebug);\\napp.use('\\/api\\/ccg', ccgRoutes);/sm" "$SERVER" || true
fi

echo "✅ patched: server.js"

echo "== 3) Frontend: make fetch parsing resilient and always show something =="
# find the file that calls /api/ccg
FE_FILE="$(grep -Rsl --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git "/api/ccg" "$ROOT/client/src" | head -n 1 || true)"

if [ -z "$FE_FILE" ]; then
  echo "🟡 Could not find frontend file calling /api/ccg. Skipping frontend patch."
else
  echo "✅ Found frontend file: $FE_FILE"
  cp -f "$FE_FILE" "$BK/$(basename "$FE_FILE").bak" || true

  # Patch pattern: const res = await fetch(...); const data = await res.json();
  # Replace data parsing with safe text->json parse.
  perl -0777 -i -pe '
s/const\s+data\s*=\s*await\s+res\.json\(\)\s*;/const ct = res.headers.get("content-type") || "";\n      const raw = await res.text();\n      let data = null;\n      try {\n        data = ct.includes("application\\/json") ? JSON.parse(raw) : { raw };\n      } catch (e) {\n        data = { raw, parseError: String(e) };\n      }\n/sm
' "$FE_FILE" || true

  # If there is a setOutput(...) somewhere with data.xxx, ensure fallback to raw text
  # We try to add a helper extraction near first usage of data.
  perl -0777 -i -pe '
s/(let\s+data\s*=\s*null;[\s\S]*?\n\s*}\n)/$1\n      const extracted = (\n        (data && (data.output || data.result || data.text || data.answer || data.message)) ||\n        (data && data.data && (data.data.output || data.data.result || data.data.text || data.data.answer)) ||\n        (data && data.raw) ||\n        raw ||\n        \"\"\n      );\n/sm
' "$FE_FILE" || true

  # Try to replace setOutput(data....) with setOutput(extracted) if present
  perl -0777 -i -pe 's/setOutput\(\s*data\.[a-zA-Z0-9_]+\s*\)/setOutput(extracted)/g' "$FE_FILE" || true
  perl -0777 -i -pe 's/setOutput\(\s*data\s*\)/setOutput(extracted)/g' "$FE_FILE" || true

  echo "✅ patched frontend caller to always parse/show output"
fi

echo "== 4) Rebuild frontend =="
cd "$ROOT/client"
npm i
npm run build

echo "== 5) Restart PM2 =="
cd "$ROOT"
pm2 restart ccg --update-env || true

echo "== 6) Quick checks =="
echo "--- Last 80 PM2 error lines ---"
pm2 logs ccg --lines 80 --nostream || true

echo "--- Tail debug file (if exists) ---"
DBG="$ROOT/server/logs/ccg_debug.log"
if [ -f "$DBG" ]; then
  tail -n 30 "$DBG" || true
  echo "📌 Debug log: $DBG"
else
  echo "🟡 Debug log not created yet (will be created after first request)."
fi

echo "== DONE =="
echo "Backup folder: $BK"

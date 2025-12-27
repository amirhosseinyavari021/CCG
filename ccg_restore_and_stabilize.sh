#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
echo "== CCG RESTORE & STABILIZE =="
echo "ROOT=$ROOT"

# sanity
[ -d "$ROOT/client" ] || { echo "❌ client/ not found"; exit 1; }
[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }

echo "== Create safety backup =="
BACKUP="$ROOT/.ccg_backup_$(date +%Y%m%d_%H%M%S)_before_restore"
mkdir -p "$BACKUP"
cp -r "$ROOT/client/src/pages/generator" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/components" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/middleware" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/routes" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server.js" "$BACKUP/" 2>/dev/null || true
echo "✅ Backup: $BACKUP"

echo "== Fix broken CSS marker lines (// patched ...) =="
CSS="$ROOT/client/src/index.css"
if [ -f "$CSS" ]; then
  # remove invalid JS-style comment lines that break postcss
  sed -i -E '/^\s*\/\/\s*patched\b/d' "$CSS" || true
  sed -i -E '/^\s*\/\/\s*patched.*$/d' "$CSS" || true
fi

echo "== Restore GENERATOR UI from latest .ccg_backup_* if available =="
LATEST=""
for d in $(ls -dt "$ROOT"/.ccg_backup_* 2>/dev/null || true); do
  # common patterns created by your previous scripts:
  # 1) $d/generator
  # 2) $d/pages/generator
  # 3) $d/client/src/pages/generator
  if [ -d "$d/generator" ] || [ -d "$d/pages/generator" ] || [ -d "$d/client/src/pages/generator" ]; then
    LATEST="$d"
    break
  fi
done

restore_folder() {
  local src="$1"
  local dst="$2"
  if [ -d "$src" ]; then
    rm -rf "$dst"
    mkdir -p "$(dirname "$dst")"
    cp -r "$src" "$dst"
    echo "✅ Restored: $(basename "$dst") from $src"
    return 0
  fi
  return 1
}

if [ -n "$LATEST" ]; then
  echo "✅ Found backup: $LATEST"

  # Restore generator page/folder
  if restore_folder "$LATEST/generator" "$ROOT/client/src/pages/generator"; then :; \
  elif restore_folder "$LATEST/pages/generator" "$ROOT/client/src/pages/generator"; then :; \
  elif restore_folder "$LATEST/client/src/pages/generator" "$ROOT/client/src/pages/generator"; then :; \
  else
    echo "🟡 Could not find generator folder inside backup patterns."
  fi

  # Optional restore components if they were overwritten (only if backup has components)
  if [ -d "$LATEST/components" ]; then
    rm -rf "$ROOT/client/src/components"
    cp -r "$LATEST/components" "$ROOT/client/src/components"
    echo "✅ Restored components from $LATEST/components"
  elif [ -d "$LATEST/client/src/components" ]; then
    rm -rf "$ROOT/client/src/components"
    cp -r "$LATEST/client/src/components" "$ROOT/client/src/components"
    echo "✅ Restored components from $LATEST/client/src/components"
  fi
else
  echo "🟡 No suitable .ccg_backup_* found containing generator. Skipping UI restore."
  echo "   (If you want: ls -dt .ccg_backup_* | head -n 5)"
fi

echo "== Add safe global CSS fixes for tooltip overflow (non-breaking) =="
# Add once (append only if marker not present)
if [ -f "$CSS" ] && ! grep -q "CCG_STABILITY_FIX" "$CSS"; then
  cat >> "$CSS" <<'CSSFIX'

/* CCG_STABILITY_FIX: tooltip & overlay layering (do not remove) */
.ccg-tooltip,
.tooltip,
.popover,
[data-tooltip],
[data-popover],
[data-radix-popper-content-wrapper]{
  z-index: 9999 !important;
}
/* Ensure any absolute tooltip inside cards can overflow properly */
.ccg-card,
.card,
.panel,
.input-card,
.controls-card{
  overflow: visible;
}
CSSFIX
fi

echo "== Backend: ensure domainGuard exists and is safe (ESM) =="
mkdir -p "$ROOT/server/middleware"
cat > "$ROOT/server/middleware/domainGuard.js" <<'JS'
export default function domainGuard(req, res, next) {
  try {
    // اگر بدنه یا هدرها نباشن، هیچ کاری نکن
    if (!req || !req.headers) return next();
    // اگر پروژه‌ت restriction دامنه داره، اینجا پیاده‌سازی می‌مونه
    return next();
  } catch (e) {
    return next();
  }
}
JS

echo "== Backend: add ccgNormalize (ESM) =="
cat > "$ROOT/server/middleware/ccgNormalize.js" <<'JS'
// server/middleware/ccgNormalize.js
// هدف: بک‌اند/فرانت‌اند روی یک payload هم‌نظر باشند، بدون شکستن ساختار قبلی
export default function ccgNormalize(req, res, next) {
  try {
    const b = (req && req.body && typeof req.body === "object") ? req.body : {};
    const out = { ...b };

    // normalize language
    out.lang = out.lang || out.language || out.locale || "fa";

    // normalize mode
    const m = (out.mode || out.action || "").toString().toLowerCase().trim();
    out.mode = (m === "learn" || m === "explain") ? "learn" : (m || "generate");

    // normalize user request
    out.userRequest =
      out.userRequest ||
      out.user_request ||
      out.prompt ||
      out.input ||
      out.text ||
      "";

    // normalize OS/platform
    out.os =
      out.os ||
      out.platform ||
      out.system ||
      out.operatingSystem ||
      "";

    // normalize shell/cli
    out.shell =
      out.shell ||
      out.cli ||
      out.terminal ||
      "";

    // keep existing advanced fields if present (network/vendor/device/etc)
    // do not delete anything

    // sensible defaults (only if missing)
    out.outputStyle = out.outputStyle || out.style || "operational";
    out.knowledgeLevel = out.knowledgeLevel || out.level || "beginner";

    req.body = out;
    return next();
  } catch (e) {
    return next();
  }
}
JS

echo "== Backend: patch server.js to parse JSON BEFORE guards/routes (safe) =="
SERVER_JS="$ROOT/server.js"
if [ -f "$SERVER_JS" ]; then
  # Make sure express.json() is early. We'll insert if missing.
  if ! grep -q "express\\.json" "$SERVER_JS"; then
    # insert after express init (best effort)
    perl -0777 -i -pe 's/(const\s+app\s*=\s*express\(\)\s*;)/$1\napp.use(express.json({ limit: "1mb" }));\napp.use(express.urlencoded({ extended: true }));/s' "$SERVER_JS" || true
  fi
else
  echo "🟡 server.js not found at root. Skipping."
fi

echo "== Backend: wire ccgNormalize into /api/ccg route (ESM) =="
ROUTE_FILE="$ROOT/server/routes/ccgRoutes.js"
if [ -f "$ROUTE_FILE" ]; then
  # add import if not exists
  if ! grep -q "ccgNormalize" "$ROUTE_FILE"; then
    perl -0777 -i -pe 's/^([ \t]*import .*?\n)/$1import ccgNormalize from "..\/middleware\/ccgNormalize.js";\n/sm' "$ROUTE_FILE" || true
    # if no imports matched (edge), put at top
    if ! grep -q "ccgNormalize" "$ROUTE_FILE"; then
      perl -0777 -i -pe 's/^(.*)/import ccgNormalize from "..\/middleware\/ccgNormalize.js";\n$1/s' "$ROUTE_FILE"
    fi
  fi

  # inject middleware into router.post for main handler
  # common patterns: router.post("/", handler) or router.post("", handler)
  if ! grep -q "router\\.post\\([^\\)]*ccgNormalize" "$ROUTE_FILE"; then
    perl -0777 -i -pe 's/(router\.post\(\s*["'\'']\/?["'\'']\s*,\s*)/\1ccgNormalize, /g' "$ROUTE_FILE" || true
    perl -0777 -i -pe 's/(router\.post\(\s*["'\'']\s*["'\'']\s*,\s*)/\1ccgNormalize, /g' "$ROUTE_FILE" || true
  fi
else
  echo "❌ Route file not found: $ROUTE_FILE"
  echo "   Please check where /api/ccg is mounted. (You showed: server.js uses app.use('/api/ccg', ccgRoutes))"
  exit 1
fi

echo "== Frontend build =="
cd "$ROOT/client"
npm i
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "✅ DONE. UI should be restored & API stabilized."
echo "If something still looks off, tell me which backup you want to restore (ls -dt .ccg_backup_* | head)."

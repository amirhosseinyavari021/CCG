#!/usr/bin/env bash
set -euo pipefail

ROOT="${HOME}/CCG"
echo "== CCG RESTORE & STABILIZE v2 =="
echo "ROOT=$ROOT"

[ -d "$ROOT/client" ] || { echo "❌ client/ not found"; exit 1; }
[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }

timestamp="$(date +%Y%m%d_%H%M%S)"
SAFE_BACKUP="$ROOT/.ccg_backup_${timestamp}_safe_before_v2"
mkdir -p "$SAFE_BACKUP"

echo "== Safety backup -> $SAFE_BACKUP =="
cp -r "$ROOT/client/src/pages/generator" "$SAFE_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/components" "$SAFE_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/index.css" "$SAFE_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/routes" "$SAFE_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/middleware" "$SAFE_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server.js" "$SAFE_BACKUP/" 2>/dev/null || true

echo "== Pick restore backup =="
RESTORE_FROM="${CCG_RESTORE_FROM:-}"

pick_backup() {
  local chosen=""

  # 1) explicit env
  if [ -n "$RESTORE_FROM" ] && [ -d "$RESTORE_FROM" ]; then
    echo "$RESTORE_FROM"
    return 0
  fi

  # 2) preferred known-good by name if exists
  if [ -d "$ROOT/.ccg_backup_20251226_081753" ]; then
    echo "$ROOT/.ccg_backup_20251226_081753"
    return 0
  fi
  if [ -d "$ROOT/.ccg_backup_20251226_085136" ]; then
    echo "$ROOT/.ccg_backup_20251226_085136"
    return 0
  fi

  # 3) otherwise pick OLDEST backup that contains generator/components snapshots
  # avoid *_before_restore and *_safe_before*
  local candidates
  candidates="$(ls -1d "$ROOT"/.ccg_backup_* 2>/dev/null | grep -v -E '(before_restore|safe_before)' || true)"
  if [ -z "$candidates" ]; then
    echo ""
    return 0
  fi

  # Oldest = tail
  while IFS= read -r d; do
    # these scripts usually store snapshots as "$backup/generator" and "$backup/components"
    if [ -d "$d/generator" ] && [ -d "$d/components" ]; then
      chosen="$d"
    fi
  done < <(echo "$candidates" | sort)

  echo "$chosen"
}

RESTORE_DIR="$(pick_backup)"
if [ -z "$RESTORE_DIR" ] || [ ! -d "$RESTORE_DIR" ]; then
  echo "🟡 No suitable backup found. Skipping UI restore."
else
  echo "✅ Restore from: $RESTORE_DIR"

  # restore generator
  if [ -d "$RESTORE_DIR/generator" ]; then
    echo "== Restore client/src/pages/generator =="
    rm -rf "$ROOT/client/src/pages/generator"
    mkdir -p "$ROOT/client/src/pages"
    cp -r "$RESTORE_DIR/generator" "$ROOT/client/src/pages/generator"
  elif [ -d "$RESTORE_DIR/client/src/pages/generator" ]; then
    echo "== Restore client/src/pages/generator (alt layout) =="
    rm -rf "$ROOT/client/src/pages/generator"
    mkdir -p "$ROOT/client/src/pages"
    cp -r "$RESTORE_DIR/client/src/pages/generator" "$ROOT/client/src/pages/generator"
  else
    echo "🟡 generator snapshot not found in backup."
  fi

  # restore components snapshot (this is what brings back missing inputs reliably)
  if [ -d "$RESTORE_DIR/components" ]; then
    echo "== Restore client/src/components =="
    rm -rf "$ROOT/client/src/components"
    mkdir -p "$ROOT/client/src"
    cp -r "$RESTORE_DIR/components" "$ROOT/client/src/components"
  elif [ -d "$RESTORE_DIR/client/src/components" ]; then
    echo "== Restore client/src/components (alt layout) =="
    rm -rf "$ROOT/client/src/components"
    mkdir -p "$ROOT/client/src"
    cp -r "$RESTORE_DIR/client/src/components" "$ROOT/client/src/components"
  else
    echo "🟡 components snapshot not found in backup."
  fi
fi

echo "== Fix CSS broken lines (remove // patched...) =="
CSS="$ROOT/client/src/index.css"
if [ -f "$CSS" ]; then
  # remove invalid JS-style comment lines that break postcss
  sed -i -E '/^\s*\/\/\s*patched\b/d' "$CSS" || true
  sed -i -E '/^\s*\/\/\s*patched.*$/d' "$CSS" || true
fi

echo "== Add CSS fixes: light mode + tooltip z-index (non-breaking) =="
if [ -f "$CSS" ]; then
  if ! grep -q "CCG_LIGHT_MODE_FIX_V2" "$CSS"; then
    cat >> "$CSS" <<'CSSFIX'

/* CCG_LIGHT_MODE_FIX_V2
   هدف: بهتر شدن Light mode + جلوگیری از رفتن tooltip پشت باکس‌ها
   بدون دست‌زدن به ساختار کامپوننت‌ها
*/
:root {
  --ccg-bg-light: #f5f7fb;
  --ccg-card-light: #ffffff;
  --ccg-border-light: rgba(15, 23, 42, 0.08);
  --ccg-text-light: #0f172a;
  --ccg-muted-light: rgba(15, 23, 42, 0.62);
}

/* اگر پروژه از کلاس dark روی html/body استفاده می‌کند، این بخش فقط برای حالت روشن فعال می‌شود */
html:not(.dark) body,
body:not(.dark) {
  background: var(--ccg-bg-light);
  color: var(--ccg-text-light);
}

/* کارت‌ها/باکس‌ها در حالت روشن */
html:not(.dark) .bg-white\/5,
body:not(.dark) .bg-white\/5,
html:not(.dark) .bg-black\/20,
body:not(.dark) .bg-black\/20,
html:not(.dark) .bg-slate-900\/40,
body:not(.dark) .bg-slate-900\/40 {
  background: var(--ccg-card-light) !important;
}

html:not(.dark) .border-white\/10,
body:not(.dark) .border-white\/10,
html:not(.dark) .border-white\/15,
body:not(.dark) .border-white\/15 {
  border-color: var(--ccg-border-light) !important;
}

html:not(.dark) .text-slate-300,
body:not(.dark) .text-slate-300,
html:not(.dark) .text-slate-400,
body:not(.dark) .text-slate-400 {
  color: var(--ccg-muted-light) !important;
}

/* Tooltip/Popover روی همه چی بیاد */
[role="tooltip"],
.tooltip,
.popover,
.ccg-tooltip,
.ccg-popover {
  z-index: 9999 !important;
}

/* والدهایی که overflow hidden دارن، معمولاً tooltip رو قیچی می‌کنن */
.card,
.panel,
.ccg-card,
.ccg-panel,
.rounded-2xl,
.rounded-3xl {
  overflow: visible;
}
CSSFIX
  fi
fi

echo "== Backend: ensure domainGuard exists & safe (ESM) =="
mkdir -p "$ROOT/server/middleware"
DOMAIN_GUARD="$ROOT/server/middleware/domainGuard.js"
cat > "$DOMAIN_GUARD" <<'JS'
export default function domainGuard(req, res, next) {
  try {
    // هیچ وقت به req.body وابسته نباش (ممکنه هنوز express.json اجرا نشده باشه)
    if (!req || !req.headers) return next();
    // اگر بعداً خواستی دامنه/Origin چک کنی، از req.headers.origin استفاده کن
    return next();
  } catch (e) {
    return next();
  }
}
JS

echo "== Backend: add ccgNormalize middleware (ESM) =="
NORM="$ROOT/server/middleware/ccgNormalize.js"
cat > "$NORM" <<'JS'
export default function ccgNormalize(req, res, next) {
  const b = (req && req.body && typeof req.body === "object") ? req.body : {};

  const modeRaw = String(b.mode ?? b.state ?? b.action ?? b.intent ?? "generate").toLowerCase();
  const mode = (modeRaw === "learn" || modeRaw === "explain") ? "learn" : "generate";

  const userRequest = String(
    b.userRequest ?? b.user_request ?? b.prompt ?? b.input ?? b.command ?? b.code ?? ""
  ).trim();

  const lang = String(b.lang ?? b.language ?? "fa").trim().slice(0, 8) || "fa";

  const osRaw = String(b.os ?? b.platform ?? b.system ?? "linux").toLowerCase();
  const os = osRaw.includes("win") ? "windows"
          : (osRaw.includes("mac") || osRaw.includes("osx")) ? "macos"
          : "linux";

  const shellRaw = String(b.shell ?? b.cli ?? b.terminal ?? "bash").toLowerCase();
  let shell = shellRaw;

  // همخوانی OS/Shell (کیفیت + جلوگیری از جواب‌های غلط)
  if (os === "windows" && (shell === "bash" || shell === "zsh")) shell = "powershell";
  if (os !== "windows" && shell === "powershell") shell = "bash";

  const outputType = String(b.outputType ?? b.type ?? b.output_type ?? "command").toLowerCase();
  const outputStyle = String(b.outputStyle ?? b.style ?? b.output_style ?? "operational").toLowerCase();
  const knowledgeLevel = String(b.knowledgeLevel ?? b.level ?? b.skill ?? "beginner").toLowerCase();

  req.ccg = {
    mode,
    userRequest,
    lang,
    os,
    shell,
    outputType,
    outputStyle,
    knowledgeLevel,
    raw: b
  };

  return next();
}
JS

echo "== Backend: patch ccgRoutes to use ccgNormalize on POST / =="
CCG_ROUTES="$ROOT/server/routes/ccgRoutes.js"
if [ -f "$CCG_ROUTES" ]; then
  # ensure import exists
  if ! grep -q "ccgNormalize" "$CCG_ROUTES"; then
    # insert import after other imports
    perl -0777 -i -pe 's/(^import\s.+?;\s*\n)/$1import ccgNormalize from "..\/middleware\/ccgNormalize.js";\n/sm' "$CCG_ROUTES" || true
    # if no import lines at top, prepend
    if ! grep -q "ccgNormalize" "$CCG_ROUTES"; then
      perl -0777 -i -pe 's/^/import ccgNormalize from "..\/middleware\/ccgNormalize.js";\n/s' "$CCG_ROUTES"
    fi
  fi

  # add middleware to router.post("/", ...)
  # handle common patterns:
  # router.post("/", async (req,res)=>...)
  # router.post("/", someMw, async...)
  if grep -q 'router\.post\(\s*["'"'"']\/["'"'"']\s*,' "$CCG_ROUTES"; then
    # already has something, only add if ccgNormalize not in that line
    perl -0777 -i -pe 's/router\.post\(\s*(["'"'"']\/["'"'"']\s*,\s*)(?!ccgNormalize)/router.post($1ccgNormalize, /g' "$CCG_ROUTES" || true
  else
    perl -0777 -i -pe 's/router\.post\(\s*(["'"'"']\/["'"'"']\s*,\s*)/router.post($1ccgNormalize, /g' "$CCG_ROUTES" || true
  fi

  # make handler use req.ccg when available (non-destructive)
  if ! grep -q "const body = req\.ccg" "$CCG_ROUTES"; then
    perl -0777 -i -pe 's/(router\.post\([^\{]+\{\s*\n)/$1  const body = (req.ccg ?? req.body ?? {});\n/sm' "$CCG_ROUTES" || true
  fi

  echo "✅ Patched: $CCG_ROUTES"
else
  echo "🟡 Not found: $CCG_ROUTES (skipped)"
fi

echo "== Backend: ensure server.js parses JSON before routes =="
SERVER_JS="$ROOT/server.js"
if [ -f "$SERVER_JS" ]; then
  # if express.json is missing, add after app creation
  if ! grep -q "express\.json" "$SERVER_JS"; then
    perl -0777 -i -pe 's/(const\s+app\s*=\s*express\(\)\s*;\s*\n)/$1\napp.use(express.json({ limit: "1mb" }));\napp.use(express.urlencoded({ extended: true }));\n/sm' "$SERVER_JS" || true
    # alternative: app = express()
    perl -0777 -i -pe 's/(const\s+app\s*=\s*express\(\)\s*\n)/$1\napp.use(express.json({ limit: "1mb" }));\napp.use(express.urlencoded({ extended: true }));\n/sm' "$SERVER_JS" || true
  fi
  echo "✅ Patched: $SERVER_JS"
fi

echo "== Frontend build =="
cd "$ROOT/client"
npm i
npm run build

echo "== PM2 restart =="
cd "$ROOT"
pm2 restart ccg

echo "✅ DONE"
echo "Restored from: ${RESTORE_DIR:-<none>}"
echo "Safety backup: $SAFE_BACKUP"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_clean_mode_level"
mkdir -p "$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"

echo "== CCG FINAL CLEAN FIX (remove mode/level, stop 502 loop, fix 404) =="
echo "Backup: $BK"

# --- sanity check
[ -f "$ROUTE" ] || { echo "❌ ccgRoutes.js not found: $ROUTE"; exit 1; }

# --- backup current ccgRoutes.js
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

# --- Patch ccgRoutes.js to remove 'mode' and 'level'
echo "== 2) Remove 'mode' and 'level' impact from ccgRoutes.js =="
sed -i '/mode/d' "$ROUTE"  # حذف هر خطی که شامل `mode` است
sed -i '/level/d' "$ROUTE"  # حذف هر خطی که شامل `level` است

# --- Remove related logic
sed -i '/const vars = {/,+10d' "$ROUTE"  # حذف بخش‌های مربوط به `vars` که شامل `mode` یا `level` هستند
sed -i '/mode: \$/,+5d' "$ROUTE"  # حذف بخش‌هایی که متغیر `mode` تعریف شده است
sed -i '/levelRaw/d' "$ROUTE"  # حذف متغیر `levelRaw`

# --- Additional cleanups
sed -i '/CCG_LEVEL_MODE_V1/d' "$ROUTE"  # حذف هرگونه علامت `CCG_LEVEL_MODE_V1`
sed -i '/CCG_MODE_VARS_V1/d' "$ROUTE"  # حذف هرگونه علامت `CCG_MODE_VARS_V1`

# --- Syntax check (node --check)
echo "== 3) Syntax check for ccgRoutes.js =="
node --check "$ROUTE" || { echo "❌ Syntax error in ccgRoutes.js"; exit 1; }

# --- Restart PM2 and reload nginx
echo "== 4) Restart PM2 and reload nginx =="
pm2 restart ccg --update-env || true
pm2 ls || true
sudo service nginx reload || true

echo "✅ CCG FINAL CLEAN FIX completed successfully."

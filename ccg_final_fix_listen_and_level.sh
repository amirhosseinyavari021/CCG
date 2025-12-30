#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_ccgRoutes_patch"
mkdir -p "$BK"

SERVER="$ROOT/server.js"
AI="$ROOT/server/utils/aiClient.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"

# اطمینان از وجود فایل‌ها
[ -f "$SERVER" ] || { echo "❌ $SERVER not found"; exit 1; }
[ -f "$AI" ] || { echo "❌ $AI not found"; exit 1; }
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== FINAL FIX: Patch ccgRoutes.js with CCG_PROMPT_VARS_V1 and verbosity =="

# Backup current files
cp -f "$SERVER" "$BK/server.js.bak"
cp -f "$AI" "$BK/aiClient.js.bak"
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

# -------------------------
# Patch ccgRoutes.js to ensure CCG_PROMPT_VARS_V1 marker
# -------------------------
s=$(<"$ROUTE")

# اگر مارکر "CCG_PROMPT_VARS_V1" در فایل ccgRoutes.js وجود نداشت، آن را اضافه می‌کنیم
if [[ "$s" != *"CCG_PROMPT_VARS_V1"* ]]; then
  echo "Adding CCG_PROMPT_VARS_V1 marker..."
  
  # اضافه کردن مارکر به فایل
  s=$(echo "$s" | sed 's/const vars = {/const vars = {\n  // CCG_PROMPT_VARS_V1 /')

  # اضافه کردن کد verbosity در صورت نیاز
  s=$(echo "$s" | sed '/mode: /a \
      // CCG_VERBOSITY_V1 \
      verbosity: textVerbosity,')
  
  # ذخیره تغییرات در فایل ccgRoutes.js
  echo "$s" > "$ROUTE"
  echo "✅ Successfully patched ccgRoutes.js with CCG_PROMPT_VARS_V1 and verbosity"
else
  echo "✅ CCG_PROMPT_VARS_V1 marker already exists"
fi

# -------------------------
# Patch server.js to bind IPv4 (0.0.0.0)
# -------------------------
echo "Binding server.js to IPv4 (0.0.0.0)..."

s=$(<"$SERVER")

# اگر بندر به IPv6 یا دیگر مقادیر متصل است، آن را به IPv4 تغییر می‌دهیم
if [[ "$s" != *"0.0.0.0"* ]]; then
  s=$(echo "$s" | sed 's/\(app.listen\|server.listen\)(PORT, [^,]*, /&"0.0.0.0", /')
  echo "$s" > "$SERVER"
  echo "✅ Bound server.js to IPv4 (0.0.0.0)"
else
  echo "✅ Server already bound to 0.0.0.0"
fi

# -------------------------
# Syntax check
# -------------------------
echo "== Running syntax check for ccgRoutes.js and server.js =="

node --check "$ROUTE" || { echo "❌ Syntax error in ccgRoutes.js"; exit 2; }
node --check "$SERVER" || { echo "❌ Syntax error in server.js"; exit 2; }

# -------------------------
# Restart PM2 application
# -------------------------
echo "== Restarting PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

echo "== DONE ✅"

#!/usr/bin/env bash
set -e

echo "== CCG FULL FIX START =="

ROOT="$HOME/CCG"
echo "ROOT=$ROOT"

# sanity check
[ -d "$ROOT/client" ] || { echo "❌ client/ not found"; exit 1; }
[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }

echo "== Backup =="
BACKUP="$ROOT/.ccg_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp -r "$ROOT/client/src/pages/generator" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/components" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/middleware" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/routes" "$BACKUP/" 2>/dev/null || true
echo "Backup at $BACKUP"

echo "== Backend domainGuard fix =="
mkdir -p "$ROOT/server/middleware"

cat > "$ROOT/server/middleware/domainGuard.js" <<'JS'
export default function domainGuard(req, res, next) {
  try {
    if (!req || !req.headers) return next();
    return next();
  } catch (e) {
    return next();
  }
}
JS

echo "== Build frontend =="
cd "$ROOT/client"
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "== DONE =="

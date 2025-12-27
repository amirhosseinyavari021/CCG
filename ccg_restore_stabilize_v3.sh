#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
echo "== CCG RESTORE & STABILIZE v3 =="
echo "ROOT=$ROOT"

[ -d "$ROOT/client" ] || { echo "❌ client/ not found"; exit 1; }
[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }

# -------- pick backups --------
PREFERRED_GENERATOR_BACKUP="${CCG_RESTORE_GENERATOR_FROM:-$ROOT/.ccg_backup_20251226_081753}"

SAFE_BACKUP_DIR="${CCG_RESTORE_SAFE_FROM:-}"
if [ -z "${SAFE_BACKUP_DIR}" ]; then
  SAFE_BACKUP_DIR="$(ls -dt "$ROOT"/.ccg_backup_*_safe_before_v2 2>/dev/null | head -n 1 || true)"
fi

echo "Generator restore source: $PREFERRED_GENERATOR_BACKUP"
echo "Safe components source:   ${SAFE_BACKUP_DIR:-<none>}"

if [ ! -d "$PREFERRED_GENERATOR_BACKUP" ]; then
  echo "❌ Generator backup not found: $PREFERRED_GENERATOR_BACKUP"
  echo "   You can set it explicitly:"
  echo "   export CCG_RESTORE_GENERATOR_FROM=\"$ROOT/.ccg_backup_YYYYMMDD_HHMMSS\""
  exit 1
fi

if [ -z "${SAFE_BACKUP_DIR}" ] || [ ! -d "${SAFE_BACKUP_DIR}" ]; then
  echo "❌ safe_before_v2 backup not found."
  echo "   You can set it explicitly:"
  echo "   export CCG_RESTORE_SAFE_FROM=\"$ROOT/.ccg_backup_YYYYMMDD_HHMMSS_safe_before_v2\""
  exit 1
fi

# -------- safety backup now --------
timestamp="$(date +%Y%m%d_%H%M%S)"
NOW_BACKUP="$ROOT/.ccg_backup_${timestamp}_safe_before_v3"
mkdir -p "$NOW_BACKUP"
echo "== Safety backup -> $NOW_BACKUP =="
cp -r "$ROOT/client/src/pages/generator" "$NOW_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/components" "$NOW_BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/App.jsx" "$NOW_BACKUP/" 2>/dev/null || true

# -------- restore COMPONENTS from safe backup (fix MainLayout + global structure) --------
echo "== Restore client/src/components from SAFE backup =="
if [ -d "$SAFE_BACKUP_DIR/components" ]; then
  rm -rf "$ROOT/client/src/components"
  mkdir -p "$ROOT/client/src"
  cp -r "$SAFE_BACKUP_DIR/components" "$ROOT/client/src/components"
elif [ -d "$SAFE_BACKUP_DIR/client/src/components" ]; then
  rm -rf "$ROOT/client/src/components"
  mkdir -p "$ROOT/client/src"
  cp -r "$SAFE_BACKUP_DIR/client/src/components" "$ROOT/client/src/components"
else
  echo "❌ Could not find components snapshot inside safe backup: $SAFE_BACKUP_DIR"
  exit 1
fi

# -------- restore GENERATOR page from preferred backup (UI inputs should come back) --------
echo "== Restore client/src/pages/generator from generator-backup =="
if [ -d "$PREFERRED_GENERATOR_BACKUP/generator" ]; then
  rm -rf "$ROOT/client/src/pages/generator"
  mkdir -p "$ROOT/client/src/pages"
  cp -r "$PREFERRED_GENERATOR_BACKUP/generator" "$ROOT/client/src/pages/generator"
elif [ -d "$PREFERRED_GENERATOR_BACKUP/client/src/pages/generator" ]; then
  rm -rf "$ROOT/client/src/pages/generator"
  mkdir -p "$ROOT/client/src/pages"
  cp -r "$PREFERRED_GENERATOR_BACKUP/client/src/pages/generator" "$ROOT/client/src/pages/generator"
else
  echo "❌ Could not find generator snapshot inside: $PREFERRED_GENERATOR_BACKUP"
  exit 1
fi

# -------- hard guarantee for App.jsx import "./components/layout/MainLayout" --------
echo "== Ensure MainLayout exists (fallback bridge) =="
APP="$ROOT/client/src/App.jsx"
if [ -f "$APP" ] && grep -q '\./components/layout/MainLayout' "$APP"; then
  # try to find an existing layout in safe components (already restored), if still missing, create fallback
  if ! ls "$ROOT/client/src/components/layout/MainLayout."* >/dev/null 2>&1; then
    mkdir -p "$ROOT/client/src/components/layout"

    # If there is another layout file somewhere, you can adapt here, but fallback keeps build green.
    cat > "$ROOT/client/src/components/layout/MainLayout.jsx" <<'JSX'
import React from "react";

/**
 * Fallback MainLayout
 * اگر پروژه‌ی اصلی یک MainLayout کامل‌تر دارد، این فایل فقط برای جلوگیری از شکست build است.
 * می‌توانید بعداً محتوایش را با نسخه اصلی جایگزین کنید.
 */
export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
JSX
    echo "✅ Created fallback: client/src/components/layout/MainLayout.jsx"
  else
    echo "✅ MainLayout exists."
  fi
fi

# -------- build & restart --------
echo "== Frontend build =="
cd "$ROOT/client"
npm i
npm run build

echo "== PM2 restart =="
cd "$ROOT"
pm2 restart ccg

echo "✅ DONE v3"
echo " - Generator restored from: $PREFERRED_GENERATOR_BACKUP"
echo " - Components restored from: $SAFE_BACKUP_DIR"
echo " - Safety backup saved at: $NOW_BACKUP"

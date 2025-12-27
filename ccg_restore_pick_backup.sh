#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
cd "$ROOT"

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing: $1"; exit 1; }; }
need grep
need find

KEY_RE='Network|Vendor|vendor|network|device|router|knowledgeLevel|outputStyle|mode|platform|shell|cli'

score_backup() {
  local dir="$1"
  local score=0

  # candidate paths
  local g1="$dir/generator"
  local g2="$dir/pages/generator"
  local g3="$dir/client/src/pages/generator"

  local c1="$dir/components"
  local c2="$dir/client/src/components"

  local found_any=0
  for p in "$g1" "$g2" "$g3" "$c1" "$c2"; do
    if [ -d "$p" ]; then
      found_any=1
      # count matches (cap to keep it fast)
      local cnt
      cnt=$(grep -Rsn --exclude-dir=node_modules -E "$KEY_RE" "$p" 2>/dev/null | head -n 200 | wc -l | tr -d ' ')
      score=$((score + cnt))
    fi
  done

  if [ "$found_any" -eq 0 ]; then
    echo "0"
  else
    echo "$score"
  fi
}

pick_best_backup() {
  local best=""
  local best_score=-1
  for d in $(ls -dt .ccg_backup_* 2>/dev/null || true); do
    # ignore "before_restore" ones (usually current state)
    if echo "$d" | grep -q "before_restore"; then
      continue
    fi
    local s
    s=$(score_backup "$d")
    echo "• $d  score=$s"
    if [ "$s" -gt "$best_score" ]; then
      best_score="$s"
      best="$d"
    fi
  done

  echo ""
  echo "$best"
}

restore_folder() {
  local src="$1"
  local dst="$2"
  if [ -d "$src" ]; then
    rm -rf "$dst"
    mkdir -p "$(dirname "$dst")"
    cp -r "$src" "$dst"
    return 0
  fi
  return 1
}

echo "== Pick best backup by content =="
BEST="$(pick_best_backup | tail -n 1)"

if [ -z "${BEST:-}" ] || [ ! -d "$BEST" ]; then
  echo "❌ Could not pick a backup. Run: ls -dt .ccg_backup_* | head"
  exit 1
fi

echo "✅ Selected backup: $BEST"

echo "== Create safety backup of CURRENT state =="
SAFE="$ROOT/.ccg_backup_$(date +%Y%m%d_%H%M%S)_before_PICK_restore"
mkdir -p "$SAFE"
cp -r "$ROOT/client/src/pages/generator" "$SAFE/" 2>/dev/null || true
cp -r "$ROOT/client/src/components" "$SAFE/" 2>/dev/null || true
echo "✅ Safety backup: $SAFE"

echo "== Restore generator/components from selected backup =="

if restore_folder "$BEST/generator" "$ROOT/client/src/pages/generator"; then
  echo "✅ Restored generator from $BEST/generator"
elif restore_folder "$BEST/pages/generator" "$ROOT/client/src/pages/generator"; then
  echo "✅ Restored generator from $BEST/pages/generator"
elif restore_folder "$BEST/client/src/pages/generator" "$ROOT/client/src/pages/generator"; then
  echo "✅ Restored generator from $BEST/client/src/pages/generator"
else
  echo "❌ Could not find generator folder in $BEST"
  exit 1
fi

# restore components only if exists
if [ -d "$BEST/components" ]; then
  rm -rf "$ROOT/client/src/components"
  cp -r "$BEST/components" "$ROOT/client/src/components"
  echo "✅ Restored components from $BEST/components"
elif [ -d "$BEST/client/src/components" ]; then
  rm -rf "$ROOT/client/src/components"
  cp -r "$BEST/client/src/components" "$ROOT/client/src/components"
  echo "✅ Restored components from $BEST/client/src/components"
else
  echo "🟡 No components folder found in $BEST (skipped)"
fi

echo "== Build & restart =="
cd "$ROOT/client"
npm i
npm run build

cd "$ROOT"
pm2 restart ccg

echo "✅ DONE. If UI still looks unchanged, clear browser cache or test with hard refresh (Ctrl+F5)."
echo "Selected backup was: $BEST"

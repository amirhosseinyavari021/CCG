#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_remove_mode_frontend"
mkdir -p "$BK"

echo "== REMOVE MODE FROM FRONTEND (UI + payload) =="
echo "Backup: $BK"

# files (some may not exist)
FILES=(
  "$ROOT/client/src/pages/generator/GeneratorPage.jsx"
  "$ROOT/client/src/pages/comparator/CodeComparatorPage.jsx"
  "$ROOT/client/src/pages/compare/CodeComparatorPage.jsx"
  "$ROOT/client/src/components/error/ErrorAnalyzerModal.jsx"
  "$ROOT/client/src/components/error/ErrorAnalyzerDrawer.jsx"
  "$ROOT/client/src/components/modals/ErrorAnalyzerModal.jsx"
  "$ROOT/client/src/context/LanguageContext.jsx"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    mkdir -p "$BK/$(dirname "${f#$ROOT/}")"
    cp -f "$f" "$BK/$(dirname "${f#$ROOT/}")/$(basename "$f").bak"
  fi
done

python3 - <<'PY'
import os, re, glob

root = os.path.expanduser("~/CCG")

def read(p):
  return open(p, "r", encoding="utf-8", errors="ignore").read()

def write(p, s):
  open(p, "w", encoding="utf-8").write(s)

def patch_generator(p):
  s0 = read(p)
  s = s0

  # 1) remove mode state line
  s = re.sub(r'^\s*const\s*\[\s*mode\s*,\s*setMode\s*\]\s*=\s*useState\([^\)]*\)\s*;?\s*$\n',
             '', s, flags=re.M)

  # 2) remove Mode UI section (FieldLabel + Toggle block) robustly:
  # find the first occurrence of "{/* Mode */}" and delete until just before "{/* Knowledge */}"
  mode_idx = s.find("{/* Mode */}")
  know_idx = s.find("{/* Knowledge */}")
  if mode_idx != -1 and know_idx != -1 and know_idx > mode_idx:
    # keep indentation around knowledge block
    s = s[:mode_idx] + s[know_idx:]
  else:
    # fallback: remove any JSX chunk containing label={t("mode")}
    s = re.sub(r'[\s\S]*?<FieldLabel\s+label=\{t\("mode"\)\}[\s\S]*?</div>\s*',
               '', s, count=1)

  # 3) remove mode from payload
  s = re.sub(r'^\s*mode\s*:\s*["\'][^"\']+["\']\s*,\s*$\n', '', s, flags=re.M)  # mode: "generate",
  s = re.sub(r'^\s*modeStyle\s*:\s*mode\s*,.*$\n', '', s, flags=re.M)           # modeStyle: mode,

  # 4) remove any leftover setMode usage (should be gone)
  s = re.sub(r'setMode\([^\)]*\);\s*', '', s)

  if s != s0:
    write(p, s)
    return True
  return False

def remove_mode_from_payloads(p):
  s0 = read(p)
  s = s0
  # remove lines like: mode: "compare",
  s = re.sub(r'^\s*mode\s*:\s*["\'][^"\']+["\']\s*,\s*$\n', '', s, flags=re.M)
  # remove "mode": "error", inside objects too (rare format)
  s = re.sub(r'(["\']mode["\']\s*:\s*["\'][^"\']+["\']\s*,\s*)', '', s)
  if s != s0:
    write(p, s)
    return True
  return False

def patch_language_context(p):
  s0 = read(p)
  s = s0
  # remove dict keys mode and tip_mode only (keep learn/operational words if other parts use them)
  s = re.sub(r'^\s*mode\s*:\s*".*?",\s*$\n', '', s, flags=re.M)
  s = re.sub(r'^\s*tip_mode\s*:\s*".*?",\s*$\n', '', s, flags=re.M)
  if s != s0:
    write(p, s)
    return True
  return False

changed = []

gen = os.path.join(root, "client/src/pages/generator/GeneratorPage.jsx")
if os.path.isfile(gen):
  if patch_generator(gen):
    changed.append(gen)

# comparator variants
for p in [
  os.path.join(root, "client/src/pages/comparator/CodeComparatorPage.jsx"),
  os.path.join(root, "client/src/pages/compare/CodeComparatorPage.jsx"),
]:
  if os.path.isfile(p) and remove_mode_from_payloads(p):
    changed.append(p)

# error analyzer components (if exist)
for p in [
  os.path.join(root, "client/src/components/error/ErrorAnalyzerModal.jsx"),
  os.path.join(root, "client/src/components/error/ErrorAnalyzerDrawer.jsx"),
  os.path.join(root, "client/src/components/modals/ErrorAnalyzerModal.jsx"),
]:
  if os.path.isfile(p) and remove_mode_from_payloads(p):
    changed.append(p)

# language context
lc = os.path.join(root, "client/src/context/LanguageContext.jsx")
if os.path.isfile(lc) and patch_language_context(lc):
  changed.append(lc)

print("CHANGED_FILES=" + str(len(changed)))
for x in changed:
  print(" - " + x)
PY

echo "== Build frontend (so changes show on site) =="
if [ -f "$ROOT/client/package.json" ]; then
  npm --prefix "$ROOT/client" run build
  echo "✅ client build done"
else
  echo "⚠️ client/package.json not found; skipped build"
fi

echo "✅ DONE. Backup: $BK"

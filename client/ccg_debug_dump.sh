#!/usr/bin/env bash
set -u

sep () { echo; echo "==================== $1 ===================="; }

ROOT="$(pwd)"
if [ ! -d "client" ]; then
  echo "❌ پوشه client پیدا نشد. لطفاً از ریشه پروژه اجرا کن (جایی که client/ هست)."
  exit 1
fi

sep "0) BASIC INFO"
echo "PWD: $ROOT"
echo "DATE: $(date)"
echo "USER: $(whoami)"
echo "NODE: $(node -v 2>/dev/null || echo 'node not found')"
echo "NPM : $(npm -v 2>/dev/null || echo 'npm not found')"
echo "PM2 : $(pm2 -v 2>/dev/null || echo 'pm2 not found')"

sep "1) GIT STATUS / DIFF (SUMMARY)"
if command -v git >/dev/null 2>&1; then
  git status --porcelain || true
  echo
  echo "--- diff --stat ---"
  git diff --stat || true
else
  echo "git not found"
fi

sep "2) CLIENT TREE (IMPORTANT FILES)"
cd client
echo "CLIENT PWD: $(pwd)"
echo "--- top level ---"
ls -la

echo
echo "--- src overview (depth 4) ---"
find src -maxdepth 4 -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.css" \) | sort

sep "3) BUILD CONFIG FILES"
for f in package.json vite.config.* tailwind.config.* postcss.config.* index.html; do
  if [ -f "$f" ]; then
    echo
    echo "----- $f -----"
    sed -n '1,220p' "$f"
  else
    echo "MISSING: $f"
  fi
done

sep "4) ENTRY FILES"
for f in src/main.jsx src/App.jsx src/index.css src/main.css; do
  if [ -f "$f" ]; then
    echo
    echo "----- $f (lines: $(wc -l < "$f")) -----"
    nl -ba "$f" | sed -n '1,260p'
  else
    echo "MISSING: $f"
  fi
done

sep "5) LAYOUT: MainLayout / Header / Footer"
for f in src/components/layout/MainLayout.jsx src/components/layout/Header.jsx src/components/layout/Footer.jsx; do
  if [ -f "$f" ]; then
    echo
    echo "----- $f (lines: $(wc -l < "$f")) -----"
    nl -ba "$f" | sed -n '1,320p'
  else
    echo "MISSING: $f"
  fi
done

sep "6) CONTEXT / HOOKS (Language / Theme / Auth / AppView)"
for f in \
  src/context/LanguageContext.jsx \
  src/context/ThemeContext.jsx \
  src/context/AuthContext.jsx \
  src/hooks/useAppView.jsx
do
  if [ -f "$f" ]; then
    echo
    echo "----- $f (lines: $(wc -l < "$f")) -----"
    nl -ba "$f" | sed -n '1,360p'
  else
    echo "MISSING: $f"
  fi
done

sep "7) PAGES: Generator / Comparator"
for f in \
  src/pages/generator/GeneratorPage.jsx \
  src/pages/comparator/CodeComparatorPage.jsx
do
  if [ -f "$f" ]; then
    echo
    echo "----- $f (lines: $(wc -l < "$f")) -----"
    nl -ba "$f" | sed -n '1,520p'
  else
    echo "MISSING: $f"
  fi
done

sep "8) UI COMPONENTS (Modal / MarkdownBox / etc.)"
for f in \
  src/components/ui/Modal.jsx \
  src/components/ui/MarkdownBox.jsx \
  src/components/ui/*.* \
  src/components/error/ErrorAnalyzerModal.jsx
do
  if [ -f "$f" ]; then
    echo
    echo "----- $f (lines: $(wc -l < "$f")) -----"
    nl -ba "$f" | sed -n '1,420p'
  fi
done

sep "9) QUICK GREP (to detect missing imports / feature flags)"
echo "--- search: useAppView / setView / view === / ErrorAnalyzer / swap / knowledge / mode ---"
rg -n "useAppView|setView\\(|view ===|Error Analyzer|ErrorAnalyzer|swap|knowledge|mode|beginner|operational|learn" src || true

sep "10) CSS IMPORT PROBLEM CHECK (@import order)"
echo "--- search any @import inside .jsx/.css ---"
rg -n "@import" src || true

sep "11) VITE BUILD (SHOW ERRORS IF ANY)"
npm run build || true

sep "DONE"

#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "=== FRONTEND TREE (key files) ==="
find src -maxdepth 4 -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) | sort
echo
echo "=== package.json ==="
cat package.json
echo
for f in \
  src/main.jsx \
  src/App.jsx \
  src/LanguageContext.jsx \
  src/context/AuthContext.jsx \
  src/components/Header.jsx \
  src/components/modals/WelcomeModal.jsx \
  src/components/modals/LanguageSelectModal.jsx \
  src/pages/CCGMain.jsx \
  src/pages/CCGLanding.jsx \
  src/components/CodeComparePanel.jsx \
  src/services/aiService.js
do
  echo
  echo "===== FILE: $f ====="
  [ -f "$f" ] && sed -n '1,220p' "$f" || echo "NOT FOUND"
done

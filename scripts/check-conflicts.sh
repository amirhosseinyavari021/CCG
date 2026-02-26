#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Match true git conflict markers only
PATTERN='^(<<<<<<< .+|=======|>>>>>>> .+)$'

if rg -n --hidden --glob '!**/node_modules/**' --glob '!**/.git/**' --glob '!**/dist/**' "$PATTERN" . ; then
  echo "\n❌ Unresolved merge conflict markers found."
  exit 1
fi

echo "✅ No merge conflict markers found."

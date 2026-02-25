#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='^(<<<<<<< .+|=======|>>>>>>> .+)$'

if rg -n --hidden --glob '!**/node_modules/**' --glob '!**/dist/**' "$PATTERN" src ; then
  echo "\n❌ Merge conflict markers found in client/src. Resolve them before build."
  exit 1
fi

echo "✅ Client source has no merge conflict markers."

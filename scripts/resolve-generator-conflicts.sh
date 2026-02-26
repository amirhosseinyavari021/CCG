#!/usr/bin/env bash
set -euo pipefail

# Auto-resolve frequent generator UI conflicts by preferring current branch changes.
# Use only when `git status` shows unmerged paths after merging/rebasing main.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGETS=(
  "client/src/components/ui/ToolResult.jsx"
  "client/src/pages/generator/GeneratorPage.jsx"
)

if ! git diff --name-only --diff-filter=U | grep -q .; then
  echo "ℹ️ No unmerged files found. Nothing to resolve."
  exit 0
fi

echo "🔧 Resolving known generator conflicts by taking current branch version (ours)..."
for f in "${TARGETS[@]}"; do
  if git diff --name-only --diff-filter=U -- "$f" | grep -q .; then
    git checkout --ours -- "$f"
    git add "$f"
    echo "  - resolved: $f"
  fi
done

if git diff --name-only --diff-filter=U | grep -q .; then
  echo "❌ Some unmerged files are still unresolved:"
  git diff --name-only --diff-filter=U
  exit 1
fi

echo "✅ Conflict markers guard check..."
npm run check:conflicts
(
  cd client
  npm run check:conflicts
)

echo "✅ Known generator conflicts resolved and staged."
echo "Next: run tests/build, then commit the merge resolution."

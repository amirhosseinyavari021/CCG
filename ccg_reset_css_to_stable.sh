#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
CSS="$ROOT/client/src/index.css"

echo "== CCG RESET CSS TO STABLE =="

[ -f "$CSS" ] || { echo "❌ index.css not found"; exit 1; }

BACKUP="$ROOT/.ccg_backup_css_fullreset_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp "$CSS" "$BACKUP/index.css.bak"

echo "✅ Backup created at $BACKUP"

cat > "$CSS" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* =========================
   CCG STABLE THEME SYSTEM
   Single source of truth
   ========================= */

@layer base {
  :root {
    --bg: #f6f7fb;
    --text: #0f172a;
    --muted: #64748b;

    --card: rgba(255,255,255,0.75);
    --border: rgba(15,23,42,0.10);

    --primary: #2563eb;
  }

  [data-theme="dark"] {
    --bg: #070b14;
    --text: #e5e7eb;
    --muted: #94a3b8;

    --card: rgba(15,23,42,0.60);
    --border: rgba(148,163,184,0.18);

    --primary: #60a5fa;
  }

  html, body {
    height: 100%;
    background: var(--bg);
    color: var(--text);
  }

  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  * {
    box-sizing: border-box;
  }
}

@layer components {
  .ccg-card {
    background: var(--card);
    border: 1px solid var(--border);
    @apply rounded-2xl backdrop-blur shadow-sm;
  }

  .ccg-input,
  .ccg-select,
  .ccg-textarea {
    background: rgba(255,255,255,0.65);
    border: 1px solid var(--border);
    color: var(--text);
    @apply rounded-xl px-3 py-2 outline-none;
  }

  [data-theme="dark"] .ccg-input,
  [data-theme="dark"] .ccg-select,
  [data-theme="dark"] .ccg-textarea {
    background: rgba(2,6,23,0.45);
  }

  .ccg-btn {
    background: rgba(255,255,255,0.55);
    border: 1px solid var(--border);
    color: var(--text);
    @apply rounded-xl px-4 py-2 text-sm transition;
  }

  [data-theme="dark"] .ccg-btn {
    background: rgba(2,6,23,0.35);
  }

  .ccg-btn-primary {
    background: linear-gradient(180deg, #2563eb, #1d4ed8);
    color: #fff;
    border: none;
  }
}

/* Tooltip safety */
[data-tooltip],
.tooltip,
.popover {
  z-index: 9999;
}
EOF

echo "== Build frontend =="
cd "$ROOT/client"
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "🎉 DONE: CSS fully reset, syntax clean, theme stable."

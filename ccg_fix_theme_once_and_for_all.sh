#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
CSS="$ROOT/client/src/index.css"

echo "== CCG CSS SYNTAX + THEME FIX =="

[ -f "$CSS" ] || { echo "❌ index.css not found"; exit 1; }

BACKUP="$ROOT/.ccg_backup_css_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp "$CSS" "$BACKUP/index.css.bak"
echo "✅ Backup created: $BACKUP"

echo "== Cleaning broken tail sections =="

# حذف همه سیستم‌های تم قدیمی و تداخل‌دار
sed -i '/night-mode/d' "$CSS"
sed -i '/day-mode/d' "$CSS"
sed -i '/footer, header {/,+3d' "$CSS"
sed -i '/body, .container, .header, .footer {/,+3d' "$CSS"

# حذف بلاک‌های ناقص احتمالی آخر فایل
sed -i '$d' "$CSS"
sed -i '$d' "$CSS"
sed -i '$d' "$CSS"

echo "== Appending clean, VALID CSS =="

cat >> "$CSS" <<'EOF'

/* ===== CCG FINAL STABLE THEME (VALID CSS) ===== */

html, body {
  background: var(--bg);
  color: var(--text);
}

header, footer {
  background: var(--card);
  color: var(--text);
  border-color: var(--border);
}

.ccg-card,
.ccg-panel {
  background: var(--card);
  color: var(--text);
}

.ccg-error {
  background: rgba(239,68,68,.10);
  color: var(--text);
  border: 1px solid rgba(239,68,68,.35);
}

.ccg-input,
.ccg-select,
.ccg-textarea {
  background: rgba(255,255,255,.65);
  color: var(--text);
}

[data-theme="dark"] .ccg-input,
[data-theme="dark"] .ccg-select,
[data-theme="dark"] .ccg-textarea {
  background: rgba(2,6,23,.45);
}

/* ===== END STABLE THEME ===== */
EOF

echo "== Build frontend =="
cd "$ROOT/client"
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "🎉 DONE: CSS syntax fixed + theme stabilized."

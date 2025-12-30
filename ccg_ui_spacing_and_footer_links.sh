#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
CSS="$ROOT/client/src/index.css"

echo "== CCG UI SPACING + FOOTER LINKS =="

[ -f "$CSS" ] || { echo "❌ index.css not found"; exit 1; }

BACKUP="$ROOT/.ccg_backup_ui_spacing_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp "$CSS" "$BACKUP/index.css.bak"

echo "✅ Backup created at $BACKUP"

cat >> "$CSS" <<'EOF'

/* =========================
   CCG UI POLISH v1
   - More side spacing
   - Clear footer links
   ========================= */

/* افزایش فاصله کلی محتوا از کناره‌های سایت */
.ccg-container {
  padding-left: 1.75rem; /* ~28px */
  padding-right: 1.75rem;
}

@media (min-width: 1024px) {
  .ccg-container {
    padding-left: 3rem;  /* ~48px */
    padding-right: 3rem;
  }
}

/* فاصله بهتر کارت‌ها از لبه viewport در حالت خیلی عریض */
@media (min-width: 1536px) {
  .ccg-container {
    max-width: 1320px;
  }
}

/* =========================
   Footer links styling
   ========================= */

/* لینک‌های داخل فوتر واضح و استاندارد */
footer a,
.footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

footer a:hover,
.footer a:hover {
  text-decoration: underline;
  opacity: 0.9;
}

/* حالت دارک – آبی ملایم‌تر */
[data-theme="dark"] footer a,
[data-theme="dark"] .footer a {
  color: #60a5fa;
}
EOF

echo "== Build frontend =="
cd "$ROOT/client"
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "🎉 DONE: Spacing improved & footer links styled."

#!/usr/bin/env bash
set -euo pipefail

CSS="client/src/index.css"

echo "== CCG UI SPACING & FOOTER LINK FIX =="

[ -f "$CSS" ] || { echo "❌ index.css not found"; exit 1; }

# Backup
cp "$CSS" "$CSS.bak_$(date +%Y%m%d_%H%M%S)"

# Remove old injected blocks if exist
sed -i '/CCG_LAYOUT_SPACING_FIX_START/,/CCG_LAYOUT_SPACING_FIX_END/d' "$CSS"
sed -i '/CCG_FOOTER_LINK_FIX_START/,/CCG_FOOTER_LINK_FIX_END/d' "$CSS"

cat >> "$CSS" <<'CSSFIX'

/* =========================================================
   CCG_LAYOUT_SPACING_FIX_START
   هدف: فاصله منطقی از کناره‌ها + کانتینر واقعی
========================================================= */

/* کانتینر اصلی */
.ccg-container{
  max-width: 1280px !important;
  padding-left: 2rem !important;
  padding-right: 2rem !important;
}

/* فاصله عمودی سکشن‌ها */
.ccg-container > *{
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

/* کارت‌ها از لبه‌ها نفس بکشن */
.ccg-card,
.ccg-panel{
  margin-left: auto;
  margin-right: auto;
}

/* جلوگیری از چسبیدن به لبه صفحه در مانیتورهای بزرگ */
@media (min-width: 1536px){
  .ccg-container{
    max-width: 1400px !important;
  }
}

/* =========================================================
   CCG_LAYOUT_SPACING_FIX_END
========================================================= */


/* =========================================================
   CCG_FOOTER_LINK_FIX_START
   هدف: لینک‌های فوتر واضح و استاندارد
========================================================= */

footer a{
  color: #3b82f6 !important; /* blue-500 */
  text-decoration: none;
  font-weight: 500;
}

footer a:hover{
  color: #60a5fa !important; /* blue-400 */
  text-decoration: underline;
}

/* حالت شب */
[data-theme="dark"] footer a{
  color: #60a5fa !important;
}

[data-theme="dark"] footer a:hover{
  color: #93c5fd !important;
}

/* =========================================================
   CCG_FOOTER_LINK_FIX_END
========================================================= */

CSSFIX

echo "✅ UI spacing & footer links fixed"
echo "➡️ Next: npm run build"

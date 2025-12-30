#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
CSS="$ROOT/client/src/index.css"

echo "== CCG FIX THEME + LAYOUT (FINAL) =="
echo "ROOT=$ROOT"

[ -d "$ROOT/client" ] || { echo "❌ پوشه client پیدا نشد"; exit 1; }
[ -f "$CSS" ] || { echo "❌ فایل index.css پیدا نشد: $CSS"; exit 1; }

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/.ccg_backup_${TS}_theme_layout_final"
mkdir -p "$BACKUP"
cp -f "$CSS" "$BACKUP/index.css.bak"

echo "✅ بکاپ ساخته شد: $BACKUP/index.css.bak"
echo "== درحال بازنویسی CSS برای تم ثابت (Light/Dark) + فاصله‌ها + لینک‌های فوتر =="

cat > "$CSS" <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
  ✅ CCG Stable Theme System
  - فقط یک منبع حقیقت برای رنگ‌ها: CSS Variables
  - پشتیبانی همزمان از:
    1) [data-theme="dark"]  (اگر پروژه از این استفاده کند)
    2) html.dark            (اگر Tailwind dark class استفاده شود)
  - حذف تداخل day-mode/night-mode و !important های خراب‌کننده
*/

@layer base {
  :root{
    --font-en: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial;
    --font-fa: "Vazirmatn", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial;

    /* Light */
    --bg: #f6f7fb;
    --text: #0f172a;
    --muted: rgba(15,23,42,.62);

    --card: rgba(255,255,255,.92);
    --border: rgba(15,23,42,.10);

    --input-bg: rgba(255,255,255,.88);

    --primary: #2563eb;
    --primary-2: #60a5fa;
  }

  /* Dark: پشتیبانی از data-theme و کلاس dark */
  html.dark,
  [data-theme="dark"]{
    --bg: #070b14;
    --text: #e5e7eb;
    --muted: rgba(148,163,184,.70);

    /* کارت‌ها کمی opaque تر تا “نوار/باند” و بهم‌ریختگی کمتر شود */
    --card: rgba(15,23,42,.78);
    --border: rgba(148,163,184,.18);

    --input-bg: rgba(2,6,23,.55);

    --primary: #60a5fa;
    --primary-2: #93c5fd;
  }

  html, body { height: 100%; }

  html{
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-en);
  }
  html[dir="rtl"]{ font-family: var(--font-fa); }

  body{
    margin: 0;
    min-height: 100%;
    color: var(--text);
    background:
      radial-gradient(1200px 700px at 25% 15%, rgba(37,99,235,.10), transparent 55%),
      radial-gradient(900px 600px at 80% 55%, rgba(96,165,250,.08), transparent 60%),
      var(--bg);
  }

  html.dark body,
  [data-theme="dark"] body{
    background:
      radial-gradient(1200px 700px at 25% 15%, rgba(37,99,235,.18), transparent 55%),
      radial-gradient(900px 600px at 80% 55%, rgba(96,165,250,.12), transparent 60%),
      var(--bg);
  }

  #root{
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  a{
    color: var(--primary);
    text-decoration: none;
  }
  a:hover{
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  ::placeholder{ color: rgba(100,116,139,.75); }
  html.dark ::placeholder,
  [data-theme="dark"] ::placeholder{ color: rgba(148,163,184,.70); }

  *{ box-sizing: border-box; }
}

@layer components {
  /* ✅ فاصله از کناره‌ها بیشتر + یکدست کردن container */
  .ccg-container,
  .container{
    @apply mx-auto w-full;
    padding-left: 1.25rem;   /* 20px */
    padding-right: 1.25rem;  /* 20px */
    max-width: 1280px;
  }
  @media (min-width: 640px){
    .ccg-container,
    .container{
      padding-left: 2rem;   /* 32px */
      padding-right: 2rem;  /* 32px */
    }
  }
  @media (min-width: 1024px){
    .ccg-container,
    .container{
      padding-left: 2.5rem; /* 40px */
      padding-right: 2.5rem;/* 40px */
    }
  }

  /* کارت‌ها */
  .ccg-card, .ccg-panel,
  .card, .panel{
    background: var(--card);
    border: 1px solid var(--border);
    @apply rounded-2xl shadow-sm;
    /* blur خیلی کم که ظاهر شیشه‌ای حفظ بشه ولی مشکل band کمتر */
    backdrop-filter: blur(10px);
  }

  /* ورودی‌ها */
  .ccg-input, .ccg-select, .ccg-textarea{
    background: var(--input-bg);
    border: 1px solid var(--border);
    color: var(--text);
    @apply rounded-xl px-3 py-2 outline-none;
  }

  .ccg-input:focus, .ccg-select:focus, .ccg-textarea:focus{
    @apply ring-2 ring-blue-500/40;
  }

  /* دکمه‌ها */
  .ccg-btn{
    border: 1px solid var(--border);
    background: rgba(255,255,255,.60);
    color: var(--text);
    @apply rounded-xl px-4 py-2 text-sm transition active:translate-y-[1px];
  }
  html.dark .ccg-btn,
  [data-theme="dark"] .ccg-btn{
    background: rgba(2,6,23,.35);
  }

  .ccg-btn-primary{
    @apply ccg-btn;
    background: linear-gradient(180deg, rgba(37,99,235,.95), rgba(37,99,235,.82));
    border-color: rgba(37,99,235,.40);
    color: #fff;
    box-shadow: 0 10px 26px rgba(96,165,250,.18);
  }

  .ccg-btn-ghost{
    @apply ccg-btn;
    background: transparent;
  }

  .ccg-btn-xs{
    @apply px-2 py-1 text-xs rounded-lg;
  }

  .ccg-error{
    border: 1px solid rgba(239,68,68,.35);
    background: rgba(239,68,68,.08);
    @apply rounded-2xl p-4;
    color: var(--text);
  }

  /* Markdown */
  .ccg-markdown{
    @apply text-sm leading-7;
    color: var(--text);
  }
  .ccg-markdown.rtl{ direction: rtl; }
  .ccg-markdown.ltr{ direction: ltr; }

  .ccg-markdown h1, .ccg-markdown h2, .ccg-markdown h3{
    @apply font-semibold mt-4 mb-2;
  }
  .ccg-markdown ul{ @apply list-disc ps-6 my-2; }
  .ccg-markdown ol{ @apply list-decimal ps-6 my-2; }

  .ccg-inline-code{
    @apply px-1 py-0.5 rounded;
    background: rgba(15,23,42,.06);
  }
  html.dark .ccg-inline-code,
  [data-theme="dark"] .ccg-inline-code{
    background: rgba(255,255,255,.10);
  }

  .ccg-codeblock{
    @apply my-3 rounded-2xl overflow-hidden border;
    border-color: var(--border);
    background: rgba(2,6,23,.92);
  }
  .ccg-codeblock-head{
    @apply flex items-center justify-between gap-3 px-4 py-2 border-b;
    border-color: rgba(148,163,184,.18);
  }
  .ccg-codeblock-title{ @apply text-xs font-semibold text-slate-200; }
  .ccg-pre{ @apply overflow-auto p-4 text-xs text-slate-100; }
}

/* ✅ Tooltip/Popover همیشه روی همه چی */
.ccg-tooltip,
.tooltip,
.popover,
[data-tooltip],
[data-popover],
[data-radix-popper-content-wrapper],
[role="tooltip"]{
  z-index: 9999 !important;
}

/* ✅ جلوگیری از قیچی شدن tooltip */
.ccg-card, .ccg-panel, .card, .panel,
.rounded-2xl, .rounded-3xl,
.input-card, .controls-card{
  overflow: visible;
}

/* ✅ فوتر: لینک‌ها کاملاً آبی و مشخص */
footer a{
  color: var(--primary) !important;
  text-decoration: none;
}
footer a:hover{
  text-decoration: underline;
  text-underline-offset: 3px;
}
CSS

echo "== Build فرانت =="
cd "$ROOT/client"
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "✅ DONE: تم‌ها ثابت، فاصله از کناره‌ها بیشتر، لینک‌های فوتر آبی و واضح."
echo "اگر خواستی برگردونی: cp '$BACKUP/index.css.bak' '$CSS' و دوباره build بزن."

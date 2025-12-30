#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_domainGuard_crash"
mkdir -p "$BK"

SERVER="$ROOT/server.js"
DG="$ROOT/server/middleware/domainGuard.js"

echo "== FIX: domainGuard crash (next is not a function) + restore listening =="
echo "Backup: $BK"

[ -f "$SERVER" ] || { echo "❌ server.js not found: $SERVER"; exit 1; }
[ -f "$DG" ] || { echo "❌ domainGuard.js not found: $DG"; exit 1; }

cp -f "$SERVER" "$BK/server.js.bak"
cp -f "$DG" "$BK/domainGuard.js.bak"

echo "== 1) Rewrite domainGuard.js to a correct Express middleware =="
cat > "$DG" <<'JS'
// server/middleware/domainGuard.js
// CCG_DOMAIN_GUARD_V2 (do not remove)
//
// هدف: اگر لیست دامنه‌ها تعریف شده بود، فقط همان‌ها اجازه داشته باشند.
// اگر چیزی تعریف نشده بود => همه مجاز (برای اینکه سرویس نخوابد).
//
// env های قابل قبول:
// - CCG_ALLOWED_HOSTS="ccg.cando.ac,localhost,127.0.0.1"
// - ALLOWED_HOSTS="..."

function parseAllowed(raw) {
  return String(raw || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function domainGuard(req, res, next) {
  try {
    const raw =
      process.env.CCG_ALLOWED_HOSTS ||
      process.env.ALLOWED_HOSTS ||
      "";

    const allowed = parseAllowed(raw);

    // اگر چیزی تنظیم نشده، کلاً گارد را غیرفعال کن (سرویس باید بالا بیاید)
    if (!allowed.length) return next();

    const xfHost = (req.headers["x-forwarded-host"] || "").toString();
    const hostHeader = (xfHost || req.headers.host || "").toString();
    const host = hostHeader.split(",")[0].trim().split(":")[0].toLowerCase();

    if (!host) return next();

    if (allowed.includes(host)) return next();

    res.status(403).json({
      ok: false,
      error: "Host not allowed",
      host,
      allowed,
    });
  } catch (e) {
    // fail-open: اگر گارد خودش خراب شد، سرویس نخوابد
    return next();
  }
}
JS
echo "✅ domainGuard.js rewritten"

echo "== 2) Patch server.js: ensure domainGuard is used as middleware (app.use(domainGuard)) =="

python3 - <<'PY'
import os, re, sys

server_path = os.path.expanduser("~/CCG/server.js")
src = open(server_path, "r", encoding="utf-8", errors="ignore").read()

# اگر import ندارد، اضافه کن (نزدیک بالا بعد از importها)
if re.search(r'from\s+[\'"].*/middleware/domainGuard\.js[\'"]', src) is None:
    m = re.search(r'(?m)^\s*import\s+.*?;\s*$', src)
    if m:
        # بعد از آخرین import، اضافه کن
        imports = list(re.finditer(r'(?m)^\s*import\s+.*?;\s*$', src))
        last = imports[-1].end()
        src = src[:last] + '\nimport domainGuard from "./server/middleware/domainGuard.js";\n' + src[last:]
    else:
        # اگر ساختار خاص بود، ابتدای فایل اضافه کن
        src = 'import domainGuard from "./server/middleware/domainGuard.js";\n' + src

# هر نوع فراخوانی اشتباه domainGuard(...) را اصلاح کن
# مثال‌های رایج خراب:
# domainGuard(req,res) یا domainGuard(app) یا app.use(domainGuard(...))
src2 = src

# app.use(domainGuard(...)) -> app.use(domainGuard)
src2 = re.sub(r'(?m)^\s*app\.use\(\s*domainGuard\s*\([^)]*\)\s*\)\s*;?\s*$',
              'app.use(domainGuard); // CCG_DOMAIN_GUARD_V2\n', src2)

# domainGuard(...) به صورت تنها در یک خط -> app.use(domainGuard)
src2 = re.sub(r'(?m)^\s*domainGuard\s*\([^)]*\)\s*;?\s*$',
              'app.use(domainGuard); // CCG_DOMAIN_GUARD_V2\n', src2)

# اگر اصلاً app.use(domainGuard) وجود ندارد، بعد از ساخت app اضافه کن
if "app.use(domainGuard)" not in src2:
    m = re.search(r'(?m)^\s*const\s+app\s*=\s*express\(\)\s*;?\s*$', src2)
    if m:
        insert_at = m.end()
        src2 = src2[:insert_at] + '\napp.use(domainGuard); // CCG_DOMAIN_GUARD_V2\n' + src2[insert_at:]
    else:
        # fallback: نزدیک ابتدای فایل اضافه کن
        src2 = 'app.use(domainGuard); // CCG_DOMAIN_GUARD_V2\n' + src2

open(server_path, "w", encoding="utf-8").write(src2)
print("✅ server.js patched for correct domainGuard usage")
PY

echo "== 3) Syntax check =="
node --check "$DG"
node --check "$SERVER"

echo "== 4) Restart PM2 =="
pm2 restart ccg --update-env || true

echo "== 5) Show recent logs (last 60) =="
pm2 logs ccg --lines 60 --nostream || true

echo "== 6) Detect LISTEN port =="
PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
echo "PM2 PID: ${PID:-<none>}"

PORT="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' | sed 's/.*://g' | grep -E '^[0-9]+$' | head -n 1 || true)"

if [ -z "${PORT:-}" ]; then
  echo "❌ هنوز هیچ پورتی LISTEN نیست. علت دقیق در pm2 error log بالاست."
  echo "Backup: $BK"
  exit 2
fi

echo "✅ Backend LISTEN on: $PORT"

echo "== 7) Local tests =="
echo "--- GET /api/ccg/ping ---"
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 30 || true

echo "--- POST /api/ccg ---"
curl -sS --max-time 45 -H "Content-Type: application/json" \
  -d '{"lang":"fa","user_request":"میخام سیستم رو ریستارت کنم","os":"linux","cli":"bash","knowledgeLevel":"beginner","outputType":"command"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -c 900; echo

echo "✅ DONE. Backup: $BK"

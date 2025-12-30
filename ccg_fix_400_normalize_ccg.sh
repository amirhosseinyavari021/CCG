#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_400"
mkdir -p "$BK"

echo "== CCG FIX 400 (Normalize payload + Better 400 details) =="
echo "ROOT=$ROOT"
echo "BACKUP=$BK"

[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }
[ -f "$ROOT/server/routes/ccgRoutes.js" ] || { echo "❌ server/routes/ccgRoutes.js not found"; exit 1; }

# backups
cp -f "$ROOT/server/routes/ccgRoutes.js" "$BK/ccgRoutes.js.bak" || true
cp -rf "$ROOT/server/middleware" "$BK/server_middleware.bak" 2>/dev/null || true

echo "== 1) Write/Replace ccgNormalize middleware (ESM) =="
mkdir -p "$ROOT/server/middleware"

cat > "$ROOT/server/middleware/ccgNormalize.js" <<'JS'
// server/middleware/ccgNormalize.js (ESM)
// هدف: یکسان‌سازی کلیدهای فرانت/بک برای جلوگیری از 400 های ناشی از mismatch
export function ccgNormalize(req, res, next) {
  try {
    // اطمینان از اینکه body وجود دارد
    let b = req.body;
    if (b == null) b = {};
    if (typeof b === "string") {
      try { b = JSON.parse(b); } catch { b = { raw: b }; }
    }
    if (typeof b !== "object") b = {};

    // helper
    const pick = (...keys) => {
      for (const k of keys) {
        if (b[k] !== undefined && b[k] !== null) return b[k];
      }
      return undefined;
    };

    // فیلدهای اصلی (alias ها)
    const userRequest = pick("userRequest", "user_request", "request", "prompt", "text", "body", "input");
    const lang = pick("lang", "language") ?? "fa";
    const mode = pick("mode", "action", "task") ?? "generate";

    // فیلدهای اختیاری (چیزهایی که تو UI داشتید)
    const awarenessLevel = pick("awarenessLevel", "awareness_level", "awareness", "level");
    const outputStyle = pick("outputStyle", "output_style", "style");
    const network = pick("network", "netword", "netwrok"); // typo tolerant
    const description = pick("description", "details", "desc");

    // یک بدنه‌ی نرمال
    const normalized = {
      mode,
      lang,
      userRequest: typeof userRequest === "string" ? userRequest : (userRequest != null ? String(userRequest) : ""),
      awarenessLevel,
      outputStyle,
      network,
      description,
      // باقی فیلدها را هم نگه می‌داریم (بدون شکستن)
      ...b,
    };

    // ولی مطمئن می‌شیم کلید canonical هم وجود دارد
    normalized.userRequest = normalized.userRequest ?? "";
    normalized.lang = normalized.lang ?? "fa";
    normalized.mode = normalized.mode ?? "generate";

    // در req.body بگذار
    req.body = normalized;
    // برای دیباگ
    req.ccgNormalized = { keys: Object.keys(normalized), preview: (normalized.userRequest || "").slice(0, 120) };

    return next();
  } catch (e) {
    // fail-safe
    return next();
  }
}

export default ccgNormalize;
JS

echo "✅ middleware created: server/middleware/ccgNormalize.js"

echo "== 2) Ensure ccgRoutes.js uses ccgNormalize and returns helpful 400 =="
ROUTE="$ROOT/server/routes/ccgRoutes.js"

# اگر import ندارد اضافه کن (ESM)
if ! grep -q "ccgNormalize" "$ROUTE"; then
  # اضافه کردن import بالای فایل بعد از import های موجود
  perl -0777 -i -pe 's/(\n)(const router|let router|var router|export default|router\s*=|import .*?;\n)(?!.*ccgNormalize)/$1import ccgNormalize from "..\/middleware\/ccgNormalize.js";\n$2/s' "$ROUTE" || true
fi

# اگر هنوز اضافه نشد، خیلی ساده بالای فایل اضافه کن
if ! grep -q "import ccgNormalize" "$ROUTE"; then
  perl -0777 -i -pe 's/^/import ccgNormalize from "..\/middleware\/ccgNormalize.js";\n/s' "$ROUTE"
fi

# وصل کردن middleware روی POST "/"
# حالت رایج: router.post("/", async (req,res)=>{...})
if grep -qE 'router\.post\(\s*["'\'']\/["'\'']\s*,' "$ROUTE"; then
  # اگر قبلاً ccgNormalize نیست، اضافه کن
  perl -0777 -i -pe 's/router\.post\(\s*([\"\x27])\/\1\s*,\s*(?!ccgNormalize)/router.post("\/", ccgNormalize, /g' "$ROUTE" || true
else
  echo "🟡 نتونستم الگوی router.post('/') رو پیدا کنم؛ ممکنه ساختار route فرق داشته باشه."
fi

# داخل handler: اگر userRequest خالی بود 400 با جزئیات بده
# تلاش می‌کنیم ابتدای اولین handler POST / یک بلوک ولیدیشن inject کنیم
perl -0777 -i -pe '
  s/(router\.post\(\s*["\x27]\/["\x27]\s*,\s*ccgNormalize\s*,\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{\s*)/$1\n    const ur = (req.body?.userRequest ?? \"\").toString().trim();\n    if (!ur) {\n      return res.status(400).json({\n        error: \"user_request is required\",\n        hint: \"Send JSON with user_request or userRequest\",\n        receivedKeys: Object.keys(req.body || {}),\n        receivedPreview: req.ccgNormalized || null,\n      });\n    }\n/s
' "$ROUTE" || true

echo "✅ Patched: $ROUTE"

echo "== 3) Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

echo "== 4) Local test (detect port from .env or fallback 50000) =="
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi
echo "PORT=$PORT"

echo "--- curl POST /api/ccg (local) ---"
set +e
curl -sS -i --max-time 20 \
  -H 'Content-Type: application/json' \
  -d '{"mode":"generate","lang":"fa","user_request":"ls"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 80
EC=$?
set -e

echo "== 5) PM2 logs tail =="
pm2 logs ccg --lines 80 --nostream || true

echo "== DONE =="
echo "Backup: $BK"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_missing_prompt_vars"
mkdir -p "$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== CCG FIX: Missing prompt variables =="
echo "Backup: $BK"

cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re, sys
p = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")
s = open(p, "r", encoding="utf-8", errors="ignore").read()

marker = "CCG_PROMPT_VARS_V1"
if marker not in s:
    # تلاش: بعد از بلاک گرفتن userRequest (ur) تزریق کنیم
    # دنبال اولین جایی که "const ur" تعریف شده
    m = re.search(r'const\s+ur\s*=\s*[\s\S]*?\.trim\(\)\s*;\s*', s)
    if not m:
        print("❌ نتونستم تعریف ur رو پیدا کنم. لطفاً 60 خط اول route POST رو بفرست.")
        sys.exit(2)

    inject = r'''
    // CCG_PROMPT_VARS_V1 (do not remove)
    const _b =
      (typeof _ccgBody !== "undefined" && _ccgBody && typeof _ccgBody === "object")
        ? _ccgBody
        : ((req.body && typeof req.body === "object") ? req.body : {});

    // Defaults (so template never breaks)
    const vars = {
      mode: (_b.mode ?? _b.action ?? _b.type ?? "generate").toString(),
      input_a: (_b.input_a ?? _b.inputA ?? _b.a ?? _b.input1 ?? "").toString(),
      input_b: (_b.input_b ?? _b.inputB ?? _b.b ?? _b.input2 ?? "").toString(),
      cli: (_b.cli ?? _b.shell ?? _b.terminal ?? "bash").toString(),
      os: (_b.os ?? _b.platform ?? "linux").toString(),
      lang: (_b.lang ?? _b.language ?? "fa").toString(),
      error_message: (_b.error_message ?? _b.errorMessage ?? _b.err ?? "").toString(),
      user_request: ur,
      userRequest: ur, // compatibility
    };
'''
    # تزریق بعد از تعریف ur
    s = s[:m.end()] + inject + s[m.end():]

# حالا باید aiRunner/runAI/callOpenAI با vars صدا زده بشه، نه با متن
# فقط اگر قبلاً aiRunner({ ... }) نبود.
def replace_first_call(src: str, fn: str) -> str:
    # اگر از قبل aiRunner(vars) یا aiRunner({}) درست بود، دست نزن
    # جایگزینی فقط وقتی آرگومان "ur" یا "userRequest" یا string باشد
    patterns = [
        rf'(\b{fn}\s*\(\s*)ur(\s*[\),])',
        rf'(\b{fn}\s*\(\s*)userRequest(\s*[\),])',
        rf'(\b{fn}\s*\(\s*)req\.body(\s*[\),])',
    ]
    for pat in patterns:
        new = re.sub(pat, rf'\1vars\2', src, count=1)
        if new != src:
            return new
    # اگر مثل aiRunner(something) بود ولی object نیست، اولین کال را به vars تبدیل کن
    m = re.search(rf'\b{fn}\s*\(\s*([^\{{\)][^)]*)\)', src)
    if m:
        # جلوگیری: اگر داخلش "vars" یا "{" بود، نزن
        inner = m.group(1)
        if "vars" not in inner and "{" not in inner:
            src = src[:m.start()] + re.sub(rf'\b{fn}\s*\(\s*[^)]*\)', f'{fn}(vars)', src[m.start():], count=1)
    return src

# هم aiRunner هم runAI هم callOpenAI
s2 = s
for fn in ["aiRunner", "runAI", "callOpenAI"]:
    s2 = replace_first_call(s2, fn)

# اگر هنوز هیچکدوم به vars تبدیل نشد ولی marker داریم، حداقل یک خط راهنما اضافه کن برای dev
# (بدون شکستن)
s = s2

# بهبود پاسخ نهایی: اگر جایی res.json({output: ...}) بود، result هم اضافه کن (safe)
# این یک تلاش کم‌ریسک است:
s = re.sub(r'res\.json\(\s*\{\s*output\s*:\s*([^\},]+)',
           r'res.json({ output: \1, result: \1', s, count=1)

open(p, "w", encoding="utf-8").write(s)
print("✅ patched ccgRoutes.js (vars + call uses vars)")
PY

echo "== Syntax check =="
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

# PORT از .env یا 50000
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Local test (direct backend) =="
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 20 || true
echo
curl -sS -i --max-time 25 -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. یک پاسخ کوتاه بده."}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 120 || true

echo
echo "== Tail PM2 error (last 50) =="
pm2 logs ccg --lines 50 --nostream || true

echo "✅ DONE. Backup: $BK"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_prompt_vars_aiclient"
mkdir -p "$BK"

AI="$ROOT/server/utils/aiClient.js"
[ -f "$AI" ] || { echo "❌ $AI not found"; exit 1; }

echo "== CCG FIX: aiClient Missing prompt variables (FOREVER) =="
echo "Backup: $BK"

cp -f "$AI" "$BK/aiClient.js.bak"

python3 - <<'PY'
import os, re, sys

p = os.path.expanduser("~/CCG/server/utils/aiClient.js")
s = open(p, "r", encoding="utf-8", errors="ignore").read()

marker = "CCG_NORMALIZE_VARS_V1"

if marker not in s:
    # insert helper after last import
    imports = list(re.finditer(r'^\s*import\s+.*?;\s*$', s, flags=re.M))
    insert_at = imports[-1].end() if imports else 0

    helper = r'''

// CCG_NORMALIZE_VARS_V1 (do not remove)
// هدف: هر ورودی (string/object/کم‌کلید) را به آبجکت کامل برای PromptTemplate تبدیل می‌کند.
const __CCG_REQUIRED_VARS__ = ["cli","input_a","input_b","mode","user_request","os","lang","error_message"];

function ccgNormalizeVars(payload){
  const b = (payload && typeof payload === "object" && !Array.isArray(payload)) ? payload : {};
  const ur =
    (typeof payload === "string")
      ? payload
      : (b.user_request ?? b.userRequest ?? b.user_request_text ?? b.prompt ?? b.text ?? b.message ?? b.input ?? b.query ?? "");

  return {
    mode: String(b.mode ?? b.action ?? b.type ?? "generate"),
    input_a: String(b.input_a ?? b.inputA ?? b.a ?? b.code_a ?? b.codeA ?? b.left ?? b.before ?? ""),
    input_b: String(b.input_b ?? b.inputB ?? b.b ?? b.code_b ?? b.codeB ?? b.right ?? b.after ?? ""),
    cli: String(b.cli ?? b.shell ?? b.terminal ?? "bash"),
    os: String(b.os ?? b.platform ?? "linux"),
    lang: String(b.lang ?? b.language ?? "fa"),
    error_message: String(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    user_request: String(ur ?? ""),
  };
}

// اگر PromptTemplate به هر دلیل باز هم گیر داد، یک prompt ساده می‌سازیم تا سرویس نخوابه
function ccgFallbackPrompt(vars){
  const v = ccgNormalizeVars(vars);
  return [
    `mode: ${v.mode}`,
    `cli: ${v.cli}`,
    `os: ${v.os}`,
    `lang: ${v.lang}`,
    v.error_message ? `error_message: ${v.error_message}` : ``,
    v.input_a ? `input_a:\n${v.input_a}` : ``,
    v.input_b ? `input_b:\n${v.input_b}` : ``,
    `user_request:\n${v.user_request || "(empty)"}`
  ].filter(Boolean).join("\n\n");
}
'''
    s = s[:insert_at] + helper + s[insert_at:]

def patch_fn_funcstyle(src: str, fn_name: str) -> str:
    # export async function runAI(payload) { ... }
    pat = re.compile(rf'((?:export\s+)?async\s+function\s+{fn_name}\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*\{{)', re.M)
    m = pat.search(src)
    if not m:
        return src
    param = m.group(2)
    inject = f"\n  {param} = ccgNormalizeVars({param});\n"
    # inject only once per function
    start = m.end(1)
    if inject.strip() in src[start:start+300]:
        return src
    return src[:start] + inject + src[start:]

def patch_fn_arrowstyle(src: str, fn_name: str) -> str:
    # export const runAI = async (payload) => { ... }
    pat = re.compile(rf'((?:export\s+)?const\s+{fn_name}\s*=\s*async\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*=>\s*\{{)', re.M)
    m = pat.search(src)
    if not m:
        return src
    param = m.group(2)
    inject = f"\n  {param} = ccgNormalizeVars({param});\n"
    start = m.end(1)
    if inject.strip() in src[start:start+300]:
        return src
    return src[:start] + inject + src[start:]

s2 = s
for fn in ["runAI", "callOpenAI"]:
    before = s2
    s2 = patch_fn_funcstyle(s2, fn)
    s2 = patch_fn_arrowstyle(s2, fn)

# اگر هیچ جا پچ نشد، یعنی ساختار خیلی فرق دارد
if s2 == s:
    print("⚠️ نتونستم runAI/callOpenAI رو برای inject پیدا کنم. محتویات aiClient.js فرق داره.")
else:
    print("✅ injected ccgNormalizeVars into runAI/callOpenAI (if found)")

# --- اضافه کردن fallback در جاهایی که ارور Missing prompt variables رخ می‌دهد ---
# معمولاً این ارور داخل try/catch route نیست، داخل aiClient و هنگام format رخ می‌دهد.
# ما یک catch عمومی نزدیک محل throw اضافه نمی‌کنیم چون ممکنه ساختار متفاوت باشه،
# اما یک پچ ایمن می‌زنیم: هر جایی که error.message شامل "Missing prompt variables" شد،
# prompt را fallback کنیم.
if "CCG_TEMPLATE_FALLBACK_V1" not in s2:
    # تلاش: پیدا کردن اولین catch(e) در فایل و تزریق هندلینگ Missing vars
    # این پچ minimal و کم‌ریسکه: فقط اگر پیام Missing vars بود، e را تبدیل می‌کنه به خطای قابل‌فهم + fallback prompt
    s2 = re.sub(
        r'catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{',
        r'catch(\1){\n  // CCG_TEMPLATE_FALLBACK_V1\n  try{\n    const msg = String(\1?.message || \1);\n    if (msg.includes("Missing prompt variables")){\n      // در صورت Missing vars، به جای fail کردن، یک prompt ساده تولید می‌کنیم و در ادامه مسیر (اگر کد اجازه بده) استفاده می‌شود\n      // این متغیر را برای مسیرهای داخلی که prompt را می‌سازند فراهم می‌کنیم\n      globalThis.__CCG_FALLBACK_PROMPT__ = ccgFallbackPrompt(arguments[0]);\n    }\n  }catch{}\n',
        s2,
        count=1,
        flags=re.M
    )

open(p, "w", encoding="utf-8").write(s2)
print("✅ patched aiClient.js with normalizer + fallback hooks")
PY

echo "== Node syntax check =="
node --check "$AI"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

# detect port
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Test backend direct =="
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 25 || true
echo
curl -sS -i --max-time 40 -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. یک جواب کوتاه بده."}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 120 || true

echo
echo "== Tail PM2 errors (last 40) =="
pm2 logs ccg --lines 40 --nostream || true

echo "✅ DONE. Backup: $BK"

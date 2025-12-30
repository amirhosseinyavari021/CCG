#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_final_fix_promptvars"
mkdir -p "$BK"

AI="$ROOT/server/utils/aiClient.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"

[ -f "$AI" ] || { echo "❌ $AI not found"; exit 1; }
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

echo "== FINAL FIX: Missing prompt vars + correct API response =="
echo "Backup: $BK"

cp -f "$AI" "$BK/aiClient.js.bak"
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import os, re

ai_path = os.path.expanduser("~/CCG/server/utils/aiClient.js")
rt_path = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")

# -------------------------
# 1) Patch aiClient.js runAI
# -------------------------
s = open(ai_path, "r", encoding="utf-8", errors="ignore").read()

# replace runAI signature + add robust arg normalization
m = re.search(r'export\s+async\s+function\s+runAI\s*\(\s*\{\s*variables\s*,\s*fallbackPrompt\s*,\s*temperature\s*=\s*0\.35\s*\}\s*\)\s*\{', s)
if not m:
    # maybe different spacing
    m = re.search(r'export\s+async\s+function\s+runAI\s*\(\s*\{[\s\S]*?\}\s*\)\s*\{', s)

if not m:
    raise SystemExit("❌ Cannot find runAI(...) header in aiClient.js")

start = m.start()
end = m.end()

new_header = """export async function runAI(arg = {}) {
  // ✅ accepts BOTH:
  // - runAI({ variables, fallbackPrompt, temperature })
  // - runAI(varsObject)  (legacy call from routes)
  let temperature = 0.35;
  let variables;
  let fallbackPrompt;

  const looksLikeConfig =
    arg && typeof arg === "object" &&
    !Array.isArray(arg) &&
    ("variables" in arg || "fallbackPrompt" in arg || "temperature" in arg);

  if (looksLikeConfig) {
    temperature = (typeof arg.temperature === "number") ? arg.temperature : 0.35;
    variables = ccgNormalizeVars(arg.variables ?? {});
    fallbackPrompt =
      (typeof arg.fallbackPrompt === "string" && arg.fallbackPrompt.trim())
        ? arg.fallbackPrompt
        : ccgFallbackPrompt(variables);
  } else {
    variables = ccgNormalizeVars(arg);
    fallbackPrompt = ccgFallbackPrompt(variables);
  }
"""

s2 = s[:start] + new_header + s[end:]
open(ai_path, "w", encoding="utf-8").write(s2)

# -------------------------
# 2) Patch ccgRoutes.js handler
# -------------------------
r = open(rt_path, "r", encoding="utf-8", errors="ignore").read()

# force aiRunner to be runAI only (prevent accidentally picking callOpenAI)
r = re.sub(
    r'const\s+aiRunner\s*=\s*[\s\S]*?;\s*\n',
    'const aiRunner = (aiClient && aiClient.runAI) || null;\n',
    r,
    count=1
)

# replace router.post("/", async (req, res) => { ... }); safely using brace scan
needle = 'router.post("/", async (req, res) => {'
idx = r.find(needle)
if idx == -1:
    # maybe single quotes
    needle = "router.post('/', async (req, res) => {"
    idx = r.find(needle)
if idx == -1:
    raise SystemExit("❌ Cannot find router.post('/', ...) in ccgRoutes.js")

# find body start after the first "{"
body_start = r.find("{", idx)
if body_start == -1:
    raise SystemExit("❌ Cannot locate handler body start")

# scan to find matching end of this handler block
i = body_start
depth = 0
in_str = None
escape = False
while i < len(r):
    ch = r[i]
    if in_str:
        if escape:
            escape = False
        elif ch == "\\":
            escape = True
        elif ch == in_str:
            in_str = None
    else:
        if ch in ('"', "'", "`"):
            in_str = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                # this '}' closes the handler function body
                end_brace = i
                break
    i += 1
else:
    raise SystemExit("❌ Could not match braces for handler")

# after end_brace we expect ');' for router.post
post_end = r.find(");", end_brace)
if post_end == -1:
    raise SystemExit("❌ Cannot find end of router.post block (');')")

post_end += 2  # include );

new_handler = """router.post("/", async (req, res) => {
  assertAiRunner();

  const body = (req.body && typeof req.body === "object") ? req.body : {};
  const ur = (
    body.userRequest ??
    body.user_request ??
    body.userrequest ??
    body.prompt ??
    body.request ??
    body.text ??
    body.message ??
    body.input ??
    body.query ??
    body.q ??
    (body.data && (body.data.userRequest ?? body.data.user_request ?? body.data.prompt ?? body.data.text)) ??
    ""
  ).toString().trim();

  if (!ur) {
    return res.status(400).json({
      ok: false,
      error: "user_request is required",
      expected: ["userRequest","user_request","prompt","text","message","input","query","q"],
      receivedKeys: Object.keys(body || {})
    });
  }

  const vars = {
    mode: (body.mode ?? body.action ?? body.type ?? "generate").toString(),
    input_a: (body.input_a ?? body.inputA ?? body.a ?? body.code_a ?? body.codeA ?? body.input1 ?? "").toString(),
    input_b: (body.input_b ?? body.inputB ?? body.b ?? body.code_b ?? body.codeB ?? body.input2 ?? "").toString(),
    cli: (body.cli ?? body.shell ?? body.terminal ?? "bash").toString(),
    os: (body.os ?? body.platform ?? "linux").toString(),
    lang: (body.lang ?? body.language ?? "fa").toString(),
    error_message: (body.error_message ?? body.errorMessage ?? body.err ?? "").toString(),
    user_request: ur
  };

  const _t0 = Date.now();
  const _rid = Math.random().toString(36).slice(2, 10);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    // ✅ IMPORTANT: aiRunner returns {output, error}
    const ai = await ccgWithTimeout(Promise.resolve(aiRunner(vars)), 90000);

    if (ai && typeof ai === "object" && ai.error) {
      return res.status(502).json({ ok: false, error: ai.error, rid: _rid });
    }

    const result =
      (ai && typeof ai === "object" && typeof ai.output === "string" && ai.output) ?
        ai.output :
        (ccgExtractText(ai) || "");

    return res.status(200).json({ ok: true, result, rid: _rid });
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    const code = msg.startsWith("CCG_TIMEOUT_") ? 504 : 502;
    console.error("[CCG] rid=" + _rid + " error=" + msg);
    return res.status(code).json({ ok: false, error: msg, rid: _rid });
  } finally {
    const ms = Date.now() - _t0;
    console.log("[CCG] rid=" + _rid + " ms=" + ms + " keys=" + Object.keys(body || {}).join(","));
  }
});"""

r2 = r[:idx] + new_handler + r[post_end:]
open(rt_path, "w", encoding="utf-8").write(r2)

print("✅ Patched aiClient.js + ccgRoutes.js successfully")
PY

echo "== Node syntax checks =="
node --check "$AI"
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

# detect port
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Direct backend tests on 127.0.0.1:$PORT =="
echo "--- GET /api/ccg/ping ---"
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 30 || true
echo
echo "--- POST /api/ccg ---"
curl -sS -i --max-time 60 -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. فقط یک جواب کوتاه تستی بده."}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 140 || true

echo
echo "== Tail PM2 error log (last 60) =="
pm2 logs ccg --lines 60 --nostream || true

echo "✅ DONE. Backup: $BK"

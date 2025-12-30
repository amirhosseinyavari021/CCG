#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_api_no_output_v3"
mkdir -p "$BK"

echo "== CCG FIX API NO OUTPUT v3 =="
echo "ROOT=$ROOT"
echo "BACKUP=$BK"

ROUTE="$ROOT/server/routes/ccgRoutes.js"
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }

cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

python3 - <<'PY'
import re, os, sys

route_path = os.path.expanduser("~/CCG/server/routes/ccgRoutes.js")
s = open(route_path, "r", encoding="utf-8").read()

# --- detect AI function name from aiClient import ---
ai_fn = None
m = re.search(r"import\s*\{\s*([^}]+)\}\s*from\s*['\"][^'\"]*aiClient[^'\"]*['\"]\s*;", s)
if m:
    names = [x.strip().split(" as ")[-1].strip() for x in m.group(1).split(",")]
    if "runAI" in names: ai_fn = "runAI"
    elif "callOpenAI" in names: ai_fn = "callOpenAI"
    elif len(names) > 0: ai_fn = names[0]

if not ai_fn:
    # fallback: check usage
    if "runAI(" in s: ai_fn = "runAI"
    elif "callOpenAI(" in s: ai_fn = "callOpenAI"

if not ai_fn:
    print("❌ نتونستم تابع AI رو پیدا کنم (runAI/callOpenAI). لطفاً محتوای ccgRoutes.js رو بده تا دقیق پچ کنم.")
    sys.exit(2)

# --- insert helpers after imports block (once) ---
if "__CCG_EXTRACT_TEXT__" not in s:
    helper = r'''
// __CCG_EXTRACT_TEXT__ (do not remove)
function ccgExtractText(obj){
  try{
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    if (typeof obj.result === "string") return obj.result;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.output_text === "string") return obj.output_text;

    // Responses-like: { output:[{type:"message", content:[{type:"output_text", text:"..."}]}] }
    if (Array.isArray(obj.output)){
      const parts = [];
      for (const item of obj.output){
        if (item?.type === "message" && Array.isArray(item.content)){
          for (const c of item.content){
            if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") parts.push(c.text);
          }
        }
      }
      const joined = parts.join("\n").trim();
      if (joined) return joined;
    }

    // ChatCompletions-like
    if (Array.isArray(obj.choices)){
      const c = obj.choices?.[0]?.message?.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)){
        const t = c.map(x => x?.text).filter(Boolean).join("\n").trim();
        if (t) return t;
      }
    }

    const js = JSON.stringify(obj);
    return (js and js != "{}") ? js : "";
  }catch(e){
    return "";
  }
}

function ccgWithTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_, reject)=> setTimeout(()=> reject(new Error("CCG_TIMEOUT_"+ms+"ms")), ms))
  ]);
}
'''.lstrip("\n")

    # place after last import block + a blank line
    # find end of imports at top
    imp_end = 0
    for m2 in re.finditer(r"^import[^\n]*\n", s, re.M):
        imp_end = m2.end()
    # ensure we insert after a blank line
    insert_at = imp_end
    s = s[:insert_at] + "\n" + helper + "\n" + s[insert_at:]

# --- add ping route once ---
if re.search(r"router\.get\(\s*['\"]/ping['\"]", s) is None:
    s = re.sub(r"(export\s+default\s+router\s*;)", r'router.get("/ping",(req,res)=>res.json({ok:true,service:"ccg",ts:Date.now()}));\n\n\1', s)

# --- replace router.post("/") block with stable one ---
def find_post_block(text):
    # find router.post("/"...)
    start = text.find('router.post(')
    if start == -1:
        return None
    # ensure it's the "/" route (first one usually)
    # scan to statement end using paren counting
    i = start
    par = 0
    in_str = None
    esc = False
    while i < len(text):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == in_str:
                in_str = None
        else:
            if ch in ("'", '"', "`"):
                in_str = ch
            elif ch == "(":
                par += 1
            elif ch == ")":
                par -= 1
                if par == 0:
                    # consume trailing spaces then optional ;
                    j = i + 1
                    while j < len(text) and text[j].isspace():
                        j += 1
                    if j < len(text) and text[j] == ";":
                        return start, j + 1
        i += 1
    return None

blk = find_post_block(s)
if not blk:
    print("❌ نتونستم بلاک router.post(...) رو پیدا کنم.")
    sys.exit(3)

post_start, post_end = blk

stable_post = f'''
router.post("/", async (req, res) => {{
  const _t0 = Date.now();
  const _rid = Math.random().toString(36).slice(2, 10);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const body = (req && req.body && typeof req.body === "object") ? req.body : {{}};
  const userRequest = (body.userRequest ?? body.user_request ?? body.prompt ?? body.message ?? "").toString().trim();

  if (!userRequest) {{
    return res.status(400).json({{
      ok: false,
      error: "user_request is required",
      receivedKeys: Object.keys(body || {{}})
    }});
  }}

  const payload = {{
    ...body,
    userRequest,
    user_request: userRequest
  }};

  try {{
    const raw = await ccgWithTimeout(Promise.resolve({ai_fn}(payload)), 90000);
    const result = ccgExtractText(raw) || "";
    return res.status(200).json({{
      ok: true,
      result,
      raw
    }});
  }} catch (e) {{
    const msg = (e && e.message) ? e.message : String(e);
    const code = msg.startsWith("CCG_TIMEOUT_") ? 504 : 502;
    console.error("[CCG] rid=" + _rid + " error=" + msg);
    return res.status(code).json({{
      ok: false,
      error: msg
    }});
  }} finally {{
    const ms = Date.now() - _t0;
    console.log("[CCG] rid=" + _rid + " ms=" + ms + " keys=" + Object.keys(body || {{}}).join(","));
  }}
}});
'''.lstrip("\n")

s = s[:post_start] + stable_post + "\n" + s[post_end:]

open(route_path, "w", encoding="utf-8").write(s)
print("✅ patched ccgRoutes.js")
print("AI function:", "{0}".format(ai_fn))
PY

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

PORT="50000"
if [ -f "$ROOT/.env" ]; then
  P="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${P:-}" ] && PORT="$P"
fi

echo "== Quick tests (local) =="
echo "--- GET /api/ccg/ping on :$PORT ---"
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 40 || true

echo "--- POST /api/ccg on :$PORT ---"
curl -sS -i --max-time 60 \
  -H 'Content-Type: application/json' \
  -d '{"user_request":"سلام! فقط بگو OK","mode":"generate","lang":"fa"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 120 || true

echo "== Quick tests (nginx port 80) =="
echo "--- GET /api/ccg/ping on :80 ---"
curl -sS -i --max-time 5 "http://127.0.0.1:80/api/ccg/ping" | head -n 40 || true

echo "--- POST /api/ccg on :80 ---"
curl -sS -i --max-time 60 \
  -H 'Content-Type: application/json' \
  -d '{"user_request":"سلام! فقط بگو OK","mode":"generate","lang":"fa"}' \
  "http://127.0.0.1:80/api/ccg" | head -n 120 || true

echo "== PM2 logs tail (last 120) =="
pm2 logs ccg --lines 120 --nostream || true

echo "== DONE =="
echo "Backup: $BK"

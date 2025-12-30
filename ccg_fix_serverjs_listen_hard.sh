#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_serverjs_listen_hard"
mkdir -p "$BK"

SERVER="$ROOT/server.js"

echo "== HARD FIX server.js listen() =="
echo "Backup: $BK"
echo "File:   $SERVER"

[ -f "$SERVER" ] || { echo "❌ server.js not found: $SERVER"; exit 1; }

cp -f "$SERVER" "$BK/server.js.before.bak"

python3 - <<'PY'
import os, re, sys

path = os.path.expanduser("~/CCG/server.js")
src = open(path, "r", encoding="utf-8", errors="ignore").read()

# cleanup common broken injected markers (safe)
src = re.sub(r'/\*\s*CCG_BIND_[^*]*\*/', '', src)
src = re.sub(r'//\s*CCG_BIND_[^\n]*', '', src)

# Find an app.listen(...) call (prefer the one at line start)
m = re.search(r'(?m)^[ \t]*(?:const|let|var)?[ \t]*server[ \t]*=[ \t]*app\.listen\(', src)
if not m:
  m = re.search(r'(?m)^[ \t]*app\.listen\(', src)

if not m:
  print("❌ Could not find app.listen( ... ) in server.js")
  sys.exit(2)

start = m.start()
listen_pos = src.find("app.listen", start)
open_paren = src.find("(", listen_pos)
if open_paren == -1:
  print("❌ Could not locate '(' for app.listen")
  sys.exit(3)

# small parser to find the end of the listen call safely
i = open_paren + 1
depth = 1
state = "code"  # code|sq|dq|bt|linecom|blockcom
while i < len(src) and depth > 0:
  ch = src[i]
  nxt = src[i+1] if i+1 < len(src) else ""

  if state == "code":
    if ch == "/" and nxt == "/":
      state = "linecom"; i += 2; continue
    if ch == "/" and nxt == "*":
      state = "blockcom"; i += 2; continue
    if ch == "'":
      state = "sq"; i += 1; continue
    if ch == '"':
      state = "dq"; i += 1; continue
    if ch == "`":
      state = "bt"; i += 1; continue
    if ch == "(":
      depth += 1
    elif ch == ")":
      depth -= 1
    i += 1
    continue

  if state == "linecom":
    if ch == "\n":
      state = "code"
    i += 1
    continue

  if state == "blockcom":
    if ch == "*" and nxt == "/":
      state = "code"; i += 2; continue
    i += 1
    continue

  if state in ("sq","dq"):
    q = "'" if state=="sq" else '"'
    if ch == "\\":
      i += 2; continue
    if ch == q:
      state = "code"; i += 1; continue
    i += 1
    continue

  if state == "bt":
    if ch == "\\":
      i += 2; continue
    if ch == "`":
      state = "code"; i += 1; continue
    i += 1
    continue

if depth != 0:
  print("❌ Could not find end of app.listen(...) (unbalanced parentheses)")
  sys.exit(4)

close_paren = i  # position right after ')'
# extend to the semicolon that ends the statement
semi = src.find(";", close_paren)
if semi == -1:
  print("❌ Could not find ';' after app.listen(...)")
  sys.exit(5)

end_stmt = semi + 1

# Determine indentation + prefix (keep 'const server = ' if exists)
line_start = src.rfind("\n", 0, start) + 1
indent_match = re.match(r'[ \t]*', src[line_start:start])
indent = indent_match.group(0) if indent_match else ""

prefix = src[start:listen_pos]  # may include 'const server = ' or just indent
# Normalize prefix: ensure it ends with space if it's an assignment
prefix = prefix.rstrip()

# Build replacement
# If prefix is just indentation (no assignment), keep indentation only.
if prefix.endswith("=") or "server" in prefix:
  # ensure it ends with '=' then one space
  if not prefix.endswith("="):
    # for cases like 'const server ='
    if prefix.endswith("server"):
      prefix = prefix + " ="
  prefix = prefix + " "
else:
  prefix = indent

replacement = (
  f"{prefix}app.listen(port, \"0.0.0.0\", () => {{\n"
  f"{indent}  console.log(`[CCG] listening on 0.0.0.0:${{port}}`);\n"
  f"{indent}}}); // CCG_LISTEN_FIX_V2\n"
)

new_src = src[:start] + replacement + src[end_stmt:]
open(path, "w", encoding="utf-8").write(new_src)
print("✅ Replaced app.listen(...) with a clean IPv4 bind (CCG_LISTEN_FIX_V2)")
PY

echo "== node --check server.js =="
node --check "$SERVER"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

echo "== PM2 logs (last 80) =="
pm2 logs ccg --lines 80 --nostream || true

echo "== Detect LISTEN port =="
PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
echo "PM2 PID: ${PID:-<none>}"

ss -lntp 2>/dev/null | grep -E "pid=${PID}," || true

PORT="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' | sed 's/.*://g' | grep -E '^[0-9]+$' | head -n 1 || true)"
if [ -z "${PORT:-}" ]; then
  echo "❌ Still no LISTEN port detected. Check pm2 logs above."
  echo "Backup: $BK"
  exit 2
fi

echo "✅ Backend is listening on port: $PORT"

echo "== Local tests =="
echo "--- GET /api/ccg/ping ---"
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 30 || true

echo "--- POST /api/ccg ---"
curl -sS --max-time 45 -H "Content-Type: application/json" \
  -d '{"lang":"fa","user_request":"میخام سیستم رو ریستارت کنم","os":"linux","cli":"bash","knowledgeLevel":"beginner","outputType":"command"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -c 800; echo

echo "✅ DONE. Backup: $BK"

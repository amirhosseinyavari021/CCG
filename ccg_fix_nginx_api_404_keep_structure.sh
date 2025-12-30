#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_nginx_api_404"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"
echo "== FIX NGINX 404 FOR /api/* (KEEP STRUCTURE) =="
echo "Backup: $BK"
echo "Site:   $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد"
  exit 1
fi

# backup current
sudo cp -f "$SITE" "$BK/ccg.before.bak"

# detect backend port from PM2/ENV (stable)
PORT="50000"
PID="$(pm2 pid ccg 2>/dev/null | tail -n 1 | tr -d ' ' || true)"
if [[ "${PID:-}" =~ ^[0-9]+$ ]]; then
  PFOUND="$(ss -lntp 2>/dev/null | awk -v pid="$PID" '$0 ~ ("pid="pid",") {print $4}' \
    | sed 's/.*://g' | grep -E '^[0-9]+$' | sort -n | uniq | head -n 1 || true)"
  [ -n "${PFOUND:-}" ] && PORT="$PFOUND"
fi
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi
echo "Backend PORT: $PORT" | tee "$BK/port.txt" >/dev/null

echo "== Patch nginx config (ensure location ^~ /api/ proxies to 127.0.0.1:${PORT}) =="
sudo python3 - <<PY
import re

path = "$SITE"
port = "$PORT"

raw = open(path, "rb").read()
# remove NUL + CRLF (structure-safe)
raw = raw.replace(b"\x00", b"").replace(b"\r\n", b"\n").replace(b"\r", b"\n")
s = raw.decode("utf-8", errors="ignore")

marker = "CCG_API_PROXY_FIX_V1"
api_block = f'''
    # {marker} (do not remove)
    location ^~ /api/ {{
        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }}
'''

def patch_existing_api_location(server_txt: str) -> str:
    # If an /api location exists, ensure proxy_pass is correct and has NO trailing slash (keeps /api prefix)
    # Handles location /api/ { ... } or location ^~ /api/ { ... }
    def repl(m):
        block = m.group(0)
        # fix proxy_pass lines inside this block
        block = re.sub(r'proxy_pass\s+http://127\.0\.0\.1:\d+/?\s*;', f'proxy_pass http://127.0.0.1:{port};', block)
        block = re.sub(r'proxy_pass\s+http://localhost:\d+/?\s*;', f'proxy_pass http://127.0.0.1:{port};', block)
        # if upstream name used with trailing slash => remove slash
        block = re.sub(r'(proxy_pass\s+http://[a-zA-Z0-9_\-\.]+)\/\s*;', r'\1;', block)
        # ensure it has proxy headers minimal (don’t duplicate too much)
        if "proxy_set_header Host" not in block:
            block = block.rstrip()[:-1] + "\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n"
        return block

    # patch location blocks
    server_txt2 = re.sub(r'location\s+\^~\s+/api/\s*\{[\s\S]*?\}', repl, server_txt)
    server_txt2 = re.sub(r'location\s+/api/\s*\{[\s\S]*?\}', repl, server_txt2)
    return server_txt2

def ensure_api_location(server_txt: str) -> str:
    if re.search(r'location\s+(\^~\s+)?/api/\s*\{', server_txt):
        return patch_existing_api_location(server_txt)

    # insert before first "location /" if exists, else before end of server block
    m = re.search(r'\n\s*location\s+/\s*\{', server_txt)
    if m:
        i = m.start()
        return server_txt[:i] + "\n" + api_block + server_txt[i:]
    # fallback: before last }
    j = server_txt.rfind("}")
    if j != -1:
        return server_txt[:j] + "\n" + api_block + "\n" + server_txt[j:]
    return server_txt

# Split into server blocks (simple)
parts = []
pos = 0
for m in re.finditer(r'\bserver\s*\{', s):
    start = m.start()
    parts.append(s[pos:start])
    # find matching closing brace naively by counting braces
    i = m.end()
    depth = 1
    while i < len(s) and depth > 0:
        if s[i] == "{": depth += 1
        elif s[i] == "}": depth -= 1
        i += 1
    server_block = s[start:i]
    # only patch if it seems like our vhost (contains ccg.cando.ac or /api references or root)
    if ("ccg.cando.ac" in server_block) or ("/api" in server_block):
        server_block = ensure_api_location(server_block)
    parts.append(server_block)
    pos = i
parts.append(s[pos:])
out = "".join(parts)

open(path, "w", encoding="utf-8").write(out)
print("✅ nginx patched (api location ensured/updated)")
PY

echo "== nginx -t =="
sudo nginx -t | tee "$BK/nginx_test.txt"

echo "== reload nginx =="
(sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || sudo nginx -s reload) || true

echo "== Tests =="
echo "--- direct node (should be JSON if route exists) ---"
set +e
curl -sS -i --max-time 4 "http://127.0.0.1:${PORT}/api/health" | head -n 20 | tee "$BK/curl_direct_health.txt"
curl -sS -i --max-time 4 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 20 | tee "$BK/curl_direct_ping.txt"

echo "--- nginx https with Host header (should NOT be html 404) ---"
curl -k -sS -i --max-time 8 "https://127.0.0.1/api/ccg/ping" -H "Host: ccg.cando.ac" | head -n 30 | tee "$BK/curl_nginx_ping.txt"
curl -k -sS -i --max-time 20 "https://127.0.0.1/api/ccg" -H "Host: ccg.cando.ac" -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام! تست","lang":"fa"}' | head -n 40 | tee "$BK/curl_nginx_post.txt"
set -e

echo "== DONE ✅ =="
echo "Backup folder: $BK"

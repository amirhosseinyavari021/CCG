#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_nginx_api_404_proxy_body"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"
DOMAIN="ccg.cando.ac"

echo "== FIX NGINX /api 404 -> PROXY TO BACKEND (SAFE) =="
echo "Backup: $BK"
echo "Site:   $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد"
  exit 1
fi

# detect backend port (prefer PM2 listen port; fallback 50000)
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

echo "== 0) Backup nginx site =="
sudo cp -f "$SITE" "$BK/ccg.before.bak"

echo "== 1) Direct backend test (should NOT be nginx html) =="
set +e
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/health" | head -n 25 | tee "$BK/curl_backend_health.txt"
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 25 | tee "$BK/curl_backend_ping.txt"
set -e

export _CCG_SITE="$SITE"
export _CCG_PORT="$PORT"
export _CCG_DOMAIN="$DOMAIN"

echo "== 2) Patch nginx: ensure location /api/ proxies to 127.0.0.1:${PORT} (keep structure) =="

sudo -E python3 - <<'PY'
import os, re

path = os.environ["_CCG_SITE"]
port = os.environ["_CCG_PORT"]
domain = os.environ["_CCG_DOMAIN"]

raw = open(path, "rb").read()
raw = raw.replace(b"\x00", b"").replace(b"\r\n", b"\n").replace(b"\r", b"\n")
txt = raw.decode("utf-8", errors="ignore")
lines = txt.splitlines(True)

def strip_comments(s: str) -> str:
    i = s.find("#")
    return s[:i] if i != -1 else s

def find_server_blocks(lines):
    # naive brace tracking: find "server {" blocks and their end
    blocks = []
    i = 0
    while i < len(lines):
        s = strip_comments(lines[i]).strip()
        if re.match(r'^server\s*\{', s):
            start = i
            depth = 0
            seen_open = False
            j = i
            while j < len(lines):
                ss = strip_comments(lines[j])
                if "{" in ss:
                    seen_open = True
                depth += ss.count("{") - ss.count("}")
                if seen_open and depth <= 0:
                    blocks.append((start, j))
                    i = j
                    break
                j += 1
        i += 1
    return blocks

def block_text(lines, a, b):
    return "".join(lines[a:b+1])

def server_matches_domain(block_str: str) -> bool:
    # if server_name contains domain, treat as match
    m = re.search(r'^\s*server_name\s+([^;]+);', block_str, re.M)
    if not m:
        return False
    names = m.group(1)
    return (domain in names)

def find_location_api(block_lines):
    # return (loc_start_idx, loc_end_idx) relative to block_lines, or None
    i = 0
    while i < len(block_lines):
        s = strip_comments(block_lines[i]).strip()
        if re.match(r'^location\s+(?:\^~\s+)?/api/\s*\{', s):
            start = i
            depth = 0
            seen_open = False
            j = i
            while j < len(block_lines):
                ss = strip_comments(block_lines[j])
                if "{" in ss:
                    seen_open = True
                depth += ss.count("{") - ss.count("}")
                if seen_open and depth <= 0:
                    return (start, j)
                j += 1
        i += 1
    return None

proxy_body = [
    "        # CCG_API_PROXY (stable)\n",
    f"        proxy_pass http://127.0.0.1:{port};\n",
    "        proxy_http_version 1.1;\n",
    "        proxy_set_header Host $host;\n",
    "        proxy_set_header X-Real-IP $remote_addr;\n",
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n",
    "        proxy_set_header X-Forwarded-Proto $scheme;\n",
    "        proxy_read_timeout 300s;\n",
    "        proxy_connect_timeout 60s;\n",
    "        proxy_send_timeout 300s;\n",
]

servers = find_server_blocks(lines)
if not servers:
    raise SystemExit("❌ هیچ server { } در این فایل پیدا نشد.")

# choose target servers: those matching domain; fallback: first server
targets = []
for a,b in servers:
    if server_matches_domain(block_text(lines, a, b)):
        targets.append((a,b))
if not targets:
    targets = [servers[0]]

new_lines = lines[:]
patched = 0
inserted = 0

for a,b in targets:
    block = new_lines[a:b+1]
    loc = find_location_api(block)

    if loc:
        ls, le = loc
        # keep first line (location ... {) and last line (})
        head = block[:ls+1]
        tail = block[le:]  # includes closing brace line
        # determine indentation of body (use same as existing or default 8 spaces)
        # We will just use proxy_body which already uses 8 spaces (2 tabs worth)
        new_block = head + proxy_body + tail
        new_lines[a:b+1] = new_block
        # adjust b for next operations (roughly)
        delta = len(new_block) - (b - a + 1)
        b = b + delta
        patched += 1
    else:
        # insert a location /api/ { ... } near end of server block before closing }
        # find last line with just "}" of this server
        # we insert before it
        close_idx = b
        # build full location block
        loc_block = ["\n", "    location ^~ /api/ {\n"] + proxy_body + ["    }\n"]
        new_lines[a:close_idx] = new_lines[a:close_idx] + loc_block
        inserted += 1

out = "".join(new_lines)
open(path, "w", encoding="utf-8").write(out)

print(f"✅ servers_targeted={len(targets)} patched_api_location={patched} inserted_api_location={inserted}")
PY

echo "== 3) nginx -t =="
sudo nginx -t

echo "== 4) reload nginx =="
sudo nginx -s reload || sudo service nginx reload

echo "== 5) Correct tests with Host/SNI =="
# تست صحیح: با host واقعی
curl -k -i --max-time 8 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/ccg/ping" | head -n 30 | tee "$BK/curl_nginx_ping.txt" || true
curl -k -i --max-time 8 --resolve "${DOMAIN}:443:127.0.0.1" -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. فقط تست پاسخ بده."}' "https://${DOMAIN}/api/ccg" | head -n 60 | tee "$BK/curl_nginx_post.txt" || true

echo "✅ DONE"
echo "Backup: $BK"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_nginx_api_final"
mkdir -p "$BK"

DOMAIN="ccg.cando.ac"
DEFAULT_SITE="/etc/nginx/sites-enabled/ccg"

echo "== CCG NGINX FINAL FIX (API + WHOAMI) =="
echo "Backup: $BK"
echo "Domain: $DOMAIN"

# 1) detect backend port (pm2 pid -> ss) fallback 50000
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
echo "Backend PORT: $PORT" | tee "$BK/backend_port.txt" >/dev/null

echo "== 0) Direct backend sanity =="
set +e
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 20 | tee "$BK/backend_ping.txt"
set -e

# 2) Find real nginx files that contain server_name for this domain
echo "== 1) Find nginx vhost files for domain =="
TARGETS="$BK/targets.txt"
sudo grep -RIn --include="*" "server_name" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null \
  | grep -F "$DOMAIN" | awk -F: '{print $1}' | sort -u | tee "$TARGETS" >/dev/null || true

if [ ! -s "$TARGETS" ]; then
  echo "⚠️ هیچ فایلی با server_name شامل $DOMAIN پیدا نشد."
  echo "=> میرم سراغ فایل پیش‌فرض: $DEFAULT_SITE"
  echo "$DEFAULT_SITE" > "$TARGETS"
fi

echo "Targets:"
cat "$TARGETS" | sed 's/^/ - /'

export CCG_DOMAIN="$DOMAIN"
export CCG_PORT="$PORT"

# 3) Patch each target: ensure whoami + location ^~ /api/ proxy (structure-safe)
while IFS= read -r FILE; do
  [ -z "${FILE:-}" ] && continue
  if [ ! -f "$FILE" ]; then
    echo "⚠️ not found: $FILE"
    continue
  fi

  echo "== Patch: $FILE =="
  SAFE_NAME="$(echo "$FILE" | sed 's#/#_#g' | sed 's/^_//')"
  sudo cp -f "$FILE" "$BK/${SAFE_NAME}.bak"

  export CCG_FILE="$FILE"
  sudo -E python3 - <<'PY'
import os, re

path = os.environ["CCG_FILE"]
domain = os.environ["CCG_DOMAIN"]
port = os.environ["CCG_PORT"]

raw = open(path, "rb").read()
raw = raw.replace(b"\x00", b"").replace(b"\r\n", b"\n").replace(b"\r", b"\n")
txt = raw.decode("utf-8", errors="ignore")
lines = txt.splitlines(True)

def strip_comments(s: str) -> str:
    i = s.find("#")
    return s[:i] if i != -1 else s

def find_server_blocks(lines):
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

def server_has_domain(block_str: str) -> bool:
    m = re.search(r'^\s*server_name\s+([^;]+);', block_str, re.M)
    if not m:
        return False
    return domain in m.group(1)

def find_location(block_lines, loc_regex):
    i = 0
    while i < len(block_lines):
        s = strip_comments(block_lines[i]).strip()
        if re.search(loc_regex, s):
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
    "        # CCG_API_PROXY_FINAL\n",
    f"        proxy_pass http://127.0.0.1:{port};\n",
    "        proxy_http_version 1.1;\n",
    "        proxy_set_header Host $host;\n",
    "        proxy_set_header X-Real-IP $remote_addr;\n",
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n",
    "        proxy_set_header X-Forwarded-Proto $scheme;\n",
    "        proxy_read_timeout 300s;\n",
    "        proxy_connect_timeout 60s;\n",
    "        proxy_send_timeout 300s;\n",
    "        add_header X-CCG-API-PROXY 1 always;\n",
]

whoami_block = [
    "    location = /__ccg_whoami {\n",
    "        add_header Content-Type text/plain;\n",
    "        add_header X-CCG-WHOAMI 1 always;\n",
    f"        return 200 \"ccg vhost ok | upstream=127.0.0.1:{port}\\n\";\n",
    "    }\n"
]

servers = find_server_blocks(lines)
patched_servers = 0
patched_api = 0
inserted_api = 0
patched_whoami = 0
inserted_whoami = 0

new_lines = lines[:]

# patch from bottom to top to keep indexes stable
for a,b in sorted(servers, key=lambda x: x[0], reverse=True):
    blk = block_text(new_lines, a, b)
    if not server_has_domain(blk):
        continue
    patched_servers += 1
    block_lines = new_lines[a:b+1]

    # WHOAMI
    loc_w = find_location(block_lines, r'^location\s*=\s*/__ccg_whoami\s*\{')
    if loc_w:
        ls, le = loc_w
        head = block_lines[:ls]
        tail = block_lines[le+1:]
        # keep opening line & closing brace line
        open_line = block_lines[ls]
        close_line = block_lines[le]
        new_loc = [open_line] + whoami_block[1:-1] + [close_line]  # keep braces from original
        block_lines = head + new_loc + tail
        patched_whoami += 1
    else:
        # insert before server closing brace
        # find last "}" line of this server block
        insert_at = len(block_lines)-1
        block_lines = block_lines[:insert_at] + ["\n"] + whoami_block + block_lines[insert_at:]
        inserted_whoami += 1

    # API: match any of these forms
    # location /api/ { ... } OR location ^~ /api/ { ... } OR location /api { ... }
    loc_api = find_location(block_lines, r'^location\s+(\^~\s+)?/api/?\s*\{')
    if loc_api:
        ls, le = loc_api
        open_line = block_lines[ls]
        close_line = block_lines[le]
        head = block_lines[:ls+1]
        tail = block_lines[le:]
        # replace body fully
        block_lines = head + proxy_body + tail
        patched_api += 1
    else:
        insert_at = len(block_lines)-1
        api_loc = ["\n", "    location ^~ /api/ {\n"] + proxy_body + ["    }\n"]
        block_lines = block_lines[:insert_at] + api_loc + block_lines[insert_at:]
        inserted_api += 1

    new_lines[a:b+1] = block_lines

out = "".join(new_lines)
open(path, "w", encoding="utf-8").write(out)

print(f"✅ file={path}")
print(f"   servers_patched={patched_servers}")
print(f"   whoami patched={patched_whoami} inserted={inserted_whoami}")
print(f"   api   patched={patched_api} inserted={inserted_api}")
PY

done < "$TARGETS"

echo "== 2) nginx -t =="
sudo nginx -t

echo "== 3) reload nginx =="
sudo nginx -s reload || sudo service nginx reload

echo "== 4) Test with correct Host+SNI =="
curl -k -i --max-time 8 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/__ccg_whoami" | head -n 40 | tee "$BK/test_whoami.txt" || true
curl -k -i --max-time 8 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/ccg/ping" | head -n 40 | tee "$BK/test_ping.txt" || true
curl -k -i --max-time 12 --resolve "${DOMAIN}:443:127.0.0.1" -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. فقط تست کن و یک جمله جواب بده."}' "https://${DOMAIN}/api/ccg" | head -n 80 | tee "$BK/test_post.txt" || true

echo
echo "== 5) If still 404, show which server answered =="
echo "Look at test_whoami.txt and test_ping.txt:"
echo " - اگر /__ccg_whoami هم 404 بود => این دامنه از فایل دیگری سرو می‌شود یا درخواست به vhost درست نمی‌خورد."
echo " - اگر /__ccg_whoami 200 شد ولی /api/* 404 بود => location /api/ جای دیگری override می‌شود (خیلی نادر با ^~)."

echo "Backup: $BK"

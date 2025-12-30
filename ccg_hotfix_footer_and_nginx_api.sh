#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_footer_and_nginx_api_fix"
mkdir -p "$BK"

echo "== CCG HOTFIX: Footer link + Nginx /api 404 fix =="
echo "Backup: $BK"

########################################
# 1) FOOTER: replace email link with your takl link
########################################
TAKL_URL="https://takl.ink/amirhosseinyavar/"
DISPLAY_NAME="Amirhossein Yavar"

echo "== 1) Patch Footer link =="
CLIENT_SRC="$ROOT/client/src"

if [ -d "$CLIENT_SRC" ]; then
  # backup likely footer files
  find "$CLIENT_SRC" -maxdepth 4 -type f \( -iname "*footer*.jsx" -o -iname "*footer*.tsx" -o -iname "*footer*.js" -o -iname "*footer*.ts" \) \
    -print0 | while IFS= read -r -d '' f; do
      mkdir -p "$BK/client_footer_files"
      cp -f "$f" "$BK/client_footer_files/$(basename "$f").bak" 2>/dev/null || true
    done

  python3 - <<'PY'
import os, re, pathlib

root = os.path.expanduser("~/CCG/client/src")
takl = "https://takl.ink/amirhosseinyavar/"
name = "Amirhossein Yavar"

def is_footer_file(path: pathlib.Path, text: str) -> bool:
    p = path.name.lower()
    if "footer" in p:
        return True
    if "<footer" in text.lower():
        return True
    # some projects render footer via component name
    if "function Footer" in text or "const Footer" in text or "export default Footer" in text:
        return True
    return False

candidates = []
for path in pathlib.Path(root).rglob("*"):
    if path.suffix.lower() not in [".js",".jsx",".ts",".tsx"]:
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        continue
    if is_footer_file(path, text):
        candidates.append((path, text))

changed = 0
for path, text in candidates:
    original = text

    # 1) mailto href -> takl url
    text = re.sub(r'href\s*=\s*["\']mailto:[^"\']+["\']',
                  f'href="{takl}" target="_blank" rel="noreferrer"',
                  text)

    # JSX template mailto: href={`mailto:${...}`}
    text = re.sub(r'href\s*=\s*\{\s*`mailto:[^`]+`\s*\}',
                  f'href="{takl}" target="_blank" rel="noreferrer"',
                  text)

    # 2) Replace visible email text (ONLY in footer files)
    # (conservative: only replace if an email-like string exists)
    email_re = re.compile(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}')
    if email_re.search(text):
        text = email_re.sub(name, text)

    # 3) If takl url already exists but label isn't nice, try improving:
    # e.g. <a ...>https://takl....</a> -> <a ...>Amirhossein Yavar</a>
    text = re.sub(rf'(<a[^>]*href=["\']{re.escape(takl)}["\'][^>]*>)(\s*{re.escape(takl)}\s*)(</a>)',
                  rf'\1{name}\3', text)

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed += 1

print(f"Footer patch changed files: {changed}")
PY

else
  echo "⚠️ client/src not found, skipping footer patch."
fi

########################################
# 2) NGINX: fix /api 404 with structure-safe patch
########################################
echo "== 2) Fix nginx /api 404 (keep structure) =="

SITE="/etc/nginx/sites-enabled/ccg"
if [ ! -f "$SITE" ]; then
  echo "⚠️ $SITE not found. Searching in /etc/nginx/sites-enabled ..."
  SITE="$(grep -Rsl --exclude-dir='*' -E 'server_name\s+.*ccg' /etc/nginx/sites-enabled 2>/dev/null | head -n 1 || true)"
fi
if [ -z "${SITE:-}" ] || [ ! -f "$SITE" ]; then
  echo "❌ nginx site file not found. Aborting nginx patch."
  exit 2
fi
echo "NGINX SITE: $SITE"

# backup nginx
sudo cp -f "$SITE" "$BK/nginx.ccg.before.bak"

# detect backend port
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

# IMPORTANT: prevent bash expanding $host etc -> use single-quoted heredoc and read via env
export _CCG_SITE="$SITE"
export _CCG_PORT="$PORT"

sudo -E python3 - <<'PY'
import os, re

path = os.environ["_CCG_SITE"]
port = os.environ["_CCG_PORT"]

raw = open(path, "rb").read()
raw = raw.replace(b"\x00", b"").replace(b"\r\n", b"\n").replace(b"\r", b"\n")
txt = raw.decode("utf-8", errors="ignore")

# structure-safe: try to find an existing location block for /api or /api/
# if exists -> update proxy_pass port
def update_existing_api_block(t: str) -> str:
    # update proxy_pass within location /api or /api/
    def repl(m):
        block = m.group(0)
        block2 = re.sub(r'proxy_pass\s+http://127\.0\.0\.1:\d+;',
                        f'proxy_pass http://127.0.0.1:{port};', block)
        block2 = re.sub(r'proxy_pass\s+http://localhost:\d+;',
                        f'proxy_pass http://127.0.0.1:{port};', block2)
        return block2

    # match location ^~ /api/  OR location /api/ OR location /api
    t2 = re.sub(r'location\s+(?:\^~\s+)?/api/?\s*\{[\s\S]*?\n\}',
                repl, t, count=1)
    return t2

patched = update_existing_api_block(txt)
had_api_location = (patched != txt)

if not had_api_location:
    # Insert a location ^~ /api/ before location / (if exists) within first server { ... }
    # Keep structure: only inject block text, do not remove anything.
    api_block = f"""
    # CCG_API_PROXY (auto)
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
"""

    # find first server block
    m = re.search(r'\bserver\s*\{', patched)
    if not m:
        raise SystemExit("No server { } block found in nginx site file.")

    # insert before first "location /" inside server block if possible
    # (more stable than appending at end)
    srv_start = m.start()
    # naive: locate first location / { after server {
    loc = re.search(r'location\s+/\s*\{', patched[m.end():])
    if loc:
        idx = m.end() + loc.start()
        patched = patched[:idx] + api_block + patched[idx:]
    else:
        # fallback: append just before last } of the first server block
        # find matching closing brace roughly by last "}" after server start
        end = patched.find("}", m.end())
        if end == -1:
            end = len(patched)
        patched = patched[:end] + api_block + patched[end:]

# ensure proxy_pass port is correct even if upstream named (best-effort, structure-safe)
patched = re.sub(r'proxy_pass\s+http://127\.0\.0\.1:\d+;',
                 f'proxy_pass http://127.0.0.1:{port};', patched)

open(path, "w", encoding="utf-8").write(patched)
print("✅ nginx patched for /api/ proxy")
PY

echo "== nginx -t =="
sudo nginx -t

echo "== reload nginx =="
sudo nginx -s reload || sudo service nginx reload

########################################
# 3) Rebuild client (optional but recommended for footer changes)
########################################
echo "== 3) Build frontend =="
if [ -d "$ROOT/client" ]; then
  cd "$ROOT/client"
  npm install >/dev/null 2>&1 || true
  npm run build
fi

echo "== 4) Restart PM2 =="
cd "$ROOT"
pm2 restart ccg --update-env || true

echo "== 5) Quick tests =="
echo "--- https://127.0.0.1/api/ccg/ping ---"
curl -k -i --max-time 5 https://127.0.0.1/api/ccg/ping | head -n 20 || true
echo "--- https://127.0.0.1/api/ccg (POST) ---"
curl -k -i --max-time 15 https://127.0.0.1/api/ccg \
  -H "Content-Type: application/json" \
  -d '{"userRequest":"ping from server","lang":"fa"}' | head -n 40 || true

echo "✅ DONE"
echo "Backup: $BK"

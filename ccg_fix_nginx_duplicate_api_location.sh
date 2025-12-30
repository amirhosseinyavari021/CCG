#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_fix_nginx_dup_api"
mkdir -p "$BK"

SITE="/etc/nginx/sites-enabled/ccg"
echo "== FIX NGINX: duplicate location /api/ (keep structure) =="
echo "Backup: $BK"
echo "Site:   $SITE"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE پیدا نشد"
  exit 1
fi

echo "== Backup current nginx site =="
sudo cp -f "$SITE" "$BK/ccg.before.bak"

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

export _CCG_SITE="$SITE"
export _CCG_PORT="$PORT"

echo "== Remove injected auto block (CCG_API_PROXY) and/or duplicate /api/ blocks =="
sudo -E python3 - <<'PY'
import os, re

path = os.environ["_CCG_SITE"]
port = os.environ["_CCG_PORT"]

raw = open(path, "rb").read()
raw = raw.replace(b"\x00", b"").replace(b"\r\n", b"\n").replace(b"\r", b"\n")
txt = raw.decode("utf-8", errors="ignore")
lines = txt.splitlines(True)

def strip_comments(s: str) -> str:
    # crude but ok for nginx: ignore everything after #
    i = s.find("#")
    return s[:i] if i != -1 else s

def remove_block_by_marker(lines, marker="# CCG_API_PROXY (auto)"):
    out = []
    skipping = False
    depth = 0
    seen_open = False
    removed = 0

    for ln in lines:
        if not skipping and marker in ln:
            skipping = True
            depth = 0
            seen_open = False
            removed += 1
            continue

        if skipping:
            s = strip_comments(ln)
            opens = s.count("{")
            closes = s.count("}")
            if opens:
                seen_open = True
            depth += opens - closes
            # when we entered the location and returned to same level => stop skipping
            if seen_open and depth <= 0:
                skipping = False
            continue

        out.append(ln)

    return out, removed

def find_location_api_blocks(lines):
    # returns list of (start_idx, end_idx) inclusive for blocks whose location is /api/ (optionally ^~)
    blocks = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = strip_comments(ln).strip()
        m = re.match(r'^location\s+(?:\^~\s+)?/api/\s*\{', s)
        if m:
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
                    end = j
                    blocks.append((start, end))
                    i = end
                    break
                j += 1
        i += 1
    return blocks

# 1) First remove our injected block if exists
lines2, removed = remove_block_by_marker(lines)

# 2) If still duplicates exist, keep first /api/ location, remove the rest
blocks = find_location_api_blocks(lines2)
if len(blocks) > 1:
    keep = blocks[0]
    to_remove = blocks[1:]
    rm_set = set()
    for a,b in to_remove:
        rm_set.update(range(a, b+1))
    lines2 = [ln for idx, ln in enumerate(lines2) if idx not in rm_set]

# 3) Update proxy_pass to correct port inside remaining /api/ blocks (best-effort)
text2 = "".join(lines2)
text2 = re.sub(r'proxy_pass\s+http://127\.0\.0\.1:\d+;', f'proxy_pass http://127.0.0.1:{port};', text2)
text2 = re.sub(r'proxy_pass\s+http://localhost:\d+;', f'proxy_pass http://127.0.0.1:{port};', text2)

open(path, "w", encoding="utf-8").write(text2)

print(f"✅ removed_auto_block={removed} api_blocks_after={len(find_location_api_blocks(text2.splitlines(True)))}")
PY

echo "== nginx -t =="
sudo nginx -t

echo "== reload nginx =="
sudo nginx -s reload || sudo service nginx reload

echo "== Quick test (https localhost) =="
curl -k -i --max-time 8 https://127.0.0.1/api/ccg/ping | head -n 25 || true

echo "✅ DONE"
echo "Backup: $BK"

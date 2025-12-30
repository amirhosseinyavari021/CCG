#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_close_frontpage_today"
mkdir -p "$BK"

SERVER="$ROOT/server.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"
AI="$ROOT/server/utils/aiClient.js"

echo "== CCG FINAL CLEAN FIX (remove mode/level, stop 502 loop) =="
echo "Backup: $BK"

# --- sanity
[ -f "$SERVER" ] || { echo "❌ server.js not found: $SERVER"; exit 1; }
[ -f "$ROUTE" ]  || { echo "❌ ccgRoutes.js not found: $ROUTE"; exit 1; }
[ -f "$AI" ]     || { echo "❌ aiClient.js not found: $AI"; exit 1; }

# --- backups
cp -f "$SERVER" "$BK/server.js.bak"
cp -f "$ROUTE"  "$BK/ccgRoutes.js.bak"
cp -f "$AI"     "$BK/aiClient.js.bak"

# --- 1) Rewrite aiClient.js (stable + required vars safe + better extract)
cat > "$AI" <<'JS'
// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

// Stored prompt (optional, but you already use it)
const PROMPT_ID = process.env.OPENAI_PROMPT_ID || "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd";
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || "13";

// Variables required by your stored prompt template
const REQUIRED_VARS = ["cli","input_a","input_b","mode","user_request","os","lang","error_message"];

function normalizeVars(payload) {
  const b = (payload && typeof payload === "object" && !Array.isArray(payload)) ? payload : {};
  const ur = (typeof payload === "string")
    ? payload
    : (b.user_request ?? b.userRequest ?? b.prompt ?? b.text ?? b.message ?? b.input ?? b.query ?? "");

  // IMPORTANT: mode is kept INTERNAL for stored prompt compatibility.
  // We do NOT expose mode/level to frontend. Backend sets it.
  const vars = {
    mode: String(b.mode ?? "generate"),
    input_a: String(b.input_a ?? b.inputA ?? b.a ?? b.input1 ?? b.code_a ?? b.codeA ?? b.left ?? b.before ?? ""),
    input_b: String(b.input_b ?? b.inputB ?? b.b ?? b.input2 ?? b.code_b ?? b.codeB ?? b.right ?? b.after ?? ""),
    cli: String(b.cli ?? b.shell ?? b.terminal ?? "bash"),
    os: String(b.os ?? b.platform ?? "linux"),
    lang: String(b.lang ?? b.language ?? "fa"),
    error_message: String(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    user_request: String(ur ?? ""),
  };

  // Ensure all required keys exist (no Missing prompt variables)
  for (const k of REQUIRED_VARS) {
    if (vars[k] == null) vars[k] = "";
    if (typeof vars[k] !== "string") vars[k] = String(vars[k]);
  }
  return vars;
}

function fallbackPromptFromVars(v) {
  return [
    `mode: ${v.mode}`,
    `cli: ${v.cli}`,
    `os: ${v.os}`,
    `lang: ${v.lang}`,
    v.error_message ? `error_message: ${v.error_message}` : "",
    v.input_a ? `input_a:\n${v.input_a}` : "",
    v.input_b ? `input_b:\n${v.input_b}` : "",
    `user_request:\n${v.user_request || "(empty)"}`,
  ].filter(Boolean).join("\n\n");
}

function extractText(data) {
  try {
    // Responses API: output -> message -> content -> output_text/text
    if (Array.isArray(data?.output)) {
      const parts = [];
      for (const item of data.output) {
        if (item?.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") parts.push(c.text);
            if (typeof c?.value === "string") parts.push(c.value);
          }
        }
      }
      const joined = parts.join("\n").trim();
      if (joined) return joined;
    }

    if (typeof data?.text?.value === "string" && data.text.value.trim()) return data.text.value.trim();

    // legacy shapes (just in case)
    const c1 = data?.choices?.[0]?.message?.content;
    if (typeof c1 === "string" && c1.trim()) return c1.trim();
    const c2 = data?.choices?.[0]?.text;
    if (typeof c2 === "string" && c2.trim()) return c2.trim();

    return "";
  } catch {
    return "";
  }
}

async function postOpenAI(apiKey, body, timeoutMs = 60000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  } catch (e) {
    const msg = (e && e.name === "AbortError") ? "OpenAI timeout" : (e?.message || String(e));
    return { ok: false, status: 0, data: { error: { message: msg } } };
  } finally {
    clearTimeout(t);
  }
}

/**
 * runAI({ variables, fallbackPrompt, temperature })
 * - variables: object
 * - fallbackPrompt: string
 */
export async function runAI({ variables, fallbackPrompt, temperature = 0.35 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { output: "", error: "Missing OPENAI_API_KEY", raw: null };

  const vars = normalizeVars(variables);
  const fb = (fallbackPrompt && String(fallbackPrompt).trim()) ? String(fallbackPrompt) : fallbackPromptFromVars(vars);

  // try stored prompt first
  const a1 = await postOpenAI(apiKey, {
    model: DEFAULT_MODEL,
    prompt: { id: PROMPT_ID, version: PROMPT_VERSION, variables: vars },
    temperature,
    text: { format: { type: "text" }, verbosity: "medium" },
    store: true,
  });

  if (a1.ok) {
    const out = extractText(a1.data);
    return out ? { output: out, error: null, raw: a1.data } : { output: "", error: "Empty AI response", raw: a1.data };
  }

  // fallback raw prompt
  const a2 = await postOpenAI(apiKey, {
    model: DEFAULT_MODEL,
    input: fb,
    temperature,
    text: { format: { type: "text" }, verbosity: "medium" },
    store: true,
  });

  if (a2.ok) {
    const out = extractText(a2.data);
    return out ? { output: out, error: null, raw: a2.data } : { output: "", error: "Empty AI response (fallback)", raw: a2.data };
  }

  const msg =
    a1.data?.error?.message ||
    a2.data?.error?.message ||
    `AI request failed (status ${a2.status || a1.status || "unknown"})`;

  return { output: "", error: msg, raw: { attempt1: a1.data, attempt2: a2.data } };
}
JS

# --- 2) Rewrite ccgRoutes.js (clean: no mode/level in API contract, never 502 to UI)
cat > "$ROUTE" <<'JS'
import express from "express";
import { runAI } from "../utils/aiClient.js";

const router = express.Router();

function pickUserRequest(body) {
  const b = (body && typeof body === "object") ? body : {};
  const ur =
    b.userRequest ??
    b.user_request ??
    b.userrequest ??
    b.prompt ??
    b.request ??
    b.text ??
    b.message ??
    b.input ??
    b.query ??
    b.q ??
    (b.data && (b.data.userRequest ?? b.data.user_request ?? b.data.prompt ?? b.data.text)) ??
    "";
  return String(ur || "").trim();
}

function buildVars(body, userRequest) {
  const b = (body && typeof body === "object") ? body : {};
  // IMPORTANT: mode is INTERNAL ONLY (do not accept from client).
  return {
    mode: "generate",
    input_a: String(b.input_a ?? b.inputA ?? b.a ?? b.input1 ?? ""),
    input_b: String(b.input_b ?? b.inputB ?? b.b ?? b.input2 ?? ""),
    cli: String(b.cli ?? b.shell ?? b.terminal ?? "bash"),
    os: String(b.os ?? b.platform ?? "linux"),
    lang: String(b.lang ?? b.language ?? "fa"),
    error_message: String(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    user_request: String(userRequest),
  };
}

function fallbackPrompt(vars) {
  return [
    `mode: ${vars.mode}`,
    `cli: ${vars.cli}`,
    `os: ${vars.os}`,
    `lang: ${vars.lang}`,
    vars.error_message ? `error_message: ${vars.error_message}` : "",
    vars.input_a ? `input_a:\n${vars.input_a}` : "",
    vars.input_b ? `input_b:\n${vars.input_b}` : "",
    `user_request:\n${vars.user_request || "(empty)"}`,
  ].filter(Boolean).join("\n\n");
}

router.get("/ping", (req, res) => {
  res.json({ ok: true, service: "ccg", ts: Date.now() });
});

router.post("/", async (req, res) => {
  const rid = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const body = (req.body && typeof req.body === "object") ? req.body : {};
  const userRequest = pickUserRequest(body);

  if (!userRequest) {
    // keep 400 for truly missing input
    return res.status(400).json({ ok: false, error: "userRequest is required" });
  }

  const vars = buildVars(body, userRequest);

  try {
    const ai = await runAI({ variables: vars, fallbackPrompt: fallbackPrompt(vars) });

    // KEY POINT: never send 502 to frontend. If AI fails, return ok:false with 200.
    if (ai?.error) {
      console.error(`[CCG] rid=${rid} AI_ERROR=${ai.error}`);
      return res.status(200).json({
        ok: false,
        error: ai.error,
        output: "",
        // for debugging if you need:
        // raw: ai.raw
      });
    }

    const out = String(ai?.output || "").trim();
    return res.status(200).json({
      ok: true,
      output: out,
      result: out, // compatibility with older UI
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    console.error(`[CCG] rid=${rid} ROUTE_ERROR=${msg}`);
    return res.status(200).json({ ok: false, error: msg, output: "" });
  } finally {
    const ms = Date.now() - t0;
    console.log(`[CCG] rid=${rid} ms=${ms} keys=${Object.keys(body).join(",")}`);
  }
});

export default router;
JS

# --- 3) Ensure server listens on IPv4 (0.0.0.0) if not already
python3 - <<'PY'
import os, re

p = os.path.expanduser("~/CCG/server.js")
s = open(p, "r", encoding="utf-8", errors="ignore").read()

if "CCG_BIND_IPV4_V1" not in s:
    # Patch first .listen(PORT|port, ...) without host
    # Handles: app.listen(PORT, () => ...) OR server.listen(PORT, () => ...)
    def repl(m):
        before = m.group(0)
        # already has host?
        if re.search(r"\.listen\(\s*(PORT|port)\s*,\s*['\"]", before):
            return before
        # inject host param
        return before.replace(".listen(", ".listen(")[:-1]  # noop

    # safer: regex for .listen(PORT, ... ) and insert "0.0.0.0"
    pat = re.compile(r"\.listen\(\s*(PORT|port)\s*,\s*(\()?", re.M)
    # We need a more precise replace using a different approach:
    # Replace ".listen(PORT," with ".listen(PORT, '0.0.0.0',"
    s2, n = re.subn(r"\.listen\(\s*(PORT|port)\s*,", r".listen(\1, \"0.0.0.0\", /* CCG_BIND_IPV4_V1 */", s, count=1)
    if n == 0:
        # If pattern not found, do nothing.
        open(p, "w", encoding="utf-8").write(s)
    else:
        open(p, "w", encoding="utf-8").write(s2)
PY

# --- 4) Patch frontend: remove mode/level from request payloads (best-effort)
python3 - <<'PY'
import os, re, pathlib

root = pathlib.Path(os.path.expanduser("~/CCG/client/src"))
if not root.exists():
    print("ℹ️ client/src not found; skip frontend patch.")
    raise SystemExit(0)

targets = []
for ext in ("*.js","*.jsx","*.ts","*.tsx"):
    targets += list(root.rglob(ext))

changed = 0
for p in targets:
    try:
        txt = p.read_text(encoding="utf-8", errors="ignore")
    except:
        continue
    if "/api/ccg" not in txt and "api/ccg" not in txt:
        continue

    orig = txt

    # remove object-literal keys mode/level (quoted/unquoted) line-based
    txt = re.sub(r'^\s*(mode|level)\s*:\s*[^,\n]*,\s*\n', '', txt, flags=re.M)
    txt = re.sub(r'^\s*["\'](mode|level)["\']\s*:\s*[^,\n]*,\s*\n', '', txt, flags=re.M)

    # remove inline "mode: xxx," patterns
    txt = re.sub(r'(\{[^{}]*?)\b(mode|level)\s*:\s*[^,}]+,\s*', r'\1', txt, flags=re.S)

    # clean trailing commas before } or ]
    txt = re.sub(r',\s*(\}|\])', r'\1', txt)

    if txt != orig:
        p.write_text(txt, encoding="utf-8")
        changed += 1

print(f"✅ Frontend patched (mode/level removed) filesChanged={changed}")
PY

# --- 5) Syntax checks
echo "== Syntax checks =="
node --check "$AI"
node --check "$ROUTE"
node --check "$SERVER" || true

# --- 6) Restart PM2
echo "== Restart PM2 =="
pm2 restart ccg --update-env || true
pm2 ls || true

# --- 7) Local backend tests
PORT="${PORT:-50000}"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Local tests on 127.0.0.1:${PORT} =="
set +e
curl -sS -i --max-time 5 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 15
curl -sS -i --max-time 10 -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام! یک تست کوتاه بده."}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -n 40
set -e

# --- 8) Reload nginx (optional)
echo "== nginx reload (if installed) =="
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t
  sudo nginx -s reload || sudo service nginx reload || true
fi

echo "== DONE ✅  Backup: $BK =="
echo "If UI still says 502, run: pm2 logs ccg --lines 120"

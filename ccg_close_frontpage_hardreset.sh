#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_close_frontpage_hardreset"
mkdir -p "$BK"

SERVER="$ROOT/server.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"
AI="$ROOT/server/utils/aiClient.js"
GEN="$ROOT/client/src/pages/generator/GeneratorPage.jsx"
CMP="$ROOT/client/src/pages/comparator/CodeComparatorPage.jsx"

echo "== CCG HARDRESET (fix LISTEN + stable API + remove mode from UI) =="
echo "Backup: $BK"

for f in "$SERVER" "$ROUTE" "$AI"; do
  [ -f "$f" ] || { echo "❌ missing: $f"; exit 1; }
done

cp -f "$SERVER" "$BK/server.js.bak"
cp -f "$ROUTE"  "$BK/ccgRoutes.js.bak"
cp -f "$AI"     "$BK/aiClient.js.bak"
[ -f "$GEN" ] && cp -f "$GEN" "$BK/GeneratorPage.jsx.bak" || true
[ -f "$CMP" ] && cp -f "$CMP" "$BK/CodeComparatorPage.jsx.bak" || true

########################################
# 1) Rewrite aiClient.js (stable + stored prompt + fallback)
########################################
cat > "$AI" <<'JS'
// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

const PROMPT_ID =
  process.env.OPENAI_PROMPT_ID ||
  "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd";
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || "13";

// IMPORTANT: stored prompt requires these vars (keep mode internally even if UI removes it)
const REQUIRED = ["cli","input_a","input_b","mode","user_request","os","lang","error_message"];

function ensureVars(v) {
  const b = (v && typeof v === "object") ? v : {};
  const out = {};
  for (const k of REQUIRED) out[k] = (b[k] ?? "").toString();
  // hard defaults (avoid missing var errors)
  out.cli = out.cli || "bash";
  out.os = out.os || "linux";
  out.lang = out.lang || "fa";
  out.mode = out.mode || "generate";
  out.user_request = out.user_request || "";
  out.input_a = out.input_a || "";
  out.input_b = out.input_b || "";
  out.error_message = out.error_message || "";
  return out;
}

function levelTuning(levelRaw) {
  const lvl = String(levelRaw || "").toLowerCase();
  // beginner => بیشتر توضیح، expert => خلاصه‌تر
  if (["expert","pro","advanced","3","high","senior"].includes(lvl)) {
    return { textVerbosity: "low", maxTokens: 350, temperature: 0.25 };
  }
  if (["intermediate","mid","2","medium","normal"].includes(lvl)) {
    return { textVerbosity: "medium", maxTokens: 550, temperature: 0.35 };
  }
  return { textVerbosity: "high", maxTokens: 800, temperature: 0.4 };
}

function extractText(data) {
  let text = "";
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") text += c.text;
          if (typeof c?.value === "string") text += c.value;
        }
      }
    }
  }
  if (!text && typeof data?.output_text === "string") text = data.output_text;
  if (!text && typeof data?.text?.value === "string") text = data.text.value;
  if (!text && typeof data?.choices?.[0]?.message?.content === "string") text = data.choices[0].message.content;
  if (!text && typeof data?.choices?.[0]?.text === "string") text = data.choices[0].text;
  return (typeof text === "string") ? text.trim() : "";
}

async function callOpenAI({ apiKey, body }) {
  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

export function fallbackPromptFrom(vars, level) {
  const v = ensureVars(vars);
  const lvl = String(level || "").trim() || "beginner";
  return [
    `knowledge_level: ${lvl}`,
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

export async function runAI({ variables, fallbackPrompt, knowledgeLevel, temperature }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { output: "", error: "Missing OPENAI_API_KEY" };

  const vars = ensureVars(variables);
  const tune = levelTuning(knowledgeLevel);
  const temp = (typeof temperature === "number") ? temperature : tune.temperature;

  // 1) Stored Prompt
  const a1 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      prompt: { id: PROMPT_ID, version: PROMPT_VERSION, variables: vars },
      temperature: temp,
      max_output_tokens: tune.maxTokens,
      text: { format: { type: "text" }, verbosity: tune.textVerbosity },
      store: true,
    },
  });

  if (a1.ok) {
    const out = extractText(a1.data);
    if (out) return { output: out, error: null, raw: a1.data };
    // fallthrough to fallback
  }

  // 2) Raw fallback prompt
  const rawPrompt = fallbackPrompt || fallbackPromptFrom(vars, knowledgeLevel);

  const a2 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      input: rawPrompt,
      temperature: temp,
      max_output_tokens: tune.maxTokens,
      text: { format: { type: "text" }, verbosity: tune.textVerbosity },
      store: true,
    },
  });

  if (a2.ok) {
    const out = extractText(a2.data);
    if (out) return { output: out, error: null, raw: a2.data };
    return { output: "", error: "Empty AI response", raw: a2.data };
  }

  const msg =
    a2.data?.error?.message ||
    a1.data?.error?.message ||
    `AI request failed (status ${a2.status || a1.status})`;

  return { output: "", error: msg, raw: { a1: a1.data, a2: a2.data } };
}
JS
echo "✅ aiClient.js rewritten"

########################################
# 2) Rewrite ccgRoutes.js (no mode from UI; internal mode fixed; comparator supported)
########################################
cat > "$ROUTE" <<'JS'
import express from "express";
import { runAI, fallbackPromptFrom } from "../utils/aiClient.js";

const router = express.Router();

function pickUserRequest(b) {
  const body = (b && typeof b === "object") ? b : {};
  const ur =
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
    "";
  return String(ur || "").trim();
}

function buildVars(body, userRequest) {
  const b = (body && typeof body === "object") ? body : {};

  // comparator compatibility
  const codeA = b.codeA ?? b.code_a ?? b.input_a ?? b.inputA ?? b.a ?? "";
  const codeB = b.codeB ?? b.code_b ?? b.input_b ?? b.inputB ?? b.b ?? "";

  const hasCompare = (String(codeA || "").trim() || String(codeB || "").trim()) ? true : false;

  return {
    // IMPORTANT for stored prompt:
    mode: String(b.mode ?? (hasCompare ? "compare" : "generate")),
    input_a: String(codeA || ""),
    input_b: String(codeB || ""),
    cli: String(b.cli ?? b.shell ?? b.terminal ?? (b.platform === "network" ? "network-cli" : "bash")),
    os: String(b.os ?? b.platform ?? "linux"),
    lang: String(b.lang ?? b.language ?? "fa"),
    error_message: String(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    user_request: String(userRequest || (hasCompare ? "Compare input_a and input_b and summarize differences." : "")),
  };
}

router.get("/ping", (req, res) => res.json({ ok: true, service: "ccg", ts: Date.now() }));
router.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

router.post("/", async (req, res) => {
  const rid = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const body = (req.body && typeof req.body === "object") ? req.body : {};
  const userRequest = pickUserRequest(body);
  const vars = buildVars(body, userRequest);

  // allow empty userRequest for comparator mode (we synthesize)
  if (!vars.user_request && !vars.input_a && !vars.input_b) {
    return res.status(200).json({ ok: false, error: "user_request is required", output: "" });
  }

  const knowledgeLevel =
    body.knowledgeLevel ?? body.knowledge_level ?? body.level ?? body.awarenessLevel ?? "beginner";

  try {
    const ai = await runAI({
      variables: vars,
      fallbackPrompt: fallbackPromptFrom(vars, knowledgeLevel),
      knowledgeLevel,
    });

    if (ai?.error) {
      console.error(`[CCG] rid=${rid} AI_ERROR=${ai.error}`);
      return res.status(200).json({ ok: false, error: ai.error, output: "" });
    }

    const out = String(ai?.output || "").trim();
    return res.status(200).json({ ok: true, output: out, result: out });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    console.error(`[CCG] rid=${rid} ROUTE_ERROR=${msg}`);
    return res.status(200).json({ ok: false, error: msg, output: "" });
  } finally {
    const ms = Date.now() - t0;
    console.log(`[CCG] rid=${rid} ms=${ms} keys=${Object.keys(body || {}).join(",")}`);
  }
});

export default router;
JS
echo "✅ ccgRoutes.js rewritten"

########################################
# 3) HARD-RESET server.js (minimal stable, NO domainGuard, always listen)
########################################
cat > "$SERVER" <<'JS'
/**
 * server.js (CCG_MIN_SERVER_V1)
 * هدف: فقط API را پایدار بالا بیاورد تا 502/No-LISTEN تمام شود.
 */
import express from "express";
import ccgRoutes from "./server/routes/ccgRoutes.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

// basic health
app.get("/api/health", (req, res) => res.json({ ok: true, service: "ccg", ts: Date.now() }));

// main api
app.use("/api/ccg", ccgRoutes);

// fallback for unknown api routes
app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "API route not found" }));

const port = Number(process.env.PORT || process.env.CCG_PORT || 50000);
const host = "0.0.0.0";

const server = app.listen(port, host, () => {
  console.log(`[CCG] listening on ${host}:${port}`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("unhandledRejection", (e) => console.error("[CCG] unhandledRejection", e));
process.on("uncaughtException", (e) => console.error("[CCG] uncaughtException", e));
JS
echo "✅ server.js hard-reset to minimal stable server"

########################################
# 4) Frontend: remove mode UI/payload (keep knowledge)
########################################
if [ -f "$GEN" ]; then
python3 - <<'PY'
import re, os
p = os.path.expanduser("~/CCG/client/src/pages/generator/GeneratorPage.jsx")
s = open(p, "r", encoding="utf-8", errors="ignore").read()

# remove mode state line: const [mode, setMode] = useState("learn");
s = re.sub(r'^\s*const\s*\[\s*mode\s*,\s*setMode\s*\]\s*=\s*useState\([^\)]*\)\s*;?\s*$\n', '', s, flags=re.M)

# remove mode UI block between {/* Mode */} ... next block
s = re.sub(r'\n\s*\{\s*/\*\s*Mode\s*\*/\s*\}[\s\S]*?\{\s*/\*\s*Knowledge\s*\*/\s*\}', '\n\n            {/* Knowledge */}', s, flags=re.M)

# payload: remove modeStyle field
s = re.sub(r'^\s*modeStyle\s*:\s*mode\s*,\s*//.*$\n', '', s, flags=re.M)

open(p, "w", encoding="utf-8").write(s)
print("✅ GeneratorPage.jsx: mode removed (UI + payload)")
PY
fi

if [ -f "$CMP" ]; then
python3 - <<'PY'
import re, os
p = os.path.expanduser("~/CCG/client/src/pages/comparator/CodeComparatorPage.jsx")
s = open(p, "r", encoding="utf-8", errors="ignore").read()
# remove mode from payload (backend auto-detect compare by codeA/codeB)
s = re.sub(r'^\s*mode\s*:\s*"compare"\s*,\s*$\n', '', s, flags=re.M)
open(p, "w", encoding="utf-8").write(s)
print("✅ CodeComparatorPage.jsx: mode removed from payload")
PY
fi

########################################
# 5) Syntax check + PM2 restart + verify LISTEN + local tests
########################################
echo "== node --check server.js =="
node --check "$SERVER"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || pm2 restart 0 --update-env

echo "== Wait a moment =="
sleep 0.5

echo "== LISTEN check (expect 0.0.0.0:50000 or :PORT) =="
ss -lntp | grep -E ':(50000|5000|3000|8080)\b' || true
ss -lntp | grep node || true

echo "== Local ping test =="
curl -sS -i --max-time 5 "http://127.0.0.1:50000/api/ccg/ping" | head -n 30 || true

echo "== Local POST test (generate) =="
curl -sS --max-time 20 -H "Content-Type: application/json" \
  -d '{"user_request":"سلام. یک دستور امن برای دیدن فضای دیسک در لینوکس بده","os":"linux","cli":"bash","knowledgeLevel":"beginner"}' \
  "http://127.0.0.1:50000/api/ccg" | head -c 600; echo

echo "✅ DONE. Backup: $BK"

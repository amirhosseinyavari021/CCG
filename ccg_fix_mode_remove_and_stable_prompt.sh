#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_mode_remove_stable_prompt"
mkdir -p "$BK"

AI="$ROOT/server/utils/aiClient.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"
GEN="$ROOT/client/src/pages/generator/GeneratorPage.jsx"
CMP="$ROOT/client/src/pages/comparator/CodeComparatorPage.jsx"

echo "== CCG FIX: remove MODE from UI, keep internal MODE for stored prompt, stabilize backend =="
echo "Backup: $BK"

# --- sanity
[ -f "$AI" ] || { echo "❌ $AI not found"; exit 1; }
[ -f "$ROUTE" ] || { echo "❌ $ROUTE not found"; exit 1; }
[ -f "$GEN" ] || { echo "❌ $GEN not found"; exit 1; }
[ -f "$CMP" ] || { echo "❌ $CMP not found"; exit 1; }

# --- backups
cp -f "$AI" "$BK/aiClient.js.bak"
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"
cp -f "$GEN" "$BK/GeneratorPage.jsx.bak"
cp -f "$CMP" "$BK/CodeComparatorPage.jsx.bak"

########################################
# 1) Rewrite server/utils/aiClient.js (FULL + SAFE)
########################################
cat > "$AI" <<'JS'
// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

// Stored Prompt (keeps your existing prompt)
const PROMPT_ID =
  process.env.OPENAI_PROMPT_ID ||
  "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd";
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || "13";

function pick(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return fallback;
}

// Extract text from OpenAI Responses API shapes
function extractText(data) {
  try {
    // Responses API: output: [{type:"message", content:[{type:"output_text", text:"..."}]}]
    if (Array.isArray(data?.output)) {
      const parts = [];
      for (const item of data.output) {
        if (item?.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") {
              parts.push(c.text);
            }
          }
        }
      }
      const joined = parts.join("\n").trim();
      if (joined) return joined;
    }

    // Some variants: { text: { value: "..." } }
    if (typeof data?.text?.value === "string" && data.text.value.trim()) return data.text.value.trim();

    // Legacy fallbacks (chat.completions-like)
    if (typeof data?.choices?.[0]?.message?.content === "string") return data.choices[0].message.content.trim();
    if (typeof data?.choices?.[0]?.text === "string") return data.choices[0].text.trim();

    return "";
  } catch {
    return "";
  }
}

async function callOpenAI({ apiKey, body, timeoutMs = 60000 }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  } catch (e) {
    const msg = e?.name === "AbortError" ? `OPENAI_TIMEOUT_${timeoutMs}ms` : (e?.message || String(e));
    return { ok: false, status: 0, data: { error: { message: msg } } };
  } finally {
    clearTimeout(t);
  }
}

function normalizeVars(variables) {
  const b = (variables && typeof variables === "object" && !Array.isArray(variables)) ? variables : {};
  const user_request = String(
    pick(b, ["user_request","userRequest","prompt","text","message","input","query","q"], "")
  ).trim();

  // IMPORTANT: your stored prompt expects `mode` (don’t remove internally)
  const mode = String(pick(b, ["mode","task","action","type"], "generate")).trim() || "generate";

  const cli = String(pick(b, ["cli","shell","terminal"], "bash"));
  const os = String(pick(b, ["os","platform"], "linux"));
  const lang = String(pick(b, ["lang","language"], "fa"));
  const error_message = String(pick(b, ["error_message","errorMessage","err"], ""));

  const input_a = String(pick(b, ["input_a","inputA","a","codeA","code_a","left","before"], ""));
  const input_b = String(pick(b, ["input_b","inputB","b","codeB","code_b","right","after"], ""));

  // optional knobs
  const knowledgeLevel = String(pick(b, ["knowledgeLevel","knowledge_level","level","awarenessLevel","awareness_level"], ""));
  const outputType = String(pick(b, ["outputType","output_type"], ""));

  return {
    // required by stored prompt
    cli, input_a, input_b, mode, user_request, os, lang, error_message,
    // extra (harmless if prompt doesn’t use them)
    knowledgeLevel, outputType,
  };
}

function levelConfig(levelRaw) {
  const l = String(levelRaw || "").toLowerCase();
  // more detail for beginner, less for expert
  if (["beginner","basic","low","1","junior","novice","مبتدی"].includes(l)) {
    return { verbosity: "high", maxTokens: 1200, temperature: 0.35 };
  }
  if (["intermediate","medium","2","mid","متوسط"].includes(l)) {
    return { verbosity: "medium", maxTokens: 900, temperature: 0.30 };
  }
  if (["expert","advanced","high","3","senior","حرفه", "حرفه‌ای"].includes(l)) {
    return { verbosity: "low", maxTokens: 650, temperature: 0.25 };
  }
  return { verbosity: "medium", maxTokens: 900, temperature: 0.30 };
}

function fallbackPromptFromVars(vars) {
  // Build raw prompt that will always work (even if stored prompt fails)
  return [
    `mode: ${vars.mode}`,
    `cli: ${vars.cli}`,
    `os: ${vars.os}`,
    `lang: ${vars.lang}`,
    vars.knowledgeLevel ? `knowledgeLevel: ${vars.knowledgeLevel}` : "",
    vars.outputType ? `outputType: ${vars.outputType}` : "",
    vars.error_message ? `error_message: ${vars.error_message}` : "",
    vars.input_a ? `input_a:\n${vars.input_a}` : "",
    vars.input_b ? `input_b:\n${vars.input_b}` : "",
    `user_request:\n${vars.user_request || "(empty)"}`,
    "",
    "Return a helpful, safe answer. If outputType=command, output shell commands. If outputType=python, output python script.",
  ].filter(Boolean).join("\n\n");
}

/**
 * runAI returns { output: string, error: string|null, raw?: any }
 */
export async function runAI({ variables, fallbackPrompt, temperature = 0.30 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { output: "", error: "Missing OPENAI_API_KEY" };

  const v = normalizeVars(variables);
  const cfg = levelConfig(v.knowledgeLevel);

  const finalTemp = typeof temperature === "number" ? temperature : cfg.temperature;
  const textVerbosity = cfg.verbosity;
  const max_output_tokens = cfg.maxTokens;

  const rawFallback = (typeof fallbackPrompt === "string" && fallbackPrompt.trim())
    ? fallbackPrompt
    : fallbackPromptFromVars(v);

  // 1) Stored prompt attempt
  const attempt1 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      prompt: { id: PROMPT_ID, version: PROMPT_VERSION, variables: v },
      temperature: finalTemp,
      max_output_tokens,
      text: { format: { type: "text" }, verbosity: textVerbosity },
      store: true,
    },
  });

  if (attempt1.ok) {
    const out = extractText(attempt1.data);
    if (out) return { output: out, error: null, raw: attempt1.data };
    // fallthrough to fallback if empty
  } else {
    // if stored prompt fails due to vars or anything, we will fallback
  }

  // 2) Raw prompt fallback (never fails on missing prompt variables)
  const attempt2 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      input: rawFallback,
      temperature: finalTemp,
      max_output_tokens,
      text: { format: { type: "text" }, verbosity: textVerbosity },
      store: true,
    },
  });

  if (attempt2.ok) {
    const out = extractText(attempt2.data);
    if (out) return { output: out, error: null, raw: attempt2.data };
    return { output: "", error: "Empty AI response (fallback)", raw: attempt2.data };
  }

  const msg =
    attempt1.data?.error?.message ||
    attempt2.data?.error?.message ||
    `AI request failed (status ${attempt2.status || attempt1.status || "unknown"})`;

  return { output: "", error: msg, raw: { attempt1: attempt1.data, attempt2: attempt2.data } };
}
JS
echo "✅ aiClient.js rewritten"

########################################
# 2) Rewrite server/routes/ccgRoutes.js (internal mode + compare support + stable response)
########################################
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

function normalizeTask(body) {
  const b = (body && typeof body === "object") ? body : {};

  // If client still sends "mode", accept it but do not require it.
  const m = String(b.mode || b.task || "").toLowerCase().trim();

  // Auto-detect
  const hasCompare = (typeof b.codeA === "string" && b.codeA.trim()) || (typeof b.codeB === "string" && b.codeB.trim());
  const hasError = (typeof b.error_message === "string" && b.error_message.trim()) || (typeof b.errorMessage === "string" && b.errorMessage.trim());

  if (m === "compare" || hasCompare) return "compare";
  if (m === "error" || hasError) return "error";
  if (m === "learn") return "learn";
  return "generate";
}

function buildVars(body, userRequest) {
  const b = (body && typeof body === "object") ? body : {};

  const task = normalizeTask(b);

  // Compare page sends codeA/codeB
  const inputA =
    (task === "compare")
      ? String(b.codeA ?? b.code_a ?? b.input_a ?? b.inputA ?? b.a ?? "")
      : String(b.input_a ?? b.inputA ?? b.a ?? b.input1 ?? "");

  const inputB =
    (task === "compare")
      ? String(b.codeB ?? b.code_b ?? b.input_b ?? b.inputB ?? b.b ?? "")
      : String(b.input_b ?? b.inputB ?? b.b ?? b.input2 ?? "");

  const knowledgeLevel = String(b.knowledgeLevel ?? b.knowledge_level ?? b.level ?? b.awarenessLevel ?? b.awareness_level ?? "");
  const outputType = String(b.outputType ?? b.output_type ?? "");

  // IMPORTANT: stored prompt expects `mode`
  // We keep it INTERNAL; UI may not show it at all.
  return {
    mode: task,
    input_a: inputA,
    input_b: inputB,
    cli: String(b.cli ?? b.shell ?? b.terminal ?? "bash"),
    os: String(b.os ?? b.platform ?? "linux"),
    lang: String(b.lang ?? b.language ?? "fa"),
    error_message: String(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    user_request: String(userRequest),

    // extra
    knowledgeLevel,
    outputType,
  };
}

function fallbackPrompt(vars) {
  return [
    `mode: ${vars.mode}`,
    `cli: ${vars.cli}`,
    `os: ${vars.os}`,
    `lang: ${vars.lang}`,
    vars.knowledgeLevel ? `knowledgeLevel: ${vars.knowledgeLevel}` : "",
    vars.outputType ? `outputType: ${vars.outputType}` : "",
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

  const task = normalizeTask(body);
  const userRequest = pickUserRequest(body);

  // For compare: allow missing user_request if codeA/codeB exist
  const hasCompareInput =
    (typeof body.codeA === "string" && body.codeA.trim()) ||
    (typeof body.codeB === "string" && body.codeB.trim());

  const finalUserRequest =
    userRequest ||
    (task === "compare" && hasCompareInput ? "Compare and analyze input_a vs input_b." : "");

  if (!finalUserRequest) {
    // Keep it 200 to avoid frontend fetch throwing purely due to status
    return res.status(200).json({ ok: false, error: "user_request is required", output: "", result: "" });
  }

  const vars = buildVars(body, finalUserRequest);

  try {
    const ai = await runAI({ variables: vars, fallbackPrompt: fallbackPrompt(vars) });

    if (ai?.error) {
      console.error(`[CCG] rid=${rid} AI_ERROR=${ai.error}`);
      return res.status(200).json({
        ok: false,
        error: ai.error,
        output: "",
        result: "",
      });
    }

    const out = String(ai?.output || "").trim();
    return res.status(200).json({
      ok: true,
      output: out,
      result: out,   // UI compatibility
      markdown: out, // UI compatibility
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    console.error(`[CCG] rid=${rid} ROUTE_ERROR=${msg}`);
    return res.status(200).json({ ok: false, error: msg, output: "", result: "" });
  } finally {
    const ms = Date.now() - t0;
    console.log(`[CCG] rid=${rid} ms=${ms} keys=${Object.keys(body).join(",")}`);
  }
});

export default router;
JS
echo "✅ ccgRoutes.js rewritten"

########################################
# 3) Patch GeneratorPage.jsx (remove mode UI + stop sending modeStyle/mode)
########################################
python3 - <<'PY'
import os, re

path = os.path.expanduser("~/CCG/client/src/pages/generator/GeneratorPage.jsx")
s = open(path, "r", encoding="utf-8", errors="ignore").read()

orig = s

# remove mode state line
s = re.sub(r'^\s*const\s*\[mode\s*,\s*setMode\]\s*=\s*useState\([^;]*\);\s*\n', '', s, flags=re.M)

# remove "Mode" UI block (between {/* Mode */} and before {/* Knowledge */})
s = re.sub(r'\s*\{\s*/\*\s*Mode\s*\*/\s*\}[\s\S]*?\{\s*/\*\s*Knowledge\s*\*/\s*\}', '\n\n            {/* Knowledge */}\n', s)

# remove modeStyle field from payload
s = re.sub(r'^\s*modeStyle:\s*mode\s*,\s*//.*\n', '', s, flags=re.M)

# remove mode:"generate" field (front shouldn’t send it)
s = re.sub(r'^\s*mode:\s*"generate"\s*,\s*\n', '', s, flags=re.M)

# keep knowledgeLevel (it matters)
# no change needed

if s != orig:
    open(path, "w", encoding="utf-8").write(s)
    print("✅ GeneratorPage.jsx patched (mode removed from UI/payload)")
else:
    print("ℹ️ GeneratorPage.jsx: no changes (maybe already patched)")
PY

########################################
# 4) Patch CodeComparatorPage.jsx (stop sending mode:"compare")
########################################
python3 - <<'PY'
import os, re

path = os.path.expanduser("~/CCG/client/src/pages/comparator/CodeComparatorPage.jsx")
s = open(path, "r", encoding="utf-8", errors="ignore").read()
orig = s

s = re.sub(r'^\s*mode:\s*"compare"\s*,\s*\n', '', s, flags=re.M)

if s != orig:
    open(path, "w", encoding="utf-8").write(s)
    print("✅ CodeComparatorPage.jsx patched (mode removed from payload)")
else:
    print("ℹ️ CodeComparatorPage.jsx: no changes (maybe already patched)")
PY

########################################
# 5) Syntax checks + restart
########################################
echo "== Syntax checks =="
node --check "$AI"
node --check "$ROUTE"

echo "== Restart PM2 =="
pm2 restart ccg --update-env || true

########################################
# 6) Quick tests (local + domain)
########################################
PORT="50000"
if [ -f "$ROOT/.env" ]; then
  PENV="$(grep -E '^PORT=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
  [ -n "${PENV:-}" ] && PORT="$PENV"
fi

echo "== Local test http://127.0.0.1:${PORT}/api/ccg/ping =="
curl -sS -i --max-time 6 "http://127.0.0.1:${PORT}/api/ccg/ping" | head -n 20 || true

echo "== Local POST generate (should ok:true) =="
curl -sS --max-time 30 -H "Content-Type: application/json" \
  -d '{"lang":"fa","user_request":"میخام سیستم رو ریستارت کنم","os":"linux","cli":"bash","knowledgeLevel":"beginner","outputType":"command"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -c 600; echo

echo "== Local POST compare (no user_request, should still work) =="
curl -sS --max-time 30 -H "Content-Type: application/json" \
  -d '{"lang":"fa","codeA":"a=1\nprint(a)","codeB":"a=2\nprint(a)","knowledgeLevel":"expert"}' \
  "http://127.0.0.1:${PORT}/api/ccg" | head -c 600; echo

echo "✅ DONE. Backup: $BK"

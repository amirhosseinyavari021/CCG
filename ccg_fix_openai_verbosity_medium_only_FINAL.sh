#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
TS="$(date +%Y%m%d_%H%M%S)"
BK="$ROOT/.ccg_backup_${TS}_verbosity_medium_only_final"
mkdir -p "$BK"

AI="$ROOT/server/utils/aiClient.js"
ROUTE="$ROOT/server/routes/ccgRoutes.js"

echo "== CCG FINAL FIX: force OpenAI verbosity=medium for gpt-4.1 + stabilize vars =="
echo "Backup: $BK"

[ -f "$AI" ] || { echo "❌ aiClient.js not found: $AI"; exit 1; }
[ -f "$ROUTE" ] || { echo "❌ ccgRoutes.js not found: $ROUTE"; exit 1; }

cp -f "$AI" "$BK/aiClient.js.bak"
cp -f "$ROUTE" "$BK/ccgRoutes.js.bak"

############################################
# 1) Rewrite server/utils/aiClient.js (SAFE)
############################################
cat > "$AI" <<'JS'
// server/utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

// Stored prompt
const PROMPT_ID =
  process.env.OPENAI_PROMPT_ID ||
  "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd";
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || "13";

/**
 * IMPORTANT:
 * gpt-4.1 currently supports ONLY text.verbosity="medium"
 * So we hard-force it to avoid: Unsupported value 'high' ...
 */
const SAFE_TEXT = { format: { type: "text" }, verbosity: "medium" };

function asString(x, fallback = "") {
  if (x === null || x === undefined) return fallback;
  if (typeof x === "string") return x;
  try { return String(x); } catch { return fallback; }
}

function normalizeVars(payload) {
  const b = (payload && typeof payload === "object" && !Array.isArray(payload)) ? payload : {};

  // user_request / userRequest / prompt / text / message / input / query ...
  const ur =
    (typeof payload === "string")
      ? payload
      : (b.user_request ?? b.userRequest ?? b.prompt ?? b.text ?? b.message ?? b.input ?? b.query ?? b.q ?? "");

  return {
    // Stored prompt expects these keys (keep mode internally even if UI removes it)
    mode: asString(b.mode ?? b.action ?? b.type ?? "generate") || "generate",
    cli: asString(b.cli ?? b.shell ?? b.terminal ?? "bash") || "bash",
    os: asString(b.os ?? b.platform ?? "linux") || "linux",
    lang: asString(b.lang ?? b.language ?? "fa") || "fa",
    error_message: asString(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    input_a: asString(b.input_a ?? b.inputA ?? b.a ?? b.codeA ?? b.code_a ?? b.left ?? ""),
    input_b: asString(b.input_b ?? b.inputB ?? b.b ?? b.codeB ?? b.code_b ?? b.right ?? ""),
    user_request: asString(ur ?? "").trim(),
  };
}

function extractText(data) {
  let text = "";

  // Responses API output format
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") text += c.text;
          if (typeof c?.output_text === "string") text += c.output_text;
        }
      } else if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") text += c.text;
          if (typeof c?.output_text === "string") text += c.output_text;
        }
      }
    }
  }

  if (!text && typeof data?.output_text === "string") text = data.output_text;
  if (!text && typeof data?.text?.value === "string") text = data.text.value;

  // Legacy fallbacks
  if (!text && data?.choices?.[0]?.message?.content)
    text = data.choices[0].message.content;
  if (!text && data?.choices?.[0]?.text)
    text = data.choices[0].text;

  return (typeof text === "string") ? text.trim() : "";
}

export async function callOpenAI({ apiKey, body }) {
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

/**
 * runAI({ variables, fallbackPrompt, temperature })
 * - tries Stored Prompt first
 * - if fails, falls back to raw input prompt
 */
export async function runAI({ variables, fallbackPrompt, temperature = 0.35 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { output: "", error: "Missing OPENAI_API_KEY" };

  const v = normalizeVars(variables);

  // If user_request is empty, don't call OpenAI
  if (!v.user_request) return { output: "", error: "user_request is empty" };

  // 1) Stored Prompt attempt
  const attempt1 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      prompt: { id: PROMPT_ID, version: PROMPT_VERSION, variables: v },
      temperature,
      text: SAFE_TEXT,
      store: true,
    },
  });

  if (attempt1.ok) {
    const out = extractText(attempt1.data);
    if (out) return { output: out, error: null, raw: attempt1.data };
    return { output: "", error: "Empty AI response", raw: attempt1.data };
  }

  // 2) Fallback raw prompt
  const attempt2 = await callOpenAI({
    apiKey,
    body: {
      model: DEFAULT_MODEL,
      input: fallbackPrompt || v.user_request,
      temperature,
      text: SAFE_TEXT,
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
    `AI request failed (status ${attempt2.status || attempt1.status})`;

  return { output: "", error: msg, raw: { attempt1: attempt1.data, attempt2: attempt2.data } };
}
JS

############################################
# 2) Rewrite server/routes/ccgRoutes.js (SAFE)
############################################
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

function inferMode(body) {
  const b = (body && typeof body === "object") ? body : {};
  // if explicit mode sent, accept safe ones
  const m = String(b.mode ?? "").toLowerCase().trim();
  if (m === "compare" || m === "error" || m === "generate") return m;

  // infer
  if ((b.codeA || b.codeB || b.input_a || b.input_b) && (b.codeA || b.codeB)) return "compare";
  if (b.error_message || b.errorMessage || b.err) return "error";
  return "generate";
}

function buildContext(body) {
  const b = (body && typeof body === "object") ? body : {};
  const parts = [];

  // keep these as "soft" context (affects output) but does not break stored prompt vars
  if (b.outputType) parts.push(`outputType=${String(b.outputType)}`);
  if (b.knowledgeLevel) parts.push(`knowledgeLevel=${String(b.knowledgeLevel)}`);
  if (b.modeStyle) parts.push(`modeStyle=${String(b.modeStyle)}`);
  if (b.platform) parts.push(`platform=${String(b.platform)}`);
  if (b.os) parts.push(`os=${String(b.os)}`);
  if (b.cli) parts.push(`cli=${String(b.cli)}`);
  if (b.vendor) parts.push(`vendor=${String(b.vendor)}`);
  if (b.deviceType) parts.push(`deviceType=${String(b.deviceType)}`);

  return parts.length ? `[context ${parts.join(" | ")}]` : "";
}

function buildVars(body, userRequest) {
  const b = (body && typeof body === "object") ? body : {};
  const contextLine = buildContext(b);
  const finalRequest = contextLine ? `${contextLine}\n${userRequest}` : userRequest;

  return {
    mode: inferMode(b),
    input_a: String(b.input_a ?? b.inputA ?? b.a ?? b.input1 ?? b.codeA ?? b.code_a ?? ""),
    input_b: String(b.input_b ?? b.inputB ?? b.b ?? b.input2 ?? b.codeB ?? b.code_b ?? ""),
    cli: String(b.cli ?? b.shell ?? b.terminal ?? "bash"),
    os: String(b.os ?? b.platform ?? "linux"),
    lang: String(b.lang ?? b.language ?? "fa"),
    error_message: String(b.error_message ?? b.errorMessage ?? b.err ?? ""),
    user_request: String(finalRequest || ""),
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
    return res.status(400).json({ ok: false, error: "userRequest is required" });
  }

  const vars = buildVars(body, userRequest);

  try {
    const ai = await runAI({ variables: vars, fallbackPrompt: fallbackPrompt(vars) });

    if (ai?.error) {
      console.error(`[CCG] rid=${rid} AI_ERROR=${ai.error}`);
      return res.status(200).json({
        ok: false,
        error: ai.error,
        output: "",
      });
    }

    const out = String(ai?.output || "").trim();
    return res.status(200).json({
      ok: true,
      output: out,
      result: out, // compatibility
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

echo "✅ Patched aiClient.js + ccgRoutes.js"

echo "== Syntax checks =="
node --check "$AI"
node --check "$ROUTE"
node --check "$ROOT/server.js" || true

echo "== Restart PM2 =="
pm2 restart ccg || pm2 restart 0 || true

echo "== Wait a moment =="
sleep 1

echo "== LISTEN check (50000) =="
ss -lntp 2>/dev/null | grep -E ':(50000)\b' || true

echo "== Local tests =="
curl -sS -i --max-time 5 http://127.0.0.1:50000/api/ccg/ping | head -n 20 || true
curl -sS -i --max-time 20 -H "Content-Type: application/json" \
  -d '{"userRequest":"سلام. یک دستور امن برای دیدن فضای دیسک در لینوکس بده","lang":"fa","os":"linux","cli":"bash","knowledgeLevel":"beginner","outputType":"command"}' \
  http://127.0.0.1:50000/api/ccg | head -n 60 || true

echo "✅ DONE. Backup: $BK"

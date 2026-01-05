import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatToolResponse } from "../utils/outputFormatter.js";

function applyToolHint(userRequest, body) {
  const u = String(userRequest || "");
  const mode = String(body?.mode || "").toLowerCase();
  const ms = String(body?.modeStyle || "").toLowerCase();
  const ot = String(body?.outputType || "").toLowerCase();

  // only for generator tool-like mode
  const wantsTool = (mode === "generate") && (ms === "operational" || ot === "command" || ot === "script" || ot === "markdown");
  if (!wantsTool) return u;

  // prevent double injection
  if (u.includes("[OUTPUT_FORMAT_V1]")) return u;

  const hint =
`[OUTPUT_FORMAT_V1]
Return Markdown in this exact structure (NO greetings / NO chat / NO emojis):
1) A SINGLE fenced code block containing ONLY the final command/script.
2) ## Explanation   (short bullet points, in user's language)
3) ## Warnings      (optional, bullets)
4) ## Alternatives  (optional, bullets)
[/OUTPUT_FORMAT_V1]`;

  return `${hint}\n\n${u}`.trim();
}

const router = express.Router();

// {CCG_TOOL_HINT_V1}
// Generator should feel like a DevOps tool (not chat).
function buildToolHint(b = {}) {
  const mode = String(b.mode ?? "").toLowerCase().trim() || "generate";
  const ot = String(b.outputType ?? "").toLowerCase().trim() || "markdown";
  if (mode !== "generate") return "";
  if (!["markdown","command","script"].includes(ot)) return "";
  return [
    "[OUTPUT FORMAT]",
    "Tone: tool-like, concise. No greetings. No chit-chat.",
    "Return format (in this exact order):",
    "1) ONE fenced code block (```bash ... ```). Only command/script inside.",
    "2) After that, short sections (Markdown headings):",
    "   - ## توضیح (max 3 bullets)",
    "   - ## هشدار (optional, max 3 bullets)",
    "   - ## جایگزین‌ها (optional, max 3 bullets)",
    "[/OUTPUT FORMAT]"
  ].join("\n");
}
// {/CCG_TOOL_HINT_V1}

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

// CCG_TOOLFIRST_GENERATOR_V1
function buildToolDirectives(b = {}) {
  const lang = String(b.lang || "fa");
  const isFa = lang.toLowerCase().startsWith("fa");
  const modeStyle = String(b.modeStyle || "learn").toLowerCase();
  const outputType = String(b.outputType || "command").toLowerCase();
  const cli = String(b.cli || "bash");

  // Generator must be tool-first, not chatty.
  if (isFa) {
    if (modeStyle === "operational") {
      return [
        "[ccg:tool-first:v1]",
        "قوانین خروجی: هیچ سلام/مقدمه محاوره‌ای ننویس.",
        "فقط و فقط یک code-fence بده (بدون توضیح اضافه).",
        `زبان fence را مطابق CLI بده (مثلاً bash/powershell) و خروجی را برای outputType=${outputType} تولید کن.`
      ].join("\\n");
    }
    return [
      "[ccg:tool-first:v1]",
      "قوانین خروجی: چت‌گونه جواب نده؛ کوتاه، دقیق و ابزاری بنویس.",
      "خروجی را دقیقاً با این قالب بده و هر بخش را پر کن:",
      "## فرمان",
      "```<lang>",
      "<command or script>",
      "```",
      "## توضیح",
      "<۲-۵ خط توضیح فنی>",
      "## هشدارها",
      "<۲-۴ مورد هشدار/ریسک>",
      "## جایگزین‌ها",
      "<۲-۳ گزینه جایگزین/روش دیگر>"
    ].join("\\n");
  }

  if (modeStyle === "operational") {
    return [
      "[ccg:tool-first:v1]",
      "Output rules: NO greetings, NO prose.",
      "Return ONLY a single code fence with the command/script."
    ].join("\\n");
  }

  return [
    "[ccg:tool-first:v1]",
    "Output rules: do NOT answer like a chat bot. Be concise and tool-like.",
    "Return exactly this template and fill each section:",
    "## Command",
    "```<lang>",
    "<command or script>",
    "```",
    "## Explanation",
    "<2-5 technical lines>",
    "## Warnings",
    "<2-4 items>",
    "## Alternatives",
    "<2-3 options>"
  ].join("\\n");
}
// CCG_TOOL_DIRECTIVE_V1
function buildToolDirective(b) {
  const lang = String(b.lang ?? "fa").toLowerCase();
  const outputType = String(b.outputType ?? "markdown").toLowerCase();
  const cli = String(b.cli ?? "bash").toLowerCase();

  const fence =
    (cli.includes("powershell") || cli === "pwsh") ? "powershell" :
    (cli.includes("cmd") || cli.includes("bat")) ? "bat" : "bash";

  const fa = lang.startsWith("fa");

  const commonFa =
`قواعد خروجی (خیلی مهم):
- بدون سلام، بدون مقدمه، بدون لحن چت‌گونه.
- خروجی باید عملیاتی و قابل کپی باشد.
- تیترها را دقیقاً انگلیسی بده: Explanation / Warnings / Alternatives
- توضیح کوتاه و کاربردی (حداکثر 3 تا 5 خط).
- اگر ریسک یا نیاز به دسترسی دارد، حتماً در Warnings بنویس.
- اگر جایگزین مناسب دارد، در Alternatives لیست کن.`;

  const commonEn =
`Output rules (very important):
- No greetings, no chatty filler.
- Output must be operational and copy-ready.
- Use headings exactly: Explanation / Warnings / Alternatives
- Keep explanation short (max 3-5 lines).
- Put risks/privileges in Warnings.
- Put viable options in Alternatives.`;

  if (outputType === "command") {
    return fa
      ? `${commonFa}\n- قالب دقیق:\n1) فقط یک code block با زبان ${fence} که داخلش فقط خودِ دستور(ها) باشد.\n2) سپس Explanation, Warnings, Alternatives.`
      : `${commonEn}\n- Exact format:\n1) A single ${fence} code block containing ONLY the command(s).\n2) Then Explanation, Warnings, Alternatives.`;
  }

  if (outputType === "script") {
    return fa
      ? `${commonFa}\n- قالب دقیق:\n1) یک code block با زبان ${fence} شامل اسکریپت کامل.\n2) سپس Explanation, Warnings, Alternatives.`
      : `${commonEn}\n- Exact format:\n1) One ${fence} code block with the full script.\n2) Then Explanation, Warnings, Alternatives.`;
  }

  return fa
    ? `${commonFa}\n- اول یک code block لازم (اگر دستور/اسکریپت داری)، بعد بخش‌ها.`
    : `${commonEn}\n- Put a code block first when you provide commands/scripts, then the sections.`;
}

function buildVars(body, userRequest) {
  const b = (body && typeof body === "object") ? body : {};
  const contextLine = buildContext(b);
  
  const toolHint = buildToolHint(b);
const finalRequest = contextLine ? `${contextLine}\n${userRequest}` : userRequest;

  return {
  mode: (String(b.modeStyle || "").toLowerCase() === "operational" ? "pro" : inferMode(b)),

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
  try {
    return res.status(200).json({ ok: true, service: "ccg", ts: Date.now() });
  } catch (e) {
    console.error("[CCG] ping error:", e);
    return res.status(500).json({ ok: false, error: "PING_ERROR" });
  }
});


router.post("/", async (req, res) => {
  const rid = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const body = (req.body && typeof req.body === "object") ? req.body : {};
  let userRequest = pickUserRequest(body);

  // compare-safe: comparator payload may not send user_request; infer and default
  const _b = body || {};
  const _mode = String(_b.mode ?? "").toLowerCase().trim();
  const _hasA = String(_b.input_a ?? _b.inputA ?? _b.a ?? _b.input1 ?? _b.codeA ?? _b.code_a ?? "").trim().length > 0;
  const _hasB = String(_b.input_b ?? _b.inputB ?? _b.b ?? _b.input2 ?? _b.codeB ?? _b.code_b ?? "").trim().length > 0;
  const _looksLikeCompare = _mode.startsWith("compare") || (_hasA && _hasB);

  if (!userRequest && _looksLikeCompare) {
    userRequest = "Compare code A and code B. Provide: (1) key differences, (2) risks/breaking changes, (3) recommended merged version if possible.";
    console.log(`[CCG] rid=${rid} user_request=auto(compare)`);
  }

  if (!userRequest) {
    return res.status(400).json({ ok: false, error: "userRequest is required" });
  }

  const vars = buildVars(body, userRequest);

  try {
    const ai = await runAI({ variables: vars, fallbackPrompt: fallbackPrompt(vars) });

    if (ai?.error) {
      console.error(`[CCG] rid=${rid} AI_ERROR=${ai.error}`);
      
  const toolPkg = formatToolResponse({ outputType: body?.outputType, text: out, cli: body?.cli, lang: body?.lang });
return res.status(200).json({
  ok: true,
  output: toolPkg.markdown,
  result: toolPkg.markdown,
  tool: toolPkg.tool,
});
    }
  // CCG_ENFORCE_COMMAND_FENCE_V1
  const outRaw = String(ai?.output || "").trim();
  const preferredLang = (String(body?.cli || "").toLowerCase() === "powershell") ? "powershell" : "bash";
  const out = formatToolResponse({ outputType: body?.outputType, text: outRaw, preferredLang });

    return res.status(200).json({
      ok: true,
      output: undefined ?? out,
      result: undefined ?? out, // compatibility
      tool: undefined ?? null,
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    console.error(`[CCG] rid=${rid} ROUTE_ERROR=${msg}`);
    return 
  // ---- CCG Tool Contract (Generator only) ----
  try {
    const __body = (typeof body !== "undefined" ? body : (req?.body || {})) || {};
    const __mode = __body?.mode || "";
    // Do NOT affect comparator / other modes
    if (__mode !== "compare" && __mode !== "error_analyze" && __mode !== "errorAnalyzer") {
      const __raw = (typeof out !== "undefined" ? out : (typeof ai !== "undefined" ? (ai?.output || ai?.result || ai?.markdown || "") : ""));
      const __cli = (typeof vars !== "undefined" ? (vars?.cli || __body?.cli) : __body?.cli) || "bash";
      const __os  = (typeof vars !== "undefined" ? (vars?.os  || __body?.os)  : __body?.os)  || "linux";
      const __lang = (typeof vars !== "undefined" ? (vars?.lang || __body?.lang) : __body?.lang) || "fa";
      const __ur = (typeof userRequest !== "undefined" ? userRequest : (__body?.user_request || __body?.userRequest || __body?.user_request_text || ""));
      const __ot = __body?.outputType || "markdown";
      const formatted = formatToolResponse({ text: String(__raw || ""), cli: __cli, outputType: __ot, os: __os, lang: __lang, userRequest: __ur });
      const _b = (req && req.body) ? req.body : {};
      const _out = (typeof out !== 'undefined') ? out : String((typeof ai !== 'undefined' && ai && (ai.output ?? ai.result)) ?? '').trim();
      const _formatted = formatToolResponse({ text: _out, outputType: (_b.outputType || 'markdown'), cli: (_b.cli || 'bash') });
      const responseOutput = (_formatted && _formatted.markdown) ? _formatted.markdown : _out;
      const responseTool = (_formatted && _formatted.tool) ? _formatted.tool : null;
      return res.json({ ok: true, output: responseOutput, result: undefined.markdown, tool: undefined.tool });
    }
  } catch (e) {
    // fallthrough to existing response
  }
  // ---- end tool contract ----

res.status(200).json({ ok: false, error: msg, output: "" });
  } finally {
    const ms = Date.now() - t0;
    console.log(`[CCG] rid=${rid} ms=${ms} keys=${Object.keys(body).join(",")}`);
  }
});

export default router;

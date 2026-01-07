// server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { buildFallbackPrompt, toPromptVariables } from "../utils/promptTransformer.js";
import { formatToolResponse } from "../utils/outputFormatter.js";



// CCG_WITH_TIMEOUT_V1
async function withTimeout(promise, ms, label="TIMEOUT") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(label)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

// CCG_GLOBAL_SAFETY_HOOKS
process.on("unhandledRejection", (err) => {
  console.error("[CCG] unhandledRejection", err);
});
process.on("uncaughtException", (err) => {
  console.error("[CCG] uncaughtException", err);
});

const router = express.Router();

router.get("/ping", (req, res) => {
  res.json({ ok: true, service: "ccg", ts: Date.now() });
});

// Helper: normalize incoming request fields (back-compat)
const CCG_VERBOSITY_HINT_V1 = true;

function pickUserRequest(body = {}) {
  return String(
    body.user_request ??
    body.userRequest ??
    body.request ??
    body.prompt ??
    ""
  ).trim();
}

function normBody(req) {
  const b = (req && req.body && typeof req.body === "object") ? req.body : {};
  return {
    ...b,
    mode: String(b.mode || "").trim() || "generate",
    lang: String(b.lang || "fa"),
    os: String(b.os || "linux"),
    cli: String(b.cli ?? b.shell ?? b.terminal ?? "bash"),
    vendor: b.vendor ? String(b.vendor) : "",
    deviceType: b.deviceType ? String(b.deviceType) : "",
    outputType: String(b.outputType || "markdown"),
  };
}

router.post("/", async (req, res) => {
  const body = (req && req.body && typeof req.body === "object") ? req.body : {};

  // Back-compat fields
  const mode = String(body.mode || "generate").toLowerCase();
  const verbosity = String(body.verbosity || body.knowledgeLevel || "normal").toLowerCase(); // brief|normal|detailed (or old levels)
  const outputType = String(body.outputType || "tool").toLowerCase();

  const userRequest = String(
    body.user_request ?? body.userRequest ?? body.request ?? body.prompt ?? ""
  ).trim();

  const targetCommand = String(body.targetCommand || "").trim();

  if (!userRequest && mode !== "explain") {
    return res.status(400).json({ ok: false, error: "MISSING_USER_REQUEST" });
  }
  if (mode === "explain" && !targetCommand) {
    return res.status(400).json({ ok: false, error: "MISSING_TARGET_COMMAND" });
  }

  try {
    // Normalize context
    const lang = String(body.lang || "fa");
    const platform = String(body.platform || body.os || "linux");
    const os = String(body.os || platform || "linux");
    const cli = String(body.cli || body.shell || "bash");
    const vendor = body.vendor ? String(body.vendor) : "";
    const deviceType = body.deviceType ? String(body.deviceType) : "";

    // Build prompt variables (use existing transformer if present)
    const vars = toPromptVariables({
      ...body,
      mode,
      verbosity,
      outputType,
      lang,
      platform,
      os,
      cli,
      vendor,
      deviceType,
      user_request: userRequest
    });

    // Deterministic hint — makes verbosity/mode actually take effect
    const toolHint =
`[CCG_MODE=${mode}]
[VERBOSITY=${verbosity}]
[PLATFORM=${platform}]
[OS=${os}]
[CLI=${cli}]
[VENDOR=${vendor}]
[DEVICE_TYPE=${deviceType}]
Return tool-style output. In explain mode: DO NOT change the command.`;

    const finalUserRequest =
      (mode === "explain")
        ? `Explain this exact command WITHOUT changing it:\n${targetCommand}\n\nContext:\n${userRequest}\n\n${toolHint}`
        : `${userRequest}\n\n${toolHint}`;

    vars.user_request = finalUserRequest;

    const fallbackPrompt = buildFallbackPrompt(vars);

    const ai = await withTimeout(runAI({
      userRequest: finalUserRequest,
      variables: vars,
      fallbackPrompt,
    }), 18000, "openai_timeout");

    const out = String(ai?.output ?? ai?.result ?? "").trim();

    // formatToolResponse must accept forcedCommand for explain mode
    const formatted = formatToolResponse({
      rawText: out,
      cli,
      outputType,
      userRequest: finalUserRequest,
      forcedCommand: mode === "explain" ? targetCommand : ""
    });

    // Backward compatible response:
    // - output: markdown string
    // - tool: tool object
    return res.json({
      ok: true,
      output: formatted.output || formatted.markdown || "",
      tool: formatted.tool || null,
      markdown: formatted.markdown || formatted.output || "",
      result: formatted.output || formatted.markdown || ""
    });
  } catch (e) {
    const msg = String(e?.message || e || "");
    const code = msg.includes("openai_timeout") ? "OPENAI_TIMEOUT" : "AI_ERROR";
    return res.status(200).json({
      ok: false,
      error: code,
      message: msg.slice(0, 500),
      output: "",
      tool: null
    });
  }
});


export default router;

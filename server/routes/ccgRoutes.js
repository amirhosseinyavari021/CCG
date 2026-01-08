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
  const body = (req?.body && typeof req.body === "object") ? req.body : {};
  const mode = String(body.mode || "generate").toLowerCase(); // generate | explain
  const lang = String(body.lang || "fa");
  const platform = String(body.platform || "linux");
  const os = String(body.os || platform || "linux");
  const cli = String(body.cli || "bash");
  const vendor = body.vendor ? String(body.vendor) : "";
  const deviceType = body.deviceType ? String(body.deviceType) : "general";
  const verbosity = String(body.verbosity || "normal").toLowerCase(); // brief|normal|detailed
  const outputType = String(body.outputType || "tool").toLowerCase(); // tool|command|python

  const user_request = String(body.user_request || body.userRequest || "").trim();
  const targetCommand = String(body.targetCommand || body.command || "").trim();

  if (!user_request) return res.status(400).json({ ok:false, error:"MISSING_USER_REQUEST" });

  try {
    const vars = toPromptVariables({
      ...body,
      lang,
      platform,
      os,
      cli,
      vendor,
      deviceType,
      verbosity,
      outputType,
      user_request
    });

    // Strong hint for model behaviour
    const hint = `[CCG]
mode=${mode}
outputType=${outputType}
verbosity=${verbosity}
platform=${platform}
os=${os}
cli=${cli}
vendor=${vendor}
deviceType=${deviceType}
Rules:
- tool: command + explanation + warnings + alternatives
- command: command + warnings + alternatives (NO explanation)
- python: python code only (NO explanation/warnings/alternatives)`;

    const finalUser = (mode === "explain" && targetCommand)
      ? `${hint}\nExplain this exact command WITHOUT changing it:\n${targetCommand}\nContext:\n${user_request}`
      : `${hint}\n${user_request}`;

    vars.user_request = finalUser;
    vars.force_raw = "1";
    const fallbackPrompt = buildFallbackPrompt(vars);

    const ai = await runAI({
      userRequest: finalUser,
      variables: vars,
      fallbackPrompt,
    });

    const raw = String(ai?.output ?? ai?.result ?? "").trim();
    const forced = (mode === "explain" && targetCommand) ? targetCommand : "";

    const formatted = formatToolResponse({
      rawText: raw,
      cli,
      outputType,
      forcedCommand: forced,
    });

    // Always return stable shape
    return res.json({
      ok: true,
      output: formatted.output,
      tool: formatted.tool,
      meta: { mode, outputType, verbosity, platform, os, cli }
    });

  } catch (e) {
    console.error("[CCG] ROUTE_ERROR", e);
    return res.status(200).json({
      ok: false,
      error: e?.message || "CCG_ERROR",
      output: "",
      tool: null
    });
  }
});



export default router;

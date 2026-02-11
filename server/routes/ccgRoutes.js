// /home/cando/CCG/server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatOutput } from "../utils/outputFormatter.js";
import { toPromptVariables, buildFallbackPrompt } from "../utils/promptTransformer.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "ccg", ts: Date.now() });
});

function pickUserRequest(body) {
  const b = body && typeof body === "object" ? body : {};
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

function safeObj(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : {};
}

function compactAdvanced(adv) {
  const a = safeObj(adv);
  const out = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

router.post("/", async (req, res) => {
  const t0 = Date.now();
  const rid = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    const body = safeObj(req.body);
    const userRequest = pickUserRequest(body);

    if (!userRequest) {
      return res.status(200).json({
        ok: false,
        error: "user_request is required",
        output: "",
        markdown: "",
        tool: null,
        commands: [],
        moreCommands: [],
        pythonScript: "",
        requestId: rid,
        ms: Date.now() - t0,
      });
    }

    const platform = String(body.platform || body.os || "linux").toLowerCase();
    const cli = String(body.cli || body.shell || "bash").toLowerCase();

    const moreDetails = Boolean(body.moreDetails);
    const moreCommands = Boolean(body.moreCommands);
    const pythonScript = Boolean(body.pythonScript);

    const lang = String(body.lang || "fa").toLowerCase() === "en" ? "en" : "fa";

    const advancedEnabled = Boolean(body.advancedEnabled);
    const advanced = advancedEnabled ? compactAdvanced(body.advanced) : null;

    const variables = toPromptVariables({
      mode: "generate",
      modeStyle: "generator",
      lang,
      platform,
      os: platform,
      cli: pythonScript ? "python" : cli,
      user_request: userRequest,

      outputType: pythonScript ? "python" : "tool",
      knowledgeLevel: "intermediate",

      moreDetails,
      moreCommands,

      advanced: advanced || undefined,
      pythonScript,
    });

    const fallbackPrompt = buildFallbackPrompt(variables);

    const ai = await runAI({
      variables,
      fallbackPrompt,
      temperature: 0.25,
    });

    if (ai?.error) {
      return res.status(200).json({
        ok: false,
        error: ai.error,
        output: "",
        markdown: "",
        tool: null,
        commands: [],
        moreCommands: [],
        pythonScript: "",
        requestId: rid,
        ms: Date.now() - t0,
        lang,
        flags: { moreDetails, moreCommands, pythonScript },
      });
    }

    const raw = String(ai?.output || "").trim();

    // ✅ خروجی استاندارد برای UI
    const formatted = formatOutput(raw, {
      cli,
      lang,
      wantMoreCommands: moreCommands ? 5 : 2,
    });

    return res.status(200).json({
      ok: true,
      output: formatted.markdown || "",
      markdown: formatted.markdown || "",
      tool: null,

      commands: formatted.commands || [],
      moreCommands: formatted.moreCommands || [],
      pythonScript: formatted.pythonScript || "",

      requestId: rid,
      ms: Date.now() - t0,
      lang,
      flags: { moreDetails, moreCommands, pythonScript },
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);
    return res.status(200).json({
      ok: false,
      error: msg,
      output: "",
      markdown: "",
      tool: null,
      commands: [],
      moreCommands: [],
      pythonScript: "",
      requestId: rid,
      ms: Date.now() - t0,
    });
  }
});

export default router;

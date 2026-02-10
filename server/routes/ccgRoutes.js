// server/routes/ccgRoutes.js
import express from "express";
import { runAI } from "../utils/aiClient.js";
import { formatOutput } from "../utils/outputFormatter.js";
import { toPromptVariables, buildFallbackPrompt } from "../utils/promptTransformer.js";

const router = express.Router();

/**
 * Lightweight health
 */
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
      return res.status(400).json({ ok: false, error: "user_request is required", requestId: rid });
    }

    // ✅ generator-only (chat uses chatRoutes)
    const modeStyle = "generator";

    const platform = String(body.platform || body.os || "linux").toLowerCase();
    const cli = String(body.cli || body.shell || "bash").toLowerCase();

    const moreDetails = Boolean(body.moreDetails);
    const moreCommands = Boolean(body.moreCommands);
    const pythonScript = Boolean(body.pythonScript);

    const advancedEnabled = Boolean(body.advancedEnabled);
    const advanced = advancedEnabled ? compactAdvanced(body.advanced) : null;

    // ✅ variables for stored prompt + fallback prompt
    const variables = toPromptVariables({
      mode: "generate",
      modeStyle,
      lang: body.lang || "fa",
      platform,
      os: platform,
      cli: pythonScript ? "python" : cli,
      user_request: userRequest,

      // keep (internal contract)
      outputType: pythonScript ? "python" : "tool",
      knowledgeLevel: "intermediate",

      // new generator knobs
      moreDetails,
      moreCommands,

      // advanced only if explicitly enabled
      advanced: advanced || undefined,
    });

    // ✅ Always provide strict fallback prompt (JSON tool contract)
    const fallbackPrompt = buildFallbackPrompt(variables);

    const ai = await runAI({
      variables,
      fallbackPrompt,
      temperature: 0.25,
    });

    if (ai?.error) {
      // IMPORTANT: avoid 502 by returning JSON even if upstream fails
      return res.status(200).json({
        ok: false,
        error: ai.error,
        output: "",
        markdown: "",
        tool: null,
        requestId: rid,
      });
    }

    const raw = String(ai?.output || "").trim();

    // ✅ Convert raw/JSON into stable tool+markdown for UI cards
    const formatted = formatOutput({
      text: raw,
      rawText: raw,
      cli: variables.cli || cli,
      outputType: variables.outputType || "tool",
    });

    return res.status(200).json({
      ok: true,
      output: formatted.markdown || "",
      markdown: formatted.markdown || "",
      tool: formatted.tool || null,
      requestId: rid,
      ms: Date.now() - t0,
    });
  } catch (e) {
    const msg = e?.message ? e.message : String(e);

    // ✅ never let nginx show 502 HTML; return JSON
    return res.status(200).json({
      ok: false,
      error: msg,
      output: "",
      markdown: "",
      tool: null,
      requestId: rid,
      ms: Date.now() - t0,
    });
  }
});

export default router;

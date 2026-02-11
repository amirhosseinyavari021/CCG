// /home/cando/CCG/server/utils/aiClient.js
import { callOpenAICompat } from "./openaiCompat.js";
import { buildGeneratorPrompt } from "./promptBuilder.js";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

export async function runAI(vars = {}) {
  // IMPORTANT:
  // ccgRoutes passes { variables, fallbackPrompt, temperature, ... }
  // We must merge vars.variables into the working context.
  const base = (vars && typeof vars === "object" ? vars : {});
  const v = (base.variables && typeof base.variables === "object") ? base.variables : {};
  const ctx = { ...v, ...base };

  const mode = s(ctx.mode || "generate").toLowerCase();
  const isGenerator = mode === "generate" || mode === "generator";

  const prompt =
    s(ctx.prompt).trim() ||
    (isGenerator ? buildGeneratorPrompt(ctx) : buildGeneratorPrompt(ctx));

  try {
    const res = await callOpenAICompat({
      prompt,
      model: ctx.model || process.env.AI_PRIMARY_MODEL,
      temperature: typeof ctx.temperature === "number" ? ctx.temperature : 0.25,
    });

    if (res?.error) return { error: res.error, output: "" };

    return {
      output: s(res?.output || res?.text || res?.result || ""),
      raw: res,
    };
  } catch (e) {
    return { error: e?.message ? e.message : String(e), output: "" };
  }
}

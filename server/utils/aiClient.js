// server/utils/aiClient.js
import { callOpenAICompat } from "./openaiCompat.js";
import { buildGeneratorPrompt } from "./promptBuilder.js";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}
function bool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

export async function runAI(vars) {
  const mode = s(vars.mode || "generate").toLowerCase();

  // For generator mode: always use our strict JSON prompt.
  // (We keep other modes intact if you later extend.)
  const isGenerator = mode === "generate" || mode === "generator";

  const prompt =
    s(vars.prompt).trim() ||
    (isGenerator
      ? buildGeneratorPrompt(vars)
      : // fallback: treat as generator anyway (safe default for CCG route)
        buildGeneratorPrompt(vars));

  // Single-shot request
  const res = await callOpenAICompat({
    prompt,
    // Optional hints if your compat layer supports it:
    // temperature: 0.2,
  });

  return {
    output: s(res?.output || res?.text || res?.result || ""),
    raw: res,
  };
}

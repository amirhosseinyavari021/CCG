// server/utils/promptTransformer.js
export function normalizeLang(lang) {
  return lang === "fa" ? "fa" : "en";
}

export function normalizeMode(mode) {
  // UI might send: learn / pro / compare / explain / error
  const m = String(mode || "").toLowerCase();
  if (["learn", "pro", "compare", "explain", "error"].includes(m)) return m;
  return "learn";
}

export function normalizeKnowledgeLevel(level) {
  const k = String(level || "").toLowerCase();
  if (["beginner", "intermediate", "expert"].includes(k)) return k;
  return "beginner";
}

export function toPromptVariables({
  mode,
  os,
  cli,
  lang,
  deviceType,
  knowledgeLevel,
  user_request,
  error_message,
  input_a,
  input_b,
}) {
  return {
    mode: normalizeMode(mode),
    os: String(os || "unknown"),
    cli: String(cli || "unknown"),
    lang: normalizeLang(lang),
    deviceType: String(deviceType || "general"),
    knowledgeLevel: normalizeKnowledgeLevel(knowledgeLevel),
    user_request: String(user_request || ""),
    ...(error_message ? { error_message: String(error_message) } : {}),
    ...(input_a ? { input_a } : {}),
    ...(input_b ? { input_b } : {}),
  };
}

// Fallback prompt if stored-prompt fails (keeps system alive)
export function buildFallbackPrompt(vars) {
  const {
    mode, os, cli, lang, deviceType, knowledgeLevel, user_request, error_message, input_a, input_b,
  } = vars;

  return `
You are CCG. Output in ${lang === "fa" ? "Persian (RTL) with technical tokens in English" : "English"}.
Mode: ${mode}. Knowledge: ${knowledgeLevel}.
Platform: ${os}. CLI: ${cli}. Device: ${deviceType}.

Return Markdown with sections:
## Command
## Explanation
## Alternatives
## Warnings

User Request:
${user_request}

${error_message ? `Error Message:\n${error_message}\n` : ""}

${input_a ? `Code A:\n${input_a}\n` : ""}
${input_b ? `Code B:\n${input_b}\n` : ""}
`.trim();
}

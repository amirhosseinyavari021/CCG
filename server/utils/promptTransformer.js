// server/utils/promptTransformer.js
// Deterministic "generator" prompt => JSON tool contract (NOT chat)

function asStr(x, d = "") {
  if (x === null || x === undefined) return d;
  if (typeof x === "string") return x;
  try {
    return String(x);
  } catch {
    return d;
  }
}

function asBool(x) {
  return x === true || x === "true" || x === 1 || x === "1";
}

/**
 * Normalizes payload into variables that both:
 * - stored prompt can accept
 * - fallback prompt can enforce
 */
export function toPromptVariables(payload = {}) {
  const p = payload && typeof payload === "object" ? payload : {};
  const lang = asStr(p.lang, "fa").toLowerCase();
  const platform = asStr(p.platform || p.os, "linux").toLowerCase();
  const cli = asStr(p.cli, platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash").toLowerCase();

  const outputType = asStr(p.outputType, "tool").toLowerCase(); // tool|python
  const knowledgeLevel = asStr(p.knowledgeLevel, "intermediate").toLowerCase();

  const moreDetails = asBool(p.moreDetails);
  const moreCommands = asBool(p.moreCommands);

  const advanced = p.advanced && typeof p.advanced === "object" ? p.advanced : undefined;

  return {
    mode: asStr(p.mode, "generate").toLowerCase(),
    modeStyle: asStr(p.modeStyle, "generator"),
    lang,
    platform,
    os: platform,
    cli,
    outputType,
    knowledgeLevel,

    moreDetails,
    moreCommands,

    // raw user request
    user_request: asStr(p.user_request || p.userRequest || p.prompt || p.text || p.message, "").trim(),

    // optional extras
    vendor: asStr(p.vendor, ""),
    deviceType: asStr(p.deviceType, ""),
    advanced,
  };
}

function jsonContractSpecFa({ outputType, cli, platform, altCount, detailLevel }) {
  const isPython = outputType === "python" || cli === "python";
  return `
You are CCG Command Generator (GENERATOR MODE). This is NOT chat.
Return ONLY a valid JSON object (no markdown, no code fences, no extra text).

JSON schema:
{
  "tool": {
    "title": "short Persian title",
    "lang": "${isPython ? "python" : cli}",
    "platform": "${platform}",
    "primary": { "label": "command", "command": "..." },
    "alternatives": [ { "label": "alternative", "command": "..." } ],
    "explanation": [ "bullet 1", "bullet 2" ],
    "warnings": [ "warning 1", "warning 2" ]
  }
}

Rules:
- Always provide exactly 1 primary command/script.
- Provide up to ${altCount} alternatives.
- explanation length: ${detailLevel}.
- warnings: always include at least 1 safety warning (permissions/data loss/impact).
- Do NOT ask questions, do NOT add “if you have questions…” lines.
- Commands must match platform=${platform} and cli=${isPython ? "python" : cli}.
`.trim();
}

function fewShot() {
  // tiny anchor example
  return `
Example:
Input: user_request="restart computer", platform="windows", cli="powershell"
Output:
{"tool":{"title":"ریستارت سیستم در ویندوز (PowerShell)","lang":"powershell","platform":"windows","primary":{"label":"command","command":"Restart-Computer"},"alternatives":[{"label":"alternative","command":"shutdown /r /t 0"}],"explanation":["Restart-Computer سیستم را ریستارت می‌کند.","اگر CMD لازم بود از shutdown استفاده کنید."],"warnings":["اگر کار ذخیره نشده دارید، قبل از اجرا ذخیره کنید."]}}
`.trim();
}

export function buildFallbackPrompt(v) {
  const vars = v && typeof v === "object" ? v : {};
  const platform = asStr(vars.platform, "linux").toLowerCase();
  const cli = asStr(vars.cli, platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash").toLowerCase();
  const outputType = asStr(vars.outputType, "tool").toLowerCase();
  const moreDetails = !!vars.moreDetails;
  const moreCommands = !!vars.moreCommands;

  const altCount = moreCommands ? 4 : 2;
  const detailLevel = moreDetails ? "detailed (4-8 bullets)" : "concise (2-4 bullets)";

  const contract = jsonContractSpecFa({ outputType, cli, platform, altCount, detailLevel });

  // include advanced only if exists
  const adv = vars.advanced ? JSON.stringify(vars.advanced) : "";

  return `
${contract}

${fewShot()}

User request (Persian):
${asStr(vars.user_request, "")}

Context:
- platform=${platform}
- cli=${cli}
- pythonScript=${outputType === "python" ? "true" : "false"}
- moreDetails=${moreDetails ? "true" : "false"}
- moreCommands=${moreCommands ? "true" : "false"}
${adv ? `- advanced=${adv}` : ""}

Return ONLY JSON.
`.trim();
}

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

export function toPromptVariables(payload = {}) {
  const p = payload && typeof payload === "object" ? payload : {};
  const lang = asStr(p.lang, "fa").toLowerCase() === "en" ? "en" : "fa";
  const platform = asStr(p.platform || p.os, "linux").toLowerCase();
  const cli = asStr(
    p.cli,
    platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash"
  ).toLowerCase();

  const outputType = asStr(p.outputType, "tool").toLowerCase();
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
    user_request: asStr(p.user_request || p.userRequest || p.prompt || p.text || p.message, "").trim(),
    vendor: asStr(p.vendor, ""),
    deviceType: asStr(p.deviceType, ""),
    advanced,
    input_a: asStr(p.input_a, ""),
    input_b: asStr(p.input_b, ""),
    codeLangA: asStr(p.codeLangA, ""),
    codeLangB: asStr(p.codeLangB, ""),
  };
}

function languageRule(lang) {
  if (lang === "en") {
    return `LANGUAGE RULE (STRICT):
- Output MUST be English only.
- Do NOT output any other language.`;
  }
  return `قانون زبان (خیلی سخت‌گیرانه):
- خروجی MUST فقط فارسی باشد.
- هیچ زبان دیگری ننویس (نه کره‌ای/ژاپنی/چینی/انگلیسی و ...).`;
}

function jsonContractSpecFa({ outputType, cli, platform, altCount, detailLevel, lang }) {
  const isPython = outputType === "python" || cli === "python";
  const titleHint = lang === "fa" ? "عنوان کوتاه و مفید" : "Short useful title";

  return `
You are CCG Command Generator (GENERATOR MODE). This is NOT chat.
Return ONLY a valid JSON object (no markdown, no code fences, no extra text).

${languageRule(lang)}

JSON schema:
{
  "tool": {
    "title": "${titleHint}",
    "lang": "${isPython ? "python" : cli}",
    "platform": "${platform}",
    "primary": { "label": "command", "command": "..." },
    "alternatives": [ { "label": "alternative", "command": "..." } ],
    "explanation": [ "..." ],
    "warnings": [ "..." ]
  }
}

Rules:
- Always provide exactly 1 primary command/script.
- Provide up to ${altCount} alternatives.
- explanation length: ${detailLevel}.
- warnings: always include at least 1 safety warning (permissions/data loss/impact).
- Do NOT ask questions.
- Commands must match platform=${platform} and cli=${isPython ? "python" : cli}.
`.trim();
}

function fewShot() {
  return `
Example:
Input: user_request="restart computer", platform="windows", cli="powershell"
Output:
{"tool":{"title":"ریستارت ویندوز","lang":"powershell","platform":"windows","primary":{"label":"command","command":"Restart-Computer"},"alternatives":[{"label":"alternative","command":"shutdown /r /t 0"}],"explanation":["سیستم را ریستارت می‌کند.","اگر CMD لازم بود از shutdown استفاده کن."],"warnings":["قبل از اجرا فایل‌ها را ذخیره کن."]}}
`.trim();
}

export function buildFallbackPrompt(v) {
  const vars = v && typeof v === "object" ? v : {};
  const platform = asStr(vars.platform, "linux").toLowerCase();
  const cli = asStr(
    vars.cli,
    platform === "windows" ? "powershell" : platform === "mac" ? "zsh" : "bash"
  ).toLowerCase();

  const outputType = asStr(vars.outputType, "tool").toLowerCase();
  const moreDetails = !!vars.moreDetails;
  const moreCommands = !!vars.moreCommands;

  const altCount = moreCommands ? 4 : 2;
  const detailLevel = moreDetails ? "detailed (4-8 bullets)" : "concise (2-4 bullets)";

  const lang = asStr(vars.lang, "fa").toLowerCase() === "en" ? "en" : "fa";

  const contract = jsonContractSpecFa({ outputType, cli, platform, altCount, detailLevel, lang });
  const adv = vars.advanced ? JSON.stringify(vars.advanced) : "";

  return `
${contract}

${fewShot()}

User request:
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

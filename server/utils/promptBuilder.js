// server/utils/promptBuilder.js
// Generator-only strict JSON prompt builder (English prompts for best model adherence)

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function bool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

export function buildGeneratorPrompt(vars) {
  const lang = s(vars.lang || "fa").toLowerCase();
  const platform = s(vars.os || vars.platform || "linux");
  const cli = s(vars.cli || "bash");
  const vendor = s(vars.vendor || "");
  const deviceType = s(vars.deviceType || "");
  const userRequest = s(vars.user_request || vars.userRequest || "");

  const moreDetails = bool(vars.moreDetails);
  const moreCommands = bool(vars.moreCommands);
  const pythonScript = bool(vars.pythonScript);

  const altCount = moreCommands ? 5 : 3;

  // Keep the UI language, but keep instructions in English for the model
  const outputLanguageHint =
    lang === "fa"
      ? "Write user-facing text fields (title/explanation/warnings/notes) in Persian (Farsi)."
      : "Write user-facing text fields (title/explanation/warnings/notes) in English.";

  const deviceContext =
    platform === "network"
      ? `Network context: vendor="${vendor}", deviceType="${deviceType}". Use the correct network CLI syntax for that vendor/OS.`
      : `OS context: platform="${platform}", cli="${cli}". Use the correct commands for that platform and shell.`;

  // IMPORTANT: strict JSON only. No markdown. No extra commentary.
  // Also: avoid chatty phrases.
  return `
You are CCG Generator. This is NOT a chat. Return ONLY a single JSON object. No markdown. No code fences. No extra text.

${outputLanguageHint}
Do NOT add chatty phrases like "Ask if you have more questions".

${deviceContext}

User request:
"${userRequest}"

Rules:
- Output MUST be valid JSON (double quotes, no trailing commas).
- If pythonScript=true: generate a Python script instead of CLI commands.
- Otherwise: generate CLI output:
  - primary_command: exactly ONE main command (string). It must be the best recommended command.
  - alternatives: an array of exactly ${altCount} alternative commands (strings). Do NOT repeat primary_command.
- Always include:
  - title (string)
  - explanation (array of strings)  ${moreDetails ? "Detailed and helpful." : "Short and practical."}
  - warnings (array of strings)     ${moreDetails ? "Include important safety/impact warnings." : "Only the key warning(s)."}
  - notes (array of strings)        ${moreDetails ? "Include tips, prerequisites, and context." : "Optional short notes."}
- For network platform: commands must match the vendor/deviceType. Prefer safe 'show' commands if request is read-only.
- Never include more than one primary command.
- Do not include markdown headings or bullet characters. Use arrays of strings instead.

JSON schema (MUST follow exactly):
{
  "mode": "generator",
  "platform": "${platform}",
  "cli": "${cli}",
  "pythonScript": ${pythonScript ? "true" : "false"},
  "title": "string",
  "primary_command": "string (empty if pythonScript=true)",
  "alternatives": ["string", ...],
  "python_script": "string (empty if pythonScript=false)",
  "explanation": ["string", ...],
  "warnings": ["string", ...],
  "notes": ["string", ...]
}

Now produce the JSON object.
`.trim();
}

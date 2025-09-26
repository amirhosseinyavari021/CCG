/**
 * cli/apiService-cli.js
 *
 * callApi(...) improved:
 *  - Uses OPENAI_API_KEY if present (calls Chat Completions).
 *  - For mode === 'generate' enforces EXACT 3 command outputs (command|||explanation|||warning)
 *    and will retry up to maxRetries with stricter prompts if parsing fails.
 *  - Provides safe deterministic fallbacks when no API key.
 *  - Returns structured data consumed by cmdgen-cli.js.
 */

const axios = require('axios').default;
const { parseGenerateOutput, validateScript } = require('./responseParser-cli.js');

const baseSystemPrompt = `
You are "CMDGEN-X", an expert-level command-line assistant. Your absolute highest priorities are correctness, efficiency, and adherence to best practices. A non-functional, inefficient, or syntactical mistake is unacceptable.
- User's OS: {{os}} (Version: {{osVersion}})
- User's Shell: {{cli}}
- **CRITICAL: You MUST respond exclusively in the following language: {{language}}.**
`;

const buildBasePrompt = (os, osVersion, cli, lang) => {
  const language = lang === 'fa' ? 'Persian (Farsi)' : 'English';
  return baseSystemPrompt
    .replace(/{{os}}/g, os || 'unknown')
    .replace(/{{osVersion}}/g, osVersion || 'unknown')
    .replace(/{{cli}}/g, cli || 'unknown')
    .replace(/{{language}}/g, language);
};

const getSystemPrompt = (mode, os, osVersion, cli, lang, options = {}) => {
  const finalBasePrompt = buildBasePrompt(os, osVersion, cli, lang);
  const { existingCommands = [] } = options;

  const goldenRules = `
**GOLDEN RULES (NON-NEGOTIABLE FOR ALL SHELLS):**
1.  **SYNTAX IS SACRED:** The command MUST be syntactically perfect and runnable without modification. No typos.
2.  **SIMPLICITY AND EFFICIENCY:** Provide direct, modern, efficient solutions.
3.  **NO BACKTICKS:** Do NOT wrap commands in markdown backticks.
4.  **SECURITY:** If a command is destructive, include a clear WARNING field.
`;

  let shellInstructions = '';
  const lowerCli = (cli || '').toLowerCase();
  if (lowerCli.includes('powershell')) {
    shellInstructions = `
**SHELL NUANCE: POWERSHELL**
- Use proper cmdlet syntax and PowerShell variables (e.g. $env:USERPROFILE).
- Use Where-Object { $_.Property -eq "Value" }, not broken forms.
`;
  } else if (['bash', 'zsh', 'sh'].some(s => lowerCli.includes(s))) {
    shellInstructions = `
**SHELL NUANCE: BASH/ZSH**
- Quote variables ("$variable") as needed.
- Prefer find/xargs/rsync over brittle ls|grep constructions.
`;
  } else if (lowerCli === 'cmd') {
    shellInstructions = `
**SHELL NUANCE: CMD (Command Prompt)**
- Use Windows path styles and %USERPROFILE% for user folder.
`;
  }

  switch (mode) {
    case 'generate': {
      const existingCommandsPrompt = existingCommands.length > 0
        ? `You have already suggested: ${existingCommands.join(', ')}. Please provide 3 NEW and different commands.`
        : 'Please provide 3 highly useful and practical command-line suggestions.';
      return `${finalBasePrompt}
${goldenRules}
${shellInstructions}
**MISSION:** Provide 3 distinct, practical, and **syntactically PERFECT** commands. Double-check your output for syntax errors.
**OUTPUT FORMAT (ABSOLUTE):** Output exactly 3 lines, EACH line in this exact format (no extra lines):
command|||short_explanation|||warning_or_empty
- If there's no warning, use the empty string for the third field.
- Do NOT include any Markdown or code fences.
- Do not output additional commentary.
${existingCommandsPrompt}
`;
    }
    case 'script':
      return `${finalBasePrompt}
${goldenRules}
${shellInstructions}
**MISSION:** Generate a complete, runnable script that solves the requested task. Include brief inline comments only if necessary.
**OUTPUT FORMAT:** Output ONLY the raw script code (no markdown fences), followed optionally by a single 'EXPLANATION:' block separated by a blank line.
`;
    case 'explain':
      return `${finalBasePrompt}
**MISSION:** Analyze the provided command/script and explain what it does, list risks, and propose improvements.
**OUTPUT FORMAT:** Provide a structured explanation.
`;
    case 'error':
      return `${finalBasePrompt}
${goldenRules}
**MISSION:** Analyze the user's error message. Provide probable cause and concrete steps to fix.
**OUTPUT FORMAT:** Single line with fields separated by '|||': probable_cause|||short_explanation|||fix_steps (semicolon-separated).
`;
    default:
      return finalBasePrompt;
  }
};

async function callApi({
  userInput = '',
  mode = 'generate',
  cli = 'bash',
  os = 'unknown',
  osVersion = '',
  lang = 'en',
  existingCommands = [],
  maxRetries = 2,
  temperature = 0.2,
  top_p = 1.0
} = {}) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, { existingCommands });

  const parseAndValidateGenerate = (text) => {
    const parsed = parseGenerateOutput(text, cli);
    if (!Array.isArray(parsed) || parsed.length !== 3) return null;
    for (const it of parsed) {
      if (!it.command || typeof it.command !== 'string' || it.command.trim().length === 0) return null;
    }
    return parsed;
  };

  // Fallback if no API key
  if (!OPENAI_KEY) {
    if (mode === 'generate') {
      const shell = (cli || '').toLowerCase();
      if (shell.includes('powershell')) {
        return {
          data: {
            commands: [
              { command: 'Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5', explanation: 'List top 5 processes by memory usage', warning: '' },
              { command: 'Get-ChildItem -Recurse -File | Where-Object { $_.Length -gt 1GB } | Select-Object FullName, Length', explanation: 'Find files larger than 1GB', warning: '' },
              { command: 'Get-Service | Where-Object { $_.Status -eq "Stopped" }', explanation: 'List services that are stopped', warning: '' }
            ],
            raw: 'FALLBACK: no OPENAI key'
          }
        };
      } else {
        return {
          data: {
            commands: [
              { command: 'ps aux --sort=-%mem | awk \'NR<=6{print $0}\'', explanation: 'Show top memory-consuming processes', warning: '' },
              { command: 'find $HOME -type f -size +1G -exec ls -lh {} \\; | awk \'{print $9, $5}\'', explanation: 'Find files larger than 1GB under home', warning: '' },
              { command: 'du -sh ~/Downloads/* | sort -hr | head -n 10', explanation: 'Show largest items in Downloads', warning: '' }
            ],
            raw: 'FALLBACK: no OPENAI key'
          }
        };
      }
    }
    if (mode === 'script') {
      return { data: { script: '#!/bin/bash\n# Fallback script - no OPENAI key\n echo "No OPENAI key; placeholder script."', explanation: 'Fallback script', raw: 'FALLBACK' } };
    }
    if (mode === 'analyze') {
      return { data: { explanation: 'No OPENAI key available: cannot analyze deeply. Provide heuristics.', raw: 'FALLBACK' } };
    }
    if (mode === 'error') {
      return { data: { help: 'No OPENAI key: cannot analyze error automatically in-depth.', raw: 'FALLBACK' } };
    }
  }

  // Prepare OpenAI client via axios
  const client = axios.create({
    baseURL: 'https://api.openai.com/v1',
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`
    }
  });

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput }
  ];

  if (mode === 'generate') {
    messages.push({
      role: 'user',
      content: `YOU MUST OUTPUT EXACTLY 3 LINES. Each line MUST be: command|||short_explanation|||warning_or_empty. No extra text, no markdown, no commentary. If no warning, put empty after last |||.`
    });
  }

  let attempt = 0;
  let lastError = null;
  while (attempt <= maxRetries) {
    try {
      const resp = await client.post('/chat/completions', {
        model: MODEL,
        messages,
        temperature,
        top_p,
        max_tokens: 800
      });

      const content = resp?.data?.choices?.[0]?.message?.content || '';
      if (mode === 'generate') {
        const parsed = parseAndValidateGenerate(content);
        if (parsed) {
          return { data: { commands: parsed, raw: content } };
        } else {
          // Add stricter instruction and retry
          attempt++;
          messages.push({
            role: 'user',
            content: `Your previous response did not follow the EXACT required format. OUTPUT EXACTLY 3 LINES in this format: command|||short_explanation|||warning_or_empty. No extra lines or commentary. Retry now.`
          });
          lastError = new Error('LLM response did not parse to 3 valid commands.');
          continue;
        }
      }

      if (mode === 'script') {
        const raw = content.trim();
        const ok = validateScript(raw, cli);
        return { data: { script: raw, explanation: ok ? '' : 'Script returned (validation not strict)', raw } };
      }

      if (mode === 'analyze') {
        return { data: { explanation: content, raw: content } };
      }

      if (mode === 'error') {
        // collapse multi-line into single line for help
        const single = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(' ||| ');
        return { data: { help: single, raw: content } };
      }

      return { data: { raw: content } };

    } catch (err) {
      lastError = err;
      // small exponential backoff
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      attempt++;
      if (attempt > maxRetries) break;
    }
  }

  const errMsg = lastError ? (lastError.message || String(lastError)) : 'Unknown error calling LLM';
  throw new Error(`callApi failed after ${attempt} attempts: ${errMsg}`);
}

module.exports = {
  getSystemPrompt,
  callApi
};
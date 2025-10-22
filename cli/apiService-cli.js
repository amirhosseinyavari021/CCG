const axios = require('axios/dist/node/axios.cjs');
const chalk = require('chalk');
const { parseAndConstructData } = require('./responseParser-cli.js');

const baseSystemPrompt = `
You are "CMDGEN-X", an expert-level command-line and network engineering assistant. Your absolute highest priorities are correctness, efficiency, and adherence to best practices. A non-functional or syntactically incorrect command is a critical failure.

**User Context:**
- Platform: {{os}} (Version: {{osVersion}}, Device: {{device}})
- Shell/Environment: {{cli}}
- User's Expertise: {{expertise}}
- **CRITICAL: You MUST respond exclusively in the following language: {{language}}.**

**Instructions based on Expertise:**
- For **Beginner**: Provide simple, safe commands. Explain every part of the command in detail. Include basic concepts.
- For **Intermediate**: Provide efficient, common-practice commands. Explain the purpose and key flags. Assume foundational knowledge.
- For **Expert**: Provide concise, powerful, and advanced commands. Focus on efficiency and scripting potential. Assume deep knowledge.
`;

const buildBasePrompt = (os, osVersion, cli, lang, knowledgeLevel, deviceType) => {
    const language = lang === 'fa' ? 'Persian (Farsi)' : 'English';
    return baseSystemPrompt
        .replace('{{os}}', os || 'Not Specified')
        .replace('{{osVersion}}', osVersion || 'N/A') // Correctly handles optional version
        .replace('{{cli}}', cli || 'Not Specified')
        .replace('{{language}}', language)
        .replace('{{expertise}}', knowledgeLevel || 'intermediate')
        .replace('{{device}}', deviceType || 'N/A');
};

const getSystemPrompt = (mode, os, osVersion, cli, lang, options = {}) => {
    const { existingCommands = [], knowledgeLevel, deviceType, code = '', error = '' } = options;
    const finalBasePrompt = buildBasePrompt(os, osVersion, cli, lang, knowledgeLevel, deviceType);

    const goldenRules = `
**GOLDEN RULES (NON-NEGOTIABLE):**
1.  **SYNTAX IS SACRED:** The command MUST be syntactically perfect and runnable.
2.  **PRACTICAL & ACCURATE:** Provide commands that are functional and directly relevant to the user's request and specified OS/shell.
3.  **NO MARKDOWN IN COMMANDS:** The command part of the output must be raw text.
4.  **SECURITY FIRST:** If a command is destructive (e.g., \`rm\`, \`format\`), you MUST include a clear warning.
`;

    let platformInstructions = "";
    const lowerOs = (os || '').toLowerCase();
    const lowerCli = (cli || '').toLowerCase();

    if (lowerOs.includes('cisco')) {
        platformInstructions = `
**PLATFORM NUANCE: CISCO**
- Target Device: **${deviceType || 'generic'}**. Tailor commands (e.g., VLANs for switches, routing for routers).
- Configuration Context: Show necessary mode changes (e.g., \`configure terminal\`, \`interface ...\`).
`;
    } else if (lowerOs.includes('mikrotik')) {
        platformInstructions = `
**PLATFORM NUANCE: MIKROTIK (RouterOS)**
- Commands MUST start with \`/\` (e.g., \`/ip address add\`).
- Provide full, unambiguous commands.
- Differentiate between \`add\`, \`set\`, and \`print\` commands.
`;
    } else if (lowerOs.includes('python')) {
        platformInstructions = `
**PLATFORM NUANCE: PYTHON**
- Provide clean, modern, idiomatic Python 3 code.
- Import necessary libraries (e.g., \`os\`, \`subprocess\`, \`paramiko\` for automation).
- Focus on automation tasks, especially for network and system administration.
`;
    } else if (lowerCli.includes('powershell')) {
        platformInstructions = `
**SHELL NUANCE: POWERSHELL**
- Use correct operators (\`-eq\`, \`-gt\`).
- Prefer modern cmdlets (\`Get-CimInstance\`).
`;
    } else if (['bash', 'zsh', 'sh'].includes(lowerCli)) {
        platformInstructions = `
**SHELL NUANCE: BASH/ZSH/SH**
- **Always quote variables** ("$variable").
- Use correct test operators (\`[[ -f "$file" ]]\`).
`;
    }

    switch (mode) {
        // --- Existing Modes ---
        case 'generate':
            const existingCommandsPrompt = existingCommands.length > 0
                ? `\n**CRITICAL: You have already suggested: [${existingCommands.join(', ')}]. DO NOT suggest these again. Provide 3 COMPLETELY NEW commands.**`
                : 'Provide 3 distinct, practical, and syntactically PERFECT single-line commands.';

            return `${finalBasePrompt}
${goldenRules}
${platformInstructions}
**MISSION:** ${existingCommandsPrompt}
**OUTPUT FORMAT:** You MUST output exactly 3 lines using this exact format:
command|||short_explanation|||warning (if any)
`;

        case 'script':
            return `${finalBasePrompt}
${goldenRules}
${platformInstructions}
**MISSION:** Generate a complete, executable script. Replace placeholders like <password> with a concrete example like 'YourSecretPassword' and add a comment to change it.
**OUTPUT FORMAT:** Output ONLY the raw script code.
`;

        case 'explain':
            return `${finalBasePrompt}
${goldenRules}
${platformInstructions}
**MISSION:** Analyze the user's command/script and provide a comprehensive explanation.
**OUTPUT FORMAT:** Use Markdown with clear headings: Purpose, Breakdown, and Expert Tip.
`;

        case 'error':
            return `${finalBasePrompt}
${goldenRules}
**MISSION:** Analyze the error. Provide a probable cause, explanation, and concrete solution steps.
**OUTPUT FORMAT:** MUST be a single line: probable_cause|||explanation|||CMD: solution_command_1
`;

        // --- New Smart Compiler Modes ---
        case 'detect-lang':
            return `You are a language detection expert. Analyze the code snippet and respond with ONLY the common name of the programming language (e.g., Python, JavaScript, Bash, PowerShell, C++, Java).
**MISSION:** Detect the language from the following code:
${code}`;

        case 'explain-code':
            return `You are an expert developer. **Briefly** explain what the user's code is expected to do in a friendly tone. Respond in **${language}**.
**MISSION:** Explain this code:
${code}`;

        case 'analyze-error':
            return `You are a friendly and empathetic debugging assistant. The user's code failed. Explain the problem in a human-like, encouraging tone. Respond in **${language}**.
**MISSION:** Analyze this error.
**CODE:**
${code}
**ERROR:**
${error}`;

        case 'auto-fix':
            return `You are an expert code fixer. The user's code produced an error. Provide a fixed version. Respond with **ONLY** the raw, fixed code block. Do not add any explanation or markdown.
**MISSION:** Fix this code.
**CODE:**
${code}
**ERROR:**
${error}`;

        case 'learning-mode':
            return `You are an educator. Explain the provided code with a step-by-step execution trace or a detailed line-by-line breakdown for a beginner. Respond in **${language}**.
**MISSION:** Provide a learning-mode trace for this code:
${code}`;

        case 'review-code':
            return `You are a senior code reviewer. Analyze the code for potential optimizations, bugs, or security improvements. Provide your suggestions as a bulleted list. If there are no issues, say so. Respond in **${language}**.
**MISSION:** Review this code:
${code}`;

        case 'visualize-flow':
            return `You are a CLI artist. Create a simple, text-based (ASCII/Unicode) visual representation of the provided code's execution flow (e.g., using arrows, indentation).
**MISSION:** Visualize this code's flow:
${code}`;

        case 'safety-check':
            return `You are a security bot. Does this code perform any potentially unsafe operations (e.g., file deletion, network access, sudo/admin commands, 'rm -rf', 'format', 'Invoke-Expression')? Respond with 'SAFE' if no issues are found. If unsafe, respond with 'UNSAFE: [brief reason]'.
**MISSION:** Analyze this code for safety:
${code}`;

        case 'suggestions':
            return `You are an expert developer. The user's code ran successfully. Provide brief suggestions for improvement, next steps, or alternative approaches. Respond in **${language}**.
**MISSION:** Provide suggestions for this code:
${code}`;

        default:
            return finalBasePrompt;
    }
};

// --- Refactored Spinner and API Call Logic ---

let spinnerInterval;
const startSpinner = (message) => {
    if (spinnerInterval) return;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l'); // Hide cursor
    spinnerInterval = setInterval(() => {
        process.stdout.write(chalk.blue(`\r${frames[i++ % frames.length]} ${message}`));
    }, 80);
};

const stopSpinner = () => {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
    }
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
};

const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com';

/**
 * Calls the AI proxy API.
 * @param {object} params - The parameters for the API call.
 * @param {string} params.mode - The AI mode (e.g., 'generate', 'explain-code').
 * @param {string} params.userInput - The user's text input.
 * @param {string} params.os - The target OS.
 * @param {string} params.cli - The target CLI.
 * @param {string} params.lang - The response language.
 * @param {object} params.options - Additional options (knowledgeLevel, code, error, etc.).
 * @param {string} [initialSpinnerMessage='Connecting...'] - The message for the spinner.
 * @returns {Promise<object|null>} The parsed API response or null on failure.
 */
const callApi = async (params, initialSpinnerMessage = 'Connecting to server...') => {
    const { mode, userInput, os, osVersion, cli, lang, options = {} } = params;

    // For compiler modes, 'userInput' is the code or error.
    // We'll pass it as 'code' or 'error' in options for clarity in getSystemPrompt.
    let promptOptions = { ...options };
    if (['detect-lang', 'explain-code', 'review-code', 'visualize-flow', 'safety-check', 'suggestions', 'learning-mode'].includes(mode)) {
        promptOptions.code = userInput;
    }
    if (['analyze-error', 'auto-fix'].includes(mode)) {
        // Assume userInput is 'code|||error'
        const parts = userInput.split('|||');
        promptOptions.code = parts[0];
        promptOptions.error = parts[1];
    }

    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, promptOptions);

    // For modes that just get a system prompt, user input is empty
    const userContent = ['detect-lang', 'explain-code', 'review-code', 'visualize-flow', 'safety-check', 'suggestions', 'learning-mode', 'analyze-error', 'auto-fix'].includes(mode)
        ? "Analyze the code provided in the system prompt."
        : userInput;

    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }] };

    const attemptRequest = (url) => new Promise(async (resolve, reject) => {
        try {
            const response = await axios.post(`${url}/api/proxy`, payload, { responseType: 'stream', timeout: 60000 });
            stopSpinner();
            startSpinner('Generating response...');
            let fullContent = '';
            response.data.on('data', chunk => {
                const textChunk = new TextDecoder().decode(chunk);
                textChunk.split('\n').filter(line => line.startsWith('data: ')).forEach(line => {
                    const jsonPart = line.substring(5).trim();
                    if (jsonPart && jsonPart !== "[DONE]") {
                        try { fullContent += JSON.parse(jsonPart).choices[0].delta.content || ''; } catch (e) { }
                    }
                });
            });
            response.data.on('end', () => {
                stopSpinner();
                const finalData = parseAndConstructData(fullContent, mode, cli);
                if (!finalData) reject(new Error("Parsing failed"));
                else resolve({ type: mode, finalData });
            });
            response.data.on('error', reject);
        } catch (err) { reject(err); }
    });

    try {
        startSpinner(initialSpinnerMessage);
        return await attemptRequest(primaryServerUrl);
    } catch (primaryError) {
        stopSpinner();
        console.warn(chalk.yellow(`\n⚠️  Primary server failed. Trying fallback...`));
        startSpinner('Connecting to fallback server...');
        try {
            return await attemptRequest(fallbackServerUrl);
        } catch (fallbackError) {
            stopSpinner();
            console.error(chalk.red(`\n❌ Error: Could not connect to any server.`));
            return null;
        }
    }
};


module.exports = { getSystemPrompt, callApi, startSpinner, stopSpinner };
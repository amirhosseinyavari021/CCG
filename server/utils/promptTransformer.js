/**
 * Creates the "system" message that sets the context for the AI.
 * -- UPDATED with stricter rules and safety warnings --
 */
const systemMessage = {
    role: "system",
    content: `You are CCG (Cando Command Generator), an expert-level AI assistant specializing in command-line interfaces, scripting, and code analysis.
- Your goal is to provide accurate, safe, and helpful responses.
- You MUST strictly adhere to the output format specified in the user's request. Do not add any conversational text, greetings, or explanations *unless* it is part of the requested format (e.g., inside the 'explanation' part).
- For 'generate' mode, each command MUST be on a new line in the exact format: \`command ||| explanation ||| warning\`
- Generate **one or more** practical commands relevant to the request.
- If a requested command is destructive or dangerous (e.g., uses \`rm -rf\`, \`fdisk\`, \`format\`, or modifies system-wide permissions), you MUST provide a clear danger message in the "warning" part.
- Adjust the complexity of your answer based on the "User Knowledge Level" if provided. For 'beginner', be simple and verbose. For 'expert', be advanced and concise.
- For **Persian (fa)** language requests, generate all explanations, notes, and AI analyses in **Persian**, while keeping code, CLI syntax, and technical words in **English**. Ensure Persian text uses appropriate fonts and direction (RTL).`
};

/**
 * Transforms the client's variables object into an OpenAI-compatible `messages` array.
 * -- UPDATED to use ALL variables and add FortiGate --
 *
 * @param {object} variables - The `prompt.variables` object from the client.
 * @returns {Array<object>} An array of messages for the OpenAI API.
 */
export const transformPrompt = (variables) => {
    const {
        mode,
        os,
        lang,
        user_request,
        input_a,
        input_b,
        error_message,
        // --- NEWLY ADDED VARIABLES ---
        cli,
        osVersion,
        knowledgeLevel,
        deviceType, // Used for Cisco, potentially adaptable for FortiGate if needed later
        existingCommands,
        analysis
    } = variables;

    let userContent = "";

    // Helper to build a context string
    const getContext = (task) => {
        let platform = os;
        if (os?.toLowerCase() === 'fortigate') {
            platform = 'FortiGate (FortiOS)';
        }
        return `
Task: ${task}
Platform: ${platform}
${osVersion ? `OS Version: ${osVersion}` : ''}
${cli ? `Shell/Environment: ${cli}` : ''}
${knowledgeLevel ? `User Knowledge Level: ${knowledgeLevel}` : ''}
${(os?.toLowerCase() === 'cisco' && deviceType) ? `Device Type (Cisco): ${deviceType}` : ''}
Language: ${lang}
`;
    };


    switch (mode) {
        case 'generate':
            userContent = `
${getContext('Generate command-line commands.')}
Request: ${user_request}

${existingCommands && existingCommands.length > 0 ?
                    `IMPORTANT: The user has already seen these commands. Do not generate them again. Provide new, different suggestions.
Ignored commands:
${existingCommands.map(cmd => `- ${cmd}`).join('\n')}` : ''}

Format: Respond with **one or more** commands relevant to the request. Each command must be on a new line in the format:
command ||| explanation ||| warning (if any)
`;
            break;

        case 'script':
            userContent = `
${getContext('Generate a complete, runnable script.')}
Request: ${user_request}

Format: Respond *only* with the raw script code inside a markdown code block. Do not include explanations outside the code block unless they are comments within the script itself.
`;
            break;

        case 'explain': // Web client
        case 'analyze': // CLI client
            userContent = `
${getContext('Analyze and explain a command.')}
Command: ${user_request}

Format: Respond with a clear, step-by-step explanation of the command, tailored to the user's knowledge level. Use Markdown for formatting. If the language is Persian, ensure explanations are in Persian.
`;
            break;

        case 'error':
            userContent = `
${getContext('Analyze an error message and provide a solution.')}
Error: ${error_message}

Format: Respond in the following "|||" separated format:
Probable Cause ||| Detailed Explanation ||| Solution Step 1 (Prefix command steps with 'CMD: ') ||| Solution Step 2 (if any) ||| Solution Step 3 (if any)
If the language is Persian, ensure Cause and Explanation are in Persian.
`;
            break;

        // --- Code Compare Modes ---
        case 'detect-lang':
            userContent = `
Task: Detect the programming language of the provided code snippet.
Code:
${input_a}

Format: Respond with *only* the name of the language (e.g., "Python", "JavaScript", "Bash").
`;
            break;

        case 'compare-diff':
            userContent = `
Task: Analyze the logical differences between two code snippets. Do not just list line changes.
Language: ${lang}
Code A (Original):
${input_a}

Code B (Modified):
${input_b}

Format: Respond with a detailed, human-readable analysis of the *logical* changes, new features, or bug fixes. If the language is Persian, respond in Persian.
`;
            break;

        case 'compare-quality':
            userContent = `
Task: Review the "Modified" code (Code B) for quality, security, and best practices, comparing it to "Original" (Code A).
Language: ${lang}
Code A (Original):
${input_a}

Code B (Modified):
${input_b}

Format: Respond with a list of suggestions for quality, performance, or security improvements in Code B. If the language is Persian, respond in Persian.
`;
            break;

        case 'compare-merge':
            userContent = `
Task: Intelligently merge two code snippets based on the provided analysis.
Language: ${lang}
Code A (Original):
${input_a}

Code B (Modified):
${input_b}

${analysis ? `--- ANALYSIS (Context for Merge) ---
${analysis}
--- END ANALYSIS ---` : ''}

Format: Respond *only* with the raw, merged code inside a markdown code block. Apply fixes from the analysis if possible. Do not include explanations outside the code block.
`;
            break;

        default:
            userContent = `
Task: Fulfill a user request based on the provided context.
Context Variables: ${JSON.stringify(variables)}
Language: ${lang}

Format: Provide a direct and helpful response. If the language is Persian, respond in Persian, keeping technical terms and code in English.
`;
    }

    return [
        systemMessage,
        {
            role: "user",
            content: userContent.trim()
        }
    ];
};
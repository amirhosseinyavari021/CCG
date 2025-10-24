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
- If a requested command is destructive or dangerous (e.g., uses \`rm -rf\`, \`fdisk\`, \`format\`, or modifies system-wide permissions), you MUST provide a clear danger message in the "warning" part.
- Adjust the complexity of your answer based on the "User Knowledge Level" if provided. For 'beginner', be simple and verbose. For 'expert', be advanced and concise.`
};

/**
 * Transforms the client's variables object into an OpenAI-compatible `messages` array.
 * -- UPDATED to use ALL variables for higher quality responses --
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
        deviceType,
        existingCommands,
        analysis
    } = variables;

    let userContent = "";

    // Helper to build a context string
    const getContext = (task) => `
Task: ${task}
Platform: ${os}
${osVersion ? `OS Version: ${osVersion}` : ''}
${cli ? `Shell/Environment: ${cli}` : ''}
${knowledgeLevel ? `User Knowledge Level: ${knowledgeLevel}` : ''}
${deviceType ? `Device Type (for Cisco): ${deviceType}` : ''}
Language: ${lang}
`;

    switch (mode) {
        case 'generate':
            userContent = `
${getContext('Generate command-line commands.')}
Request: ${user_request}

${existingCommands && existingCommands.length > 0 ?
                    `IMPORTANT: The user has already seen these commands. Do not generate them again. Provide new, different suggestions.
Ignored commands:
${existingCommands.map(cmd => `- ${cmd}`).join('\n')}` : ''}

Format: Respond with one or more commands. Each command must be on a new line in the format:
command ||| explanation ||| warning (if any)
`;
            break;

        case 'script':
            userContent = `
${getContext('Generate a complete, runnable script.')}
Request: ${user_request}

Format: Respond *only* with the raw script code. Do not include markdown, explanations, or any other text.
`;
            break;

        case 'explain': // Web client
        case 'analyze': // CLI client
            userContent = `
${getContext('Analyze and explain a command.')}
Command: ${user_request}

Format: Respond with a clear, step-by-step explanation of the command, tailored to the user's knowledge level.
`;
            break;

        case 'error':
            userContent = `
${getContext('Analyze an error message and provide a solution.')}
Error: ${error_message}

Format: Respond in the following "|||" separated format:
Probable Cause ||| Detailed Explanation ||| Solution Step 1 ||| Solution Step 2 (if any) ||| Solution Step 3 (if any)
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

Format: Respond with a detailed, human-readable analysis of the *logical* changes, new features, or bug fixes.
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

Format: Respond with a list of suggestions for quality, performance, or security improvements in Code B.
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

Format: Respond *only* with the raw, merged code, applying fixes from the analysis if possible. Do not include markdown or explanations.
`;
            break;

        default:
            userContent = `
Task: Fulfill a user request.
Language: ${lang}
Request: ${user_request || error_message}
Code A: ${input_a}
Code B: ${input_b}

Format: Provide a direct and helpful response.
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
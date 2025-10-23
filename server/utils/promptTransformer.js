/**
 * Creates the "system" message that sets the context for the AI.
 */
const systemMessage = {
    role: "system",
    content: `You are CCG (Cando Command Generator), an expert-level AI assistant specializing in command-line interfaces, scripting, and code analysis.
- Your goal is to provide accurate, safe, and helpful responses.
- You must strictly adhere to the output format specified in the user's request.
- Do not add any conversational text, greetings, or explanations *unless* it is part of the requested format.`
};

/**
 * Transforms the client's variables object into an OpenAI-compatible `messages` array.
 * This includes specific instructions for the AI to use the '|||' separator format
 * that the client parsers rely on.
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
        error_message
    } = variables;

    let userContent = "";

    switch (mode) {
        case 'generate':
            userContent = `
Task: Generate command-line commands.
Platform: ${os}
Language: ${lang}
Request: ${user_request}

Format: Respond with one or more commands. Each command must be on a new line in the format:
command ||| explanation ||| warning (if any)
`;
            break;

        case 'script':
            userContent = `
Task: Generate a complete, runnable script.
Platform: ${os}
Language: ${lang}
Request: ${user_request}

Format: Respond *only* with the raw script code. Do not include markdown, explanations, or any other text.
`;
            break;

        case 'explain': // Web client
        case 'analyze': // CLI client
            userContent = `
Task: Analyze and explain a command.
Platform: ${os}
Language: ${lang}
Command: ${user_request}

Format: Respond with a clear, step-by-step explanation of the command.
`;
            break;

        case 'error':
            userContent = `
Task: Analyze an error message and provide a solution.
Platform: ${os}
Language: ${lang}
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
Task: Intelligently merge two code snippets.
Language: ${lang}
Code A (Original):
${input_a}

Code B (Modified):
${input_b}

Format: Respond *only* with the raw, merged code. Do not include markdown, explanations, or any other text.
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
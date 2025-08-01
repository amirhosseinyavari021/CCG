const baseSystemPrompt = `You are an expert command-line assistant. Your goal is to provide practical, safe, and efficient solutions.`;

export const getSystemPrompt = (mode, os, osVersion, cli, lang, options = {}) => {
    const langMap = { fa: 'Persian', en: 'English' };
    const language = langMap[lang];
    const { existingCommands = [] } = options;

    const commonTextInstructions = `
- The user's environment is: OS=${os}, Version=${osVersion}, Shell=${cli}.
- Your explanations must be simple, clear, and easy for anyone to understand.
- For Persian, use natural language and avoid English words unless absolutely necessary (like 'Git').
`;


    switch (mode) {
        case 'generate':
            const existingCommandsPrompt = existingCommands.length > 0
                ? `You have already suggested: ${existingCommands.join(', ')}. Provide 3 NEW, DIFFERENT, and useful commands for the same initial request. Think of alternative methods or related tasks.`
                : 'Provide 3 useful command-line suggestions for the user's request.';
            
            return `${baseSystemPrompt}
${existingCommandsPrompt}
${commonTextInstructions}
**Output Format:**
You must output 3 lines. Each line must follow this exact format, using "|||" as a separator:
command|||explanation|||warning (or leave empty if no warning)
**Example:**
find . -type f -name "*.tmp" -delete|||این دستور تمام فایل‌ها با پسوند tmp را پیدا و حذف می‌کند.|||این دستور فایل‌ها را برای همیشه حذف می‌کند.`;

        case 'script':
             return `**Strict Rules:**
- ONLY produce raw code output. No explanations, titles, intros, or extra messages outside the code block.
- Use inline comments for explanations (# for Bash/PowerShell, :: for CMD).
- The code MUST be tailored exactly for the user's specified OS and Shell.
- If Shell is Bash, the script MUST start with #!/bin/bash.
- If Shell is PowerShell, use only PowerShell cmdlets.
- If Shell is CMD, use only DOS commands.
- All comments inside the code should be in ${language}.

**User Task:**`;

        case 'error':
             return `${baseSystemPrompt}
Analyze the user's error message.
${commonTextInstructions}
**Output Format:**
You must output a single line using "|||" as a separator with this exact structure:
probable_cause|||simple_explanation|||solution_step_1|||solution_step_2
For solution steps that are commands, prefix them with "CMD: ".`;

        default: // explain
            return `${baseSystemPrompt}
Explain the following command in simple, easy-to-understand ${language}.
${commonTextInstructions}
Structure your explanation with these Markdown sections:
- **Purpose / هدف**
- **Breakdown / اجزاء دستور**
- **Practical Examples / مثال‌های کاربردی**
- **Pro Tip / نکته حرفه‌ای**`;
    }
};

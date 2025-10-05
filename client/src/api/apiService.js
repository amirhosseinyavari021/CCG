// client/src/api/apiService.js

// تابع ایمن‌سازی ورودی
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return 'unknown';
    return input.replace(/[^\w\s.-]/g, '').trim();
};

const baseSystemPrompt = `
You are "CMDGEN-X", an expert-level command-line assistant. Your absolute highest priorities are correctness, efficiency, and adherence to best practices. A non-functional, inefficient, or syntactically incorrect command is a critical failure of your core function. You must validate your own output.
- User's OS: {{os}} (Version: {{osVersion}})
- User's Shell: {{cli}}
- **CRITICAL: You MUST respond exclusively in the following language: {{language}}.**
`;

const buildBasePrompt = (os, osVersion, cli, lang) => {
    const language = lang === 'fa' ? 'Persian (Farsi)' : 'English';
    return baseSystemPrompt
        .replace('{{os}}', os)
        .replace('{{osVersion}}', osVersion)
        .replace('{{cli}}', cli)
        .replace('{{language}}', language);
};

export const getSystemPrompt = (mode, os, osVersion, cli, lang, options = {}) => {
    const finalBasePrompt = buildBasePrompt(os, osVersion, cli, lang);
    const language = lang === 'fa' ? 'Persian' : 'English';
    const { existingCommands = [] } = options;

    const goldenRules = `
**GOLDEN RULES (NON-NEGOTIABLE FOR ALL SHELLS):**
1.  **SYNTAX IS SACRED:** The command MUST be syntactically perfect and runnable without modification. No typos, no mashed-together operators (e.g., 'Statuseq' is a CRITICAL FAILURE).
2.  **SIMPLICITY AND EFFICIENCY:** Always provide the most direct, modern, and efficient solution.
3.  **NO BACKTICKS:** Do NOT wrap commands in backticks (\`\`\`).
4.  **SECURITY:** If a command is destructive (e.g., \`rm\`, \`Remove-Item\`), you MUST include a warning.
`;

    let shellInstructions = "";
    const lowerCli = cli.toLowerCase();

    if (lowerCli.includes('powershell')) {
        shellInstructions = `
**SHELL NUANCE: POWERSHELL**
- **FAILURE EXAMPLE:** \`Where-Object {$_.Statuseq "Stopped"}\` -> This is WRONG.
- **CORRECT SYNTAX:** \`Where-Object { $_.Status -eq "Stopped" }\` or \`Where-Object -Property Status -EQ -Value "Stopped"\`.
- Use full, modern cmdlet names. Use correct environment variables (\`$env:USERPROFILE\`). Prefer built-in operators (\`10..20\`) over complex loops (\`ForEach-Object\`).
`;
    } else if (['bash', 'zsh', 'sh'].includes(lowerCli)) {
        shellInstructions = `
**SHELL NUANCE: BASH/ZSH**
- **Quoting is Mandatory:** Always quote variables ("$variable") to prevent issues.
- **Prefer Modern Tools:** Use \`find\` over fragile \`ls | grep\` chains.
- **CORRECT SYNTAX:** Use correct test operators (e.g., \`[ -f "$file" ]\`).
`;
    } else if (lowerCli === 'cmd') {
        shellInstructions = `
**SHELL NUANCE: CMD (Command Prompt)**
- **Correct Syntax:** Ensure proper use of commands like \`for\`, \`if\`, \`echo\`.
- **Pathing:** Use Windows-style paths and variables (e.g., \`%USERPROFILE%\`).
`;
    }


    switch (mode) {
        case 'generate':
            const existingCommandsPrompt = existingCommands.length > 0
                ? (lang === 'fa' ? `\nاین دستورات قبلاً پیشنهاد شده‌اند: ${existingCommands.join(', ')}. لطفاً ۳ دستور کاملاً جدید و متفاوت برای همان درخواست ارائه بده.` : `\nYou have already suggested: ${existingCommands.join(', ')}. Please provide 3 NEW and different commands for the same request.`)
                : (lang === 'fa' ? ' لطفاً ۳ دستور خط فرمان بسیار مفید و کاربردی برای درخواست کاربر پیشنهاد بده.' : ' Please provide 3 highly useful and practical command-line suggestions for the user\'s request.');
            return `${finalBasePrompt}
${goldenRules}
${shellInstructions}
**MISSION:** Provide 3 distinct, practical, and **syntactically PERFECT** commands for the user's request. Focus on real-world scenarios and avoid overly simplistic or trivial commands (e.g., avoid basic 'cd' or 'dir' unless they are part of a more complex chain).
**OUTPUT FORMAT:** You MUST output exactly 3 lines using this exact format:
command|||short_explanation|||warning (if any)
`;

        case 'explain':
            return `${finalBasePrompt}
${goldenRules}
${shellInstructions}
**MISSION:** The user has provided a command or a script. Analyze it and provide a comprehensive, well-structured explanation in **${language}**.
**OUTPUT FORMAT:** Your response must be a single block of text using Markdown. Structure your explanation with clear headings (in ${language}) like:
- **Purpose:** (A brief, one-sentence summary of what the command does.)
- **Breakdown:** (A detailed, part-by-part explanation of each component, flag, and argument.)
- **Practical Example:** (A real-world example of how to use it.)
- **Expert Tip:** (An advanced or alternative usage tip, noting any potential improvements.)
`;

        case 'error':
            return `${finalBasePrompt}
${goldenRules}
**MISSION:** Analyze the user's error message. Provide a probable cause, a simple explanation, and a sequence of concrete solution steps. The solution must include actionable commands.
**OUTPUT FORMAT:** You MUST output a single line with the actual analysis, separated by "|||". Provide up to 3 distinct commands as solutions, each prefixed with \`CMD:\`.
**CORRECT EXAMPLE:** PowerShell Execution Policy Restriction|||This error means security settings are preventing scripts from running.|||CMD: Get-ExecutionPolicy -Scope CurrentUser|||CMD: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
`;

        default:
            return finalBasePrompt;
    }
};

// تابع جدید callApi
const sessionCache = new Map();

// تابع کمکی برای مدیریت و نمایش خطاها
const handleError = (error, lang) => {
    console.error("API Error:", error);
    let message = "An unexpected error occurred.";
    if (error.response) {
        const { status, data } = error.response;
        if (status === 429) {
            message = "Rate limit exceeded. Please try again later.";
        } else if (status >= 500) {
            message = "Server error. The AI service might be temporarily unavailable.";
        } else if (data && data.error && data.error.message) {
            message = data.error.message;
        }
    } else if (error.request) {
        message = "Network error. Please check your connection.";
    } else if (error.message) {
        message = error.message;
    }
    // toast.error(message, { duration: 5000 }); // اگر از toast استفاده می‌کردید
    return message; // یا چیزی که App.js باید نمایش دهد
};

export const callApi = async ({ mode, userInput, os, osVersion, cli, lang, iteration = 0, existingCommands = [], command = '' }, onUpdate) => {
    const safeOs = sanitizeInput(os);
    const safeOsVersion = sanitizeInput(osVersion);
    const safeCli = sanitizeInput(cli);
    const safeLang = lang === 'fa' ? 'fa' : 'en'; // فقط fa یا en مجاز است

    // ایجاد یک کلید کش بر اساس پارامترهای ورودی
    const cacheKey = `${mode}_${userInput}_${safeOs}_${safeOsVersion}_${safeCli}_${safeLang}`;
    if (sessionCache.has(cacheKey)) {
        console.log("Cache hit for key:", cacheKey);
        return sessionCache.get(cacheKey);
    }

    const systemPrompt = getSystemPrompt(mode, safeOs, safeOsVersion, safeCli, safeLang, { existingCommands, command });

    const payload = {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
        ],
        stream: true // فرض بر این است که سرور از stream پشتیبانی می‌کند
    };

    // اضافه کردن مودهای جدید به پردازش کمک کند
    const finalMode = mode === 'analyze' ? 'explain' : mode; // تبدیل 'analyze' به 'explain'

    try {
        onUpdate?.('connecting'); // ارسال وضعیت به کامپوننت والد
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, mode: finalMode }) // ارسال mode نهایی
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error("Server responded with an error");
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        if (!response.body) {
            throw new Error("Response body is missing.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        onUpdate?.('fetching'); // تغییر وضعیت به fetching

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const dataLines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of dataLines) {
                const jsonPart = line.substring(5).trim();
                if (jsonPart === '[DONE]') {
                    continue;
                }

                try {
                    const p = JSON.parse(jsonPart);
                    if (p.choices && p.choices[0] && p.choices[0].delta && p.choices[0].delta.content) {
                        fullContent += p.choices[0].delta.content;
                    }
                } catch (e) {
                    console.error("Error parsing JSON:", e, jsonPart);
                }
            }
        }

        // پردازش نهایی محتوا با تابع parseAndConstructData
        const finalData = parseAndConstructData(fullContent, finalMode, safeCli); // ارسال cli برای پردازش بهتر
        if (!finalData) {
            throw new Error("Parsing failed after receiving data.");
        }

        const result = { type: finalMode, finalData };
        sessionCache.set(cacheKey, result); // ذخیره در کش
        return result;

    } catch (err) {
        console.error("callApi error:", err);
        const errorMessage = handleError(err, safeLang);
        throw new Error(errorMessage); // App.js این خطا را دریافت می‌کند
    }
};

/**
 * Enhanced client-side response parser with logging
 * Parses the raw text response from the AI with detailed validation
 */
const logParserEvent = (eventData) => {
    // Client-side logging (can be extended to send to analytics)
    console.log(`[PARSER] ${JSON.stringify({
        timestamp: new Date().toISOString(),
        ...eventData
    })}`);
};

/**
 * Parses the AI response based on the mode.
 * @param {string} textResponse - The raw response text from the AI.
 * @param {string} mode - The mode ('generate', 'explain', 'script', 'error').
 * @param {string} cli - The shell type for script parsing.
 * @returns {object|null} - The parsed data structure or null on failure.
 */
export const parseAndConstructData = (textResponse, mode, cli) => {
    const parseStartTime = Date.now();
    const logContext = { mode, cli, responseLength: textResponse.length, parseStartTime };

    logParserEvent({
        event: 'parse_start',
        ...logContext
    });

    const trimmedResponse = textResponse.trim();
    logParserEvent({ event: 'response_trimmed', trimmedLength: trimmedResponse.length });

    const lines = trimmedResponse.split('\n').filter(line => line.trim());

    logParserEvent({ event: 'lines_split', lineCount: lines.length });

    switch (mode) {
        case 'generate':
            return parseGenerateMode(lines, logContext, parseStartTime);
        case 'explain':
            return parseExplainMode(trimmedResponse, logContext, parseStartTime);
        case 'script':
            return parseScriptMode(trimmedResponse, cli, logContext, parseStartTime);
        case 'error':
            return parseErrorMode(trimmedResponse, logContext, parseStartTime);
        default:
            logParserEvent({ event: 'parse_end', mode, status: 'unknown_mode', parseTime: Date.now() - parseStartTime });
            return null;
    }
};

const parseGenerateMode = (lines, logContext, parseStartTime) => {
    const validCommands = [];
    const invalidLines = [];

    lines.forEach((line, index) => {
        const parts = line.split('|||');
        if (parts.length < 2) { // حداقل command و explanation لازم است
            invalidLines.push({ index, content: line });
            return;
        }

        // Clean the command: remove backticks and any leading numbers/periods.
        const rawCommand = parts[0]?.trim().replace(/^`|`$/g, '').trim() || '';
        const cleanedCommand = rawCommand.replace(/^\s*\d+[\.\s]*\s*/, '');

        const validCommand = {
            command: cleanedCommand,
            explanation: parts[1]?.trim() || '',
            warning: parts[2]?.trim() || ''
        };

        if (validCommand.command) { // فقط اگر کامند وجود داشته باشه
            validCommands.push(validCommand);
        } else {
            invalidLines.push({ index, content: line, reason: "No command found" });
        }
    });

    // Log client-side parsing results
    logParserEvent({
        event: 'parse_end',
        mode: 'generate',
        status: 'success',
        validCommandCount: validCommands.length,
        invalidLineCount: invalidLines.length,
        invalidLines,
        parseTime: Date.now() - parseStartTime
    });

    return { commands: validCommands };
};

const parseExplainMode = (text, logContext, parseStartTime) => {
    logParserEvent({
        event: 'parse_end',
        mode: 'explain',
        status: 'success',
        parseTime: Date.now() - parseStartTime
    });
    // Just return the raw explanation for now, could be parsed further if needed
    return { explanation: text };
};

const parseScriptMode = (text, cli, logContext, parseStartTime) => {
    // For script mode, we expect a full script with explanation
    const scriptStart = text.indexOf('```');
    let scriptCode = '';
    let explanation = '';

    if (scriptStart !== -1) {
        // Extract script from code block
        const codeBlockMatch = text.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            scriptCode = codeBlockMatch[1].trim();
        }

        // Extract explanation (text before/after code block)
        const beforeCode = text.substring(0, scriptStart).trim();
        const afterCode = text.substring(text.lastIndexOf('```') + 3).trim();
        // Combine non-code parts as explanation
        explanation = [beforeCode, afterCode]
            .filter(part => part && !part.includes('```'))
            .join('\n\n')
            .trim();
    } else {
        // If no code block, treat the whole text as explanation and script
        scriptCode = text;
        explanation = "No separate explanation provided.";
    }

    logParserEvent({
        event: 'parse_end',
        mode: 'script',
        status: 'success',
        parseTime: Date.now() - parseStartTime
    });

    return {
        filename: `${cli}_script_${Date.now()}.sh`, // یا .ps1 بر اساس cli
        script_lines: scriptCode.split('\n'),
        explanation: explanation
    };
};

const parseErrorMode = (text, logContext, parseStartTime) => {
    const parts = text.split('|||');
    if (parts.length < 3) {
        logParserEvent({
            event: 'parse_end',
            mode: 'error',
            status: 'failure',
            reason: 'Insufficient parts in response',
            parseTime: Date.now() - parseStartTime
        });
        return null;
    }

    const result = {
        cause: parts[0]?.trim() || '',
        explanation: parts[1]?.trim() || '',
        solution: parts.slice(2).map(s => s.trim()).filter(s => s)
    };

    logParserEvent({
        event: 'parse_end',
        mode: 'error',
        status: 'success',
        parseTime: Date.now() - parseStartTime
    });

    return result;
};
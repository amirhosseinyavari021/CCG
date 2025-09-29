/**
 * Enhanced AY-CMDGEN response parser with Markdown block support
 * Handles both legacy (|||) format and modern Markdown-structured responses
 * Logs are now conditional based on --debug flag for better performance
 */

const logParserEvent = (eventData) => {
    // Only log if --debug is present in command-line arguments
    if (process.argv.includes('--debug')) {
        console.log(`[PARSER] ${JSON.stringify({
            timestamp: new Date().toISOString(),
            ...eventData
        })}`);
    }
};

function parseAndConstructData(textResponse, mode, sessionId = null) {
    const parseStartTime = Date.now();
    const logContext = { sessionId, clientSide: true };

    try {
        const trimmedResponse = textResponse.trim();
        if (!trimmedResponse) {
            logParserEvent({
                ...logContext,
                event: 'client_parser_warning',
                issue: 'empty_response',
                mode
            });
            return null;
        }

        if (mode === 'generate') {
            return parseGenerateMode(trimmedResponse, logContext, parseStartTime);
        }

        if (mode === 'script') {
            return parseScriptMode(trimmedResponse, logContext, parseStartTime);
        }

        if (mode === 'explain') {
            logParserEvent({
                ...logContext,
                event: 'client_parser_complete',
                mode,
                responseLength: trimmedResponse.length,
                parseTime: Date.now() - parseStartTime
            });
            return { explanation: trimmedResponse };
        }

        if (mode === 'error') {
            return parseErrorMode(trimmedResponse, logContext, parseStartTime);
        }

        logParserEvent({
            ...logContext,
            event: 'client_parser_warning',
            issue: 'unknown_mode',
            mode
        });
        return null;

    } catch (error) {
        logParserEvent({
            ...logContext,
            event: 'client_parser_error',
            error: error.message,
            mode,
            parseTime: Date.now() - parseStartTime
        });
        return null;
    }
};

const parseScriptMode = (textResponse, logContext, parseStartTime) => {
    // For script mode, we expect a full script with explanation
    const scriptStart = textResponse.indexOf('```');
    let scriptCode = '';
    let explanation = '';

    if (scriptStart !== -1) {
        // Extract script from code block
        const codeBlockMatch = textResponse.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            scriptCode = codeBlockMatch[1].trim();
        }

        // Extract explanation (text before/after code block)
        const beforeCode = textResponse.substring(0, scriptStart).trim();
        const afterCode = textResponse.substring(textResponse.lastIndexOf('```') + 3).trim();

        // Combine non-code parts as explanation
        explanation = [beforeCode, afterCode]
            .filter(part => part && !part.includes('```'))
            .join('\n\n')
            .trim();
    } else {
        // If no code block, treat entire response as script
        scriptCode = textResponse;
    }

    // Log successful parsing
    logParserEvent({
        ...logContext,
        event: 'client_parser_complete',
        mode: 'script',
        responseLength: textResponse.length,
        parseTime: Date.now() - parseStartTime,
        hasCodeBlock: scriptStart !== -1
    });

    if (scriptCode) {
        return {
            explanation: explanation || scriptCode, // Use script as explanation if no clear explanation found
            script: scriptCode
        };
    }

    return null;
};

const parseGenerateMode = (textResponse, logContext, parseStartTime) => {
    // Try modern Markdown format first, then fall back to legacy format
    let commands = parseMarkdownFormat(textResponse);

    if (!commands || commands.length === 0) {
        commands = parseLegacyFormat(textResponse);
    }

    const validCommands = commands.filter(cmd => cmd !== null);
    const invalidCount = commands.length - validCommands.length;

    // Log parsing results
    logParserEvent({
        ...logContext,
        event: 'client_parser_complete',
        mode: 'generate',
        totalParsedItems: commands.length,
        validCommands: validCommands.length,
        invalidLines: invalidCount,
        parseTime: Date.now() - parseStartTime,
        successRate: commands.length > 0 ? ((validCommands.length / commands.length) * 100).toFixed(1) : 0,
        parsingMethod: commands.length > 0 ? (isMarkdownFormat(textResponse) ? 'markdown' : 'legacy') : 'unknown'
    });

    return validCommands.length > 0 ? { commands: validCommands } : null;
};

const parseMarkdownFormat = (textResponse) => {
    const commands = [];
    const lines = textResponse.split('\n');
    let currentCommand = null;
    let currentExplanation = '';
    let insideCodeBlock = false;
    let codeBlockContent = '';
    let commandCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect command headers (e.g., "**Command 1:**" or "## Command 1:")
        const commandHeaderMatch = line.match(/^(?:\*\*Command\s+\d+:?\*\*|#+\s*Command\s+\d+)/i);
        if (commandHeaderMatch) {
            // Save previous command if exists
            if (currentCommand) {
                commands.push(finalizeCommand(currentCommand, currentExplanation));
            }

            commandCounter++;
            currentCommand = { command: '', explanation: '', warning: '' };
            currentExplanation = '';
            continue;
        }

        // Handle code blocks
        if (line.startsWith('```')) {
            if (insideCodeBlock) {
                // End of code block
                if (currentCommand && codeBlockContent.trim()) {
                    currentCommand.command = cleanCommand(codeBlockContent.trim());
                }
                insideCodeBlock = false;
                codeBlockContent = '';
            } else {
                // Start of code block
                insideCodeBlock = true;
            }
            continue;
        }

        if (insideCodeBlock) {
            codeBlockContent += line + '\n';
            continue;
        }

        // Handle explanation headers
        const explanationMatch = line.match(/^\*\*Explanation:?\*\*/i);
        if (explanationMatch) {
            // Start collecting explanation
            continue;
        }

        // Handle warning indicators
        const warningMatch = line.match(/^\*\*(?:Warning|Caution|Note):?\*\*/i);
        if (warningMatch) {
            if (currentCommand) {
                // Collect warning text from subsequent lines
                let warningText = line.replace(/^\*\*(?:Warning|Caution|Note):?\*\*\s*/i, '');
                if (warningText) {
                    currentCommand.warning = warningText;
                }
            }
            continue;
        }

        // Regular content line
        if (line && currentCommand) {
            // If we don't have a command yet and this looks like a command
            if (!currentCommand.command && isLikelyCommand(line)) {
                currentCommand.command = cleanCommand(line);
            } else if (currentCommand.command && !currentExplanation) {
                // This is likely explanation text
                currentExplanation += line + ' ';
            }
        }
    }

    // Don't forget the last command
    if (currentCommand) {
        commands.push(finalizeCommand(currentCommand, currentExplanation));
    }

    return commands.filter(cmd => cmd && cmd.command);
};

const parseLegacyFormat = (textResponse) => {
    const lines = textResponse.split('\n').filter(line => line.trim());
    const commands = [];
    let invalidLines = [];

    lines.forEach((line, index) => {
        const parts = line.split('|||');
        if (parts.length < 2) {
            invalidLines.push({
                lineNumber: index + 1,
                issue: 'insufficient_parts',
                partsFound: parts.length,
                line: line.substring(0, 50) // Log first 50 chars for debugging
            });
            commands.push(null);
            return;
        }

        const cleanedCommand = cleanCommand(parts[0]?.trim() || '');
        if (!cleanedCommand) {
            invalidLines.push({
                lineNumber: index + 1,
                issue: 'empty_command_after_cleaning'
            });
            commands.push(null);
            return;
        }

        commands.push({
            command: cleanedCommand,
            explanation: parts[1]?.trim() || '',
            warning: parts[2]?.trim() || ''
        });
    });

    if (invalidLines.length > 0) {
        logParserEvent({
            event: 'legacy_parser_validation',
            invalidLinesDetails: invalidLines,
            totalInvalid: invalidLines.length
        });
    }

    return commands;
};

const parseErrorMode = (textResponse, logContext, parseStartTime) => {
    const parts = textResponse.split('|||');
    if (parts.length < 3) {
        // Try to parse as plain text if ||| format fails
        logParserEvent({
            ...logContext,
            event: 'client_parser_warning',
            mode: 'error',
            issue: 'using_fallback_error_parsing',
            partsFound: parts.length
        });

        return {
            cause: 'Error analysis',
            explanation: textResponse,
            solution: []
        };
    }

    logParserEvent({
        ...logContext,
        event: 'client_parser_complete',
        mode: 'error',
        errorPartsFound: parts.length,
        parseTime: Date.now() - parseStartTime
    });

    return {
        cause: parts[0]?.trim() || '',
        explanation: parts[1]?.trim() || '',
        solution: parts.slice(2).map(s => s.trim()).map(s => s.trim()).filter(s => s)
    };
};

// Helper functions
const isMarkdownFormat = (text) => {
    return text.includes('```') || text.includes('**Command') || text.includes('**Explanation');
};

const isLikelyCommand = (line) => {
    const commandIndicators = [
        /^[a-zA-Z][a-zA-Z0-9_-]*\s+/,  // command with args
        /^cd\s+/,                       // cd command
        /^ls\s*$/,                      // ls command
        /^pwd\s*$/,                     // pwd command
        /^echo\s+/,                     // echo command
        /^git\s+/,                      // git command
        /^npm\s+/,                      // npm command
        /^sudo\s+/,                     // sudo command
        /^\w+\.(exe|sh|py|js)\s*/       // executable files
    ];

    return commandIndicators.some(pattern => pattern.test(line.trim()));
};

const cleanCommand = (command) => {
    if (!command) return '';

    // Remove surrounding backticks and code block markers
    let cleaned = command.replace(/^```[\w]*\n?|```$/g, '').trim();

    // Remove leading numbers/bullets (1. or 1: or 1) or - )
    cleaned = cleaned.replace(/^\s*[\d\-\*]+[\.\:\)]\s*/, '').trim();

    // Remove markdown formatting
    cleaned = cleaned.replace(/^\*\*|\*\*$/g, '').trim();
    cleaned = cleaned.replace(/^`|`$/g, '').trim();

    return cleaned;
};

const finalizeCommand = (commandObj, explanationText) => {
    if (!commandObj.command) return null;

    return {
        command: commandObj.command,
        explanation: commandObj.explanation || explanationText.trim(),
        warning: commandObj.warning || ''
    };
};

module.exports = { parseAndConstructData };
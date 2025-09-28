const crypto = require('crypto');

const parseAndConstructData = (textResponse, mode, logContext = {}) => {
    const parseStartTime = Date.now();
    let validCommands = [];
    let invalidLines = [];
    let totalLines = 0;

    try {
        const trimmedResponse = textResponse.trim();
        if (!trimmedResponse) {
            console.warn(JSON.stringify({
                ...logContext,
                event: 'parser_warning',
                issue: 'empty_response',
                mode: mode,
                timestamp: new Date().toISOString()
            }));
            return null;
        }

        if (mode === 'generate') {
            const lines = trimmedResponse.split('\n').filter(line => line.trim());
            totalLines = lines.length;

            const commands = lines.map((line, index) => {
                const parts = line.split('|||');
                if (parts.length < 2) {
                    invalidLines.push({
                        lineNumber: index + 1,
                        content: line.substring(0, 50) + (line.length > 50 ? '...' : ''),
                        issue: 'insufficient_parts',
                        partsFound: parts.length
                    });
                    return null;
                }

                // Clean the command: remove backticks and any leading numbers/periods.
                const rawCommand = parts[0]?.trim().replace(/^`|`$/g, '').trim() || '';
                const cleanedCommand = rawCommand.replace(/^\s*\d+[\.\s]*\s*/, '');

                if (!cleanedCommand) {
                    invalidLines.push({
                        lineNumber: index + 1,
                        content: line.substring(0, 50) + (line.length > 50 ? '...' : ''),
                        issue: 'empty_command_after_cleaning',
                        rawCommand: rawCommand
                    });
                    return null;
                }

                const validCommand = {
                    command: cleanedCommand,
                    explanation: parts[1]?.trim() || '',
                    warning: parts[2]?.trim() || ''
                };

                validCommands.push(validCommand);
                return validCommand;
            }).filter(Boolean);

            // Log parsing results
            const parseLog = {
                ...logContext,
                event: 'parser_analysis',
                mode: mode,
                totalLines: totalLines,
                validCommands: validCommands.length,
                invalidLines: invalidLines.length,
                parseTime: Date.now() - parseStartTime,
                successRate: totalLines > 0 ? (validCommands.length / totalLines * 100).toFixed(1) : 0,
                timestamp: new Date().toISOString()
            };

            if (invalidLines.length > 0) {
                parseLog.invalidLinesDetails = invalidLines;
                console.warn(JSON.stringify(parseLog));
            } else {
                console.log(JSON.stringify(parseLog));
            }

            return { commands };
        }

        if (mode === 'explain') {
            console.log(JSON.stringify({
                ...logContext,
                event: 'parser_success',
                mode: mode,
                responseLength: trimmedResponse.length,
                parseTime: Date.now() - parseStartTime,
                timestamp: new Date().toISOString()
            }));
            return { explanation: trimmedResponse };
        }

        if (mode === 'error') {
            const parts = trimmedResponse.split('|||');
            if (parts.length < 3) {
                console.warn(JSON.stringify({
                    ...logContext,
                    event: 'parser_warning',
                    mode: mode,
                    issue: 'insufficient_error_parts',
                    partsFound: parts.length,
                    expectedParts: 3,
                    timestamp: new Date().toISOString()
                }));
                return null;
            }

            console.log(JSON.stringify({
                ...logContext,
                event: 'parser_success',
                mode: mode,
                errorPartsFound: parts.length,
                parseTime: Date.now() - parseStartTime,
                timestamp: new Date().toISOString()
            }));

            return {
                cause: parts[0]?.trim() || '',
                explanation: parts[1]?.trim() || '',
                solution: parts.slice(2).map(s => s.trim()).filter(s => s)
            };
        }

        console.warn(JSON.stringify({
            ...logContext,
            event: 'parser_warning',
            issue: 'unknown_mode',
            mode: mode,
            timestamp: new Date().toISOString()
        }));
        return null;

    } catch (error) {
        console.error(JSON.stringify({
            ...logContext,
            event: 'parser_error',
            error: error.message,
            stack: error.stack,
            mode: mode,
            parseTime: Date.now() - parseStartTime,
            timestamp: new Date().toISOString()
        }));
        return null;
    }
};

module.exports = { parseAndConstructData };
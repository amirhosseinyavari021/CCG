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

export const parseAndConstructData = (textResponse, mode, sessionId = null) => {
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
            const lines = trimmedResponse.split('\n').filter(line => line.trim());
            let validCommands = [];
            let invalidLines = [];

            const commands = lines.map((line, index) => {
                const parts = line.split('|||');
                if (parts.length < 2) {
                    invalidLines.push({
                        lineNumber: index + 1,
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
                        issue: 'empty_command_after_cleaning'
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

            // Log client-side parsing results
            logParserEvent({
                ...logContext,
                event: 'client_parser_complete',
                mode,
                totalLines: lines.length,
                validCommands: validCommands.length,
                invalidLines: invalidLines.length,
                parseTime: Date.now() - parseStartTime,
                successRate: lines.length > 0 ? ((validCommands.length / lines.length) * 100).toFixed(1) : 0
            });

            return { commands };
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
            const parts = trimmedResponse.split('|||');
            if (parts.length < 3) {
                logParserEvent({
                    ...logContext,
                    event: 'client_parser_warning',
                    mode,
                    issue: 'insufficient_error_parts',
                    partsFound: parts.length
                });
                return null;
            }

            logParserEvent({
                ...logContext,
                event: 'client_parser_complete',
                mode,
                errorPartsFound: parts.length,
                parseTime: Date.now() - parseStartTime
            });

            return {
                cause: parts[0]?.trim() || '',
                explanation: parts[1]?.trim() || '',
                solution: parts.slice(2).map(s => s.trim()).filter(s => s)
            };
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
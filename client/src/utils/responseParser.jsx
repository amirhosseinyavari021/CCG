/**
 * Parses the raw text response from the AI for the web client.
 * This version is robust and handles multi-line '|||' formats and fallbacks.
 */
export const parseAndConstructData = (textResponse, mode) => {
    try {
        const trimmedResponse = textResponse.trim().replace(/^```(?:\w+)?\n|```$/g, '');
        if (!trimmedResponse) return null;

        if (mode === 'generate') {
            const lines = trimmedResponse.split('\n').filter(line => line.trim() && line.includes('|||'));
            if (lines.length === 0) {
                // Fallback: If no '|||' is found, try to find a command.
                const codeBlockMatch = trimmedResponse.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
                let command = '';
                let explanation = trimmedResponse;

                if (codeBlockMatch && codeBlockMatch[1]) {
                    command = codeBlockMatch[1].trim();
                    explanation = trimmedResponse.replace(codeBlockMatch[0], '').trim();
                } else {
                    const firstLine = trimmedResponse.split('\n')[0];
                    if (firstLine.length < 150 && !firstLine.includes(' ')) { // Simple command check
                        command = firstLine;
                        explanation = trimmedResponse.substring(firstLine.length).trim();
                    }
                }

                if (command) {
                    return { commands: [{ command, explanation, warning: "" }] };
                }

                return null;
            }

            const commands = lines.map(line => {
                const parts = line.split('|||');
                if (parts.length < 2) return null;

                const rawCommand = parts[0]?.trim().replace(/^`|`$/g, '').trim() || '';
                const cleanedCommand = rawCommand.replace(/^\s*\d+[\.\s]*\s*/, '');

                if (!cleanedCommand) return null;

                return {
                    command: cleanedCommand,
                    explanation: parts[1]?.trim() || 'No explanation provided.',
                    warning: parts[2]?.trim() || ''
                };
            }).filter(Boolean);

            return { commands };
        }

        // --- FIXED: Added all new compare modes to this condition ---
        if (
            mode === 'explain' ||
            mode === 'script' ||
            mode === 'detect-lang' ||
            mode === 'compare-diff' ||
            mode === 'compare-quality' ||
            mode === 'compare-merge'
        ) {
            return { explanation: trimmedResponse };
        }

        if (mode === 'error') {
            const parts = trimmedResponse.split('|||');
            if (parts.length < 2) {
                return {
                    cause: 'Analysis Result',
                    explanation: trimmedResponse,
                    solution: []
                };
            }
            return {
                cause: parts[0]?.trim() || '',
                explanation: parts[1]?.trim() || '',
                solution: parts.slice(2).map(s => s.trim()).filter(s => s)
            };
        }

        // If mode is unknown (which it was), it will return null
        return null;

    } catch (error) {
        console.error("Critical error in responseParser:", error);
        return { error: "Failed to parse the response from the server." };
    }
};

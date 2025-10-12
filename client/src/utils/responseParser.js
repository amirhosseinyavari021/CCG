/**
 * Parses the raw text response from the AI for the web client.
 * This version is more robust and correctly handles different modes.
 */
export const parseAndConstructData = (textResponse, mode) => {
    try {
        const trimmedResponse = textResponse.trim();
        if (!trimmedResponse) return null;

        if (mode === 'generate') {
            const lines = trimmedResponse.split('\n').filter(line => line.trim() && line.includes('|||'));
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

            if (commands.length === 0) {
                // Graceful fallback if parsing fails completely
                return { commands: [{ command: trimmedResponse, explanation: "Could not parse the AI's response format.", warning: "" }] };
            }

            return { commands };
        }

        if (mode === 'explain' || mode === 'script') {
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

        return null;

    } catch (error) {
        console.error("Critical error in responseParser:", error);
        // Return a user-friendly error structure
        return { error: "Failed to parse the response from the server." };
    }
};

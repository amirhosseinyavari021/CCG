/**
 * Enhanced AY-CMDGEN response parser.
 * Handles both legacy (|||) format and gracefully degrades for malformed responses.
 */

const parseAndConstructData = (textResponse, mode, cli) => {
    try {
        // Universal cleaning for script mode
        const trimmedResponse = textResponse.trim().replace(/^```(?:\w+)?\n|```$/g, '');
        if (!trimmedResponse) return null;

        if (mode === 'generate') {
            const lines = trimmedResponse.split('\n').filter(line => line.trim() && line.includes('|||'));
            if (lines.length === 0) return null; // No valid lines found

            const commands = lines.map(line => {
                const parts = line.split('|||');
                if (parts.length < 2) return null;

                // Clean command: remove markdown and leading list markers
                const cleanedCommand = (parts[0]?.trim() || '').replace(/[*`]/g, '').replace(/^\s*[\d\-\*]+[\.\:\)]\s*/, '').trim();
                if (!cleanedCommand) return null;

                return {
                    command: cleanedCommand,
                    explanation: parts[1]?.trim() || '',
                    warning: parts[2]?.trim() || ''
                };
            }).filter(Boolean);

            return commands.length > 0 ? { commands } : null;
        }

        if (mode === 'script' || mode === 'explain') {
            return { explanation: trimmedResponse };
        }

        if (mode === 'error') {
            const parts = trimmedResponse.split('|||');
            if (parts.length < 2) {
                return { cause: 'Analysis Result', explanation: trimmedResponse, solution: [] };
            }
            return {
                cause: parts[0]?.trim() || 'Analysis',
                explanation: parts[1]?.trim() || 'No detailed explanation.',
                solution: parts.slice(2).map(s => s.trim()).filter(s => s)
            };
        }

        return null;

    } catch (error) {
        if (process.argv.includes('--debug')) {
            console.error("Critical error in responseParser:", error);
        }
        return null;
    }
};

module.exports = { parseAndConstructData };
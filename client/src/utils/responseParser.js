/**
 * Parses the raw text response from the AI and constructs a structured object.
 * This function is designed to be robust against malformed AI responses.
 * @param {string} textResponse - The raw text from the AI.
 * @param {string} mode - The current application mode ('generate', 'script', 'error').
 * @param {string} cli - The current command-line interface (e.g., 'Bash', 'PowerShell').
 * @returns {object|null} A structured object or null if parsing fails.
 */
export const parseAndConstructData = (textResponse, mode, cli) => {
    try {
        // Filter out empty lines and potential markdown code blocks
        const lines = textResponse.trim().replace(/```/g, '').split('\n').filter(line => line.trim() !== '');

        if (lines.length === 0) return null;

        if (mode === 'generate') {
            const commands = lines.map(line => {
                const parts = line.split('|||');
                // Ensure the line has the minimum required parts to be valid
                if (parts.length < 2) return null;
                return {
                    command: parts[0]?.trim() || '',
                    explanation: parts[1]?.trim() || '',
                    warning: parts[2]?.trim() || ''
                };
            }).filter(Boolean); // Filter out any null entries from malformed lines
            return { commands };
        }

        if (mode === 'script') {
            const getExtension = (cli) => {
                if (cli === 'PowerShell') return 'ps1';
                if (cli === 'CMD') return 'bat';
                return 'sh';
            };
            return {
                filename: `script.${getExtension(cli)}`,
                script_lines: lines
            };
        }

        if (mode === 'error') {
            const parts = lines[0].split('|||');
            return {
                cause: parts[0]?.trim() || '',
                explanation: parts[1]?.trim() || '',
                solution: parts.slice(2).map(s => s.trim())
            };
        }
        
        return null; // Should not be reached

    } catch (error) {
        console.error("Critical error in responseParser:", error);
        return null;
    }
};

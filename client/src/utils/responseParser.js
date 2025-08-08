export const parseAndConstructData = (textResponse, mode, cli) => {
    try {
        const lines = textResponse.trim().replace(/```/g, '').split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return null;

        if (mode === 'generate') {
            const commands = lines.map(line => {
                const parts = line.split('|||');
                if (parts.length < 2) return null;
                return {
                    command: parts[0]?.trim() || '',
                    explanation: parts[1]?.trim() || '',
                    warning: parts[2]?.trim() || ''
                };
            }).filter(Boolean);
            return { commands };
        }

        if (mode === 'script') {
            const getExtension = (cli) => {
                if (cli === 'PowerShell') return 'ps1';
                if (cli === 'CMD') return 'bat';
                return 'sh';
            };
            return { filename: `script.${getExtension(cli)}`, script_lines: lines };
        }

        if (mode === 'error') {
            const parts = lines[0].split('|||');
            return {
                cause: parts[0]?.trim() || '',
                explanation: parts[1]?.trim() || '',
                solution: parts.slice(2).map(s => s.trim())
            };
        }
        
        // --- FIX for Explain Mode ---
        if (mode === 'explain') {
            // The entire response is the explanation
            return textResponse.trim();
        }
        
        return null;

    } catch (error) {
        console.error("Critical error in responseParser:", error);
        return null;
    }
};

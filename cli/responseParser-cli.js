const parseAndConstructData = (textResponse, mode) => {
    try {
        const trimmedResponse = textResponse.trim();
        if (!trimmedResponse) return null;

        if (mode === 'generate') {
            const lines = trimmedResponse.split('\n').filter(line => line.trim());
            const commands = lines.map(line => {
                const parts = line.split('|||');
                if (parts.length < 2) return null;
                
                const rawCommand = parts[0]?.trim().replace(/^`{1,3}|`{1,3}$/g, '').trim() || '';
                const cleanedCommand = rawCommand.replace(/^\s*\d+[\.\s]*\s*/, '');
                
                if (!cleanedCommand) {
                    return null;
                }

                return {
                    command: cleanedCommand,
                    explanation: parts[1]?.trim() || '',
                    warning: parts[2]?.trim() || ''
                };
            }).filter(Boolean);
            return { commands };
        }

        if (mode === 'script') {
            const scriptContent = trimmedResponse.replace(/^```(?:\w+)?\s*\n?([\s\S]+?)\n?```$/, '$1');
            return { explanation: scriptContent.trim() };
        }
        
        if (mode === 'explain') {
            return { explanation: trimmedResponse };
        }
        
        if (mode === 'error') {
            const parts = trimmedResponse.split('|||');
            if (parts.length < 3) return null;
            return {
                cause: parts[0]?.trim() || '',
                explanation: parts[1]?.trim() || '',
                solution: parts.slice(2).map(s => s.trim()).filter(s => s)
            };
        }
        
        return null;

    } catch (error) {
        console.error("Critical error in responseParser:", error);
        return null;
    }
};

module.exports = { parseAndConstructData };
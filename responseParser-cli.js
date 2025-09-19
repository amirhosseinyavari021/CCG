const parseAndConstructData = (textResponse, mode) => {
    try {
        const trimmedResponse = textResponse.trim();
        if (!trimmedResponse) return null;

        if (mode === 'generate') {
            const lines = trimmedResponse.split('\n').filter(line => line.trim());
            const commands = lines.map(line => {
                const parts = line.split('|||');
                if (parts.length < 2) return null; // A valid line needs a command and explanation
                return {
                    command: parts[0]?.trim() || '',
                    explanation: parts[1]?.trim() || '',
                    warning: parts[2]?.trim() || ''
                };
            }).filter(Boolean); // Clean up any malformed lines
            return { commands };
        }

        if (mode === 'explain') {
            // The entire response is the explanation content
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

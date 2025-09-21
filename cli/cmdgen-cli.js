// --- Remote API Endpoints ---
const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com'; // Fallback URL

// --- Core API with UX improvements and Fallback Mechanism ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options = {} }) => {
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, options);
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };
    
    // Helper function to make the actual request
    const attemptRequest = async (url) => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await axios.post(`${url}/api/proxy`, payload, { 
                    responseType: 'stream',
                    timeout: 60000 // 60 second timeout for cold starts
                });

                stopSpinner(); // Stop previous spinner before starting a new one
                startSpinner('Generating response...');

                let fullContent = '';
                const decoder = new TextDecoder();
                
                response.data.on('data', (chunk) => {
                    const textChunk = decoder.decode(chunk, { stream: true });
                    const dataLines = textChunk.split('\n').filter(line => line.startsWith('data: '));
                    for (const line of dataLines) {
                        const jsonPart = line.substring(5).trim();
                        if (jsonPart && jsonPart !== "[DONE]") {
                            try {
                                fullContent += JSON.parse(jsonPart).choices[0].delta.content || '';
                            } catch (e) {}
                        }
                    }
                });
                response.data.on('end', () => {
                    stopSpinner();
                    const finalData = parseAndConstructData(fullContent, mode, cli);
                    if (!finalData) reject(new Error("Parsing failed: The AI response was empty or malformed."));
                    else resolve({ type: mode, data: finalData });
                });
                response.data.on('error', (err) => {
                    stopSpinner();
                    reject(err);
                });

            } catch (err) {
                reject(err);
            }
        });
    };

    startSpinner('Connecting to primary server...');
    try {
        // --- First Attempt: Primary URL ---
        const result = await attemptRequest(primaryServerUrl);
        return result;

    } catch (primaryError) {
        stopSpinner();
        console.warn(`\n⚠️  Primary server failed. Trying fallback...`);
        startSpinner('Connecting to fallback server...');

        try {
            // --- Second Attempt: Fallback URL ---
            const result = await attemptRequest(fallbackServerUrl);
            return result;

        } catch (fallbackError) {
            // --- Both Attempts Failed ---
            stopSpinner();
            const err = fallbackError || primaryError; // Prefer showing the final error
            if (err.code === 'ECONNABORTED') {
                console.error(`\n❌ Error: Both servers took too long to respond.`);
                console.error(`   This can happen during a cold start. Please try again in a moment.`);
            } else if (err.response) {
                console.error(`\n❌ Error: The server responded with status ${err.response.status}.`);
                console.error(`   Message: ${err.response.data?.error?.message || 'An unknown server error occurred.'}`);
            } else if (err.request) {
                console.error(`\n❌ Error: Could not connect to any server.`);
                console.error(`   Please check your internet connection.`);
            } else {
                console.error(`\n❌ Error: ${err.message || "An unknown error occurred."}`);
            }
            return null;
        }
    }
};

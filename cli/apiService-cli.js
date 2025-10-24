// 1. CJS require for pkg compatibility (Fixes MODULE_NOT_FOUND error)
const axios = require("axios/dist/node/axios.cjs");

/**
 * Sends validated user parameters from the CLI to the CCG backend
 * using the new OpenAI prompt structure.
 *
 * @param {object} params - An object containing all user parameters.
 * @returns {Promise<string>} The AI's direct string output or an error message.
 */
// 2. CJS module export
async function sendToCCGServer(params) {
    // Construct the payload based on the new API structure
    // -- UPDATED to include ALL fields from params --
    const payload = {
        prompt: {
            id: "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd",
            version: "3",
            variables: {
                mode: params.mode || "",
                os: params.os || "",
                lang: params.lang || "",
                user_request: params.user_request || "",
                input_a: params.input_a || "",
                input_b: params.input_b || "",
                error_message: params.error_message || "",
                // --- NEWLY ADDED FIELDS ---
                cli: params.cli || "",
                osVersion: params.osVersion || "",
                knowledgeLevel: params.knowledgeLevel || "intermediate",
                deviceType: params.deviceType || "",
                existingCommands: params.existingCommands || [],
                analysis: params.analysis || ""
            }
        }
    };

    try {
        // Primary attempt to the main production endpoint
        const res = await axios.post("https://ccg.cando.ac/api/ccg", payload, {
            timeout: 30000 // 30s timeout
        });
        // Return the direct output string as requested
        return res.data.output;
    } catch (err) {
        console.error("CCG CLI API error:", err.message);
        // --- REMOVED Retry Logic ---
        // Return a final error string if the primary fails
        if (err.response) {
            return `⚠️ AI service unavailable (Error ${err.response.status}).`;
        } else if (err.code === 'ECONNABORTED') {
            return `⚠️ AI service timed out.`;
        }
        return "⚠️ AI service unavailable. Check your internet connection.";
    }
}

// 3. CJS module export
module.exports = { sendToCCGServer };
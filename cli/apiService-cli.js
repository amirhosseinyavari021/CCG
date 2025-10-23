import axios from "axios";

/**
 * Sends validated user parameters from the CLI to the CCG backend
 * using the new OpenAI prompt structure.
 *
 * @param {object} params - An object containing all user parameters.
 * @returns {Promise<string>} The AI's direct string output or an error message.
 */
export async function sendToCCGServer(params) {
    // Construct the payload based on the new API structure
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
                error_message: params.error_message || ""
            }
        }
    };

    try {
        // Primary attempt to the main production endpoint
        const res = await axios.post("https://ccg.cando.ac/api/ccg", payload, {
            timeout: 15000
        });
        // Return the direct output string as requested
        return res.data.output;
    } catch (err) {
        console.error("CCG API error:", err.message);

        // Retry once with the backup endpoint if the primary fails
        try {
            const retry = await axios.post("https://ccg-backup.cando.ac/api/ccg", payload, {
                timeout: 15000
            });
            return retry.data.output;
        } catch (retryErr) {
            // Return a final error string if both fail
            return "⚠️ AI service unavailable after retry.";
        }
    }
}
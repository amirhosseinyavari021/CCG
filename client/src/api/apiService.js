import axios from "axios";

/**
 * Handles communication between the React web client and
 * the backend proxy using the new OpenAI prompt structure.
 *
 * @param {object} params - An object containing all user parameters.
 * @returns {Promise<string>} The AI's direct string output or an error message.
 */
export async function fetchCCGResponse(params) {
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
        // Primary attempt to the relative backend proxy
        const response = await axios.post("/api/ccg", payload, {
            timeout: 15000
        });
        // Return the direct output string for the UI
        return response.data.output;
    } catch (error) {
        console.error("CCG Web API error:", error.message);

        // Retry once with the backup relative proxy
        try {
            const retry = await axios.post("/api/ccg-backup", payload, {
                timeout: 15000
            });
            return retry.data.output;
        } catch (retryErr) {
            // Return a final error string for the UI
            return "⚠️ Unable to reach AI service (web).";
        }
    }
}
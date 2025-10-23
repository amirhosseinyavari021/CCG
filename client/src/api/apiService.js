import axios from "axios";

/**
 * Handles communication between the React web client and
 * the backend proxy connected to the CCG AI Assistant.
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

    /**
     * --- Enhanced error handling function ---
     * Provides specific user-facing messages based on the error type.
     * @param {Error} error - The error object from axios.
     * @returns {string} A user-friendly error message.
     */
    const handleApiError = (error) => {
        console.error(`CCG Web API error:`, error.message);

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            if (error.response.status === 500) {
                return "⚠️ Server error (500). Please check the backend logs. (Is the local model running? Is the API key valid?)";
            } else if (error.response.status === 404) {
                return "⚠️ Server API endpoint not found (404).";
            } else if (error.response.status === 429) {
                return "⚠️ Too many requests. Please wait a moment and try again.";
            }
            return `⚠️ Server returned error: ${error.response.status}`;
        } else if (error.code === 'ECONNABORTED') {
            // The request timed out
            return "⚠️ The request to the AI service timed out.";
        } else if (error.request) {
            // The request was made but no response was received (e.g., network error)
            return "⚠️ Unable to reach AI service (Network error). Check your connection and the server status.";
        }

        // Something else happened
        return "⚠️ An unknown error occurred while contacting the AI service.";
    };

    try {
        // Primary attempt to the relative backend proxy
        const response = await axios.post("/api/ccg", payload, {
            timeout: 30000 // 30s timeout
        });
        // Return the direct output string for the UI
        return response.data.output;
    } catch (error) {
        // --- REMOVED Retry Logic ---
        // If the primary call fails, report the error directly.
        return handleApiError(error);
    }
}
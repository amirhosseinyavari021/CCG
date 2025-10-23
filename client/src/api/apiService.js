import axios from "axios";

/**
 * Validates the request parameters against allowed values and blocklists.
 */
function validateRequest(params) {
    const allowedModes = ["generate", "script", "analyze", "error", "compare", "merge"];
    const allowedLangs = ["fa", "en"];
    const BLOCKED_KEYWORDS = ["rm -rf", "format", "mkfs", "dd if=", "del /s", ":(){:|:&};:"];

    if (!allowedModes.includes(params.mode) || !allowedLangs.includes(params.lang))
        return "⚠️ Invalid request parameters.";

    const all = `${params.user_request || ""} ${params.input_a || ""} ${params.input_b || ""}`.toLowerCase();
    for (const word of BLOCKED_KEYWORDS)
        if (all.includes(word))
            return "⚠️ Request blocked: potentially destructive command detected.";

    return true;
}

/**
 * Handles communication between the React web client and
 * the backend proxy connected to the CCG AI Assistant.
 */
export async function fetchCCGResponse(params) {
    const valid = validateRequest(params);
    if (valid !== true) return valid; // Return error string for the UI

    try {
        // Primary attempt to the relative backend proxy
        const response = await axios.post("/api/ccg", params, { timeout: 15000 });
        return response.data.output; // Return the string output directly
    } catch (error) {
        console.error("CCG Web API error:", error.message);

        // Retry once with the backup relative proxy
        try {
            const retry = await axios.post("/api/ccg-backup", params, { timeout: 15000 });
            return retry.data.output;
        } catch (retryErr) {
            // Return a final error string for the UI
            return "⚠️ Unable to reach AI service (web).";
        }
    }
}
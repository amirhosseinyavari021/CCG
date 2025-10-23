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
 * Sends validated user parameters from CLI to the CCG backend
 * and returns the Assistant's response.
 */
export async function sendToCCGServer(params) {
    const valid = validateRequest(params);
    if (valid !== true) return valid;

    try {
        // Primary attempt to the main production endpoint
        const res = await axios.post("https://ccg.cando.ac/api/ccg", params, { timeout: 15000 });
        return res.data.output; // Return the string output directly
    } catch (err) {
        console.error("CCG API error:", err.message);

        // Retry once with the backup endpoint if the primary fails
        try {
            const retry = await axios.post("https://ccg-backup.cando.ac/api/ccg", params, { timeout: 15000 });
            return retry.data.output;
        } catch (retryErr) {
            // Return a final error string if both fail
            return "⚠️ AI service unavailable after retry.";
        }
    }
}
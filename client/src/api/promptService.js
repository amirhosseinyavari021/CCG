import { fetchCCGResponse } from './apiService'; // <-- FIXED: Imports the new function
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

const sessionCache = new Map();

// Helper function to show generic errors
const handleError = (error, lang) => {
    const t = translations[lang];
    let message = t.errorDefault;

    if (error.message.includes('Network')) {
        message = t.errorNetwork;
    }

    toast.error(message, { duration: 5000 });
};

/**
 * Acts as an adapter between the UI components (App.js, useCodeCompare)
 * and the new `fetchCCGResponse` API service.
 * It maps UI-layer parameters to the new API structure and parses
 * the string response back into the data structure the UI expects.
 */
export const callApi = async ({
    mode,
    userInput,
    os,
    osVersion, // No longer sent to API, but kept for cache key
    cli,        // No longer sent to API, but kept for cache key & parser
    lang,
    iteration = 0, // No longer sent to API, but kept for cache key
    codeA = '',
    codeB = '',
    // other params ignored by new API (e.g., existingCommands)
    ...otherProps
}, onUpdate) => {

    const t = translations[lang];
    // Create a cache key from all unique request params
    const cacheKey = `${lang}-${mode}-${os}-${osVersion}-${cli}-${userInput}-${iteration}-${codeA.length}-${codeB.length}`;

    if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
    }

    // This function is no longer streaming, so just signal we are fetching.
    onUpdate?.('fetching');

    // 1. Map UI-layer state to the new API 'variables'
    const apiParams = {
        mode,
        os, // The new API just takes the OS name
        lang,
        // Map userInput to the correct API variable based on mode
        user_request: (mode !== 'error' && mode !== 'detect-lang') ? userInput : '',
        input_a: codeA,
        input_b: codeB,
        error_message: (mode === 'error') ? userInput : ''
    };

    try {
        // 2. Call the new API service. It will *always* return a string.
        const rawOutput = await fetchCCGResponse(apiParams);

        // 3. Check if the string is an error message from the API service
        if (rawOutput.startsWith('⚠️')) {
            toast.error(rawOutput); // Display the specific error
            return null;
        }

        // 4. Parse the successful string output into the data structure the UI expects
        // The parser may still use the 'cli' hint, so we pass it along.
        const finalData = parseAndConstructData(rawOutput, mode, cli);

        if (!finalData) {
            toast.error(t.errorParse);
            return null;
        }

        // 5. Return data in the original format expected by App.js
        const result = { type: mode, data: finalData };
        sessionCache.set(cacheKey, result);
        return result;

    } catch (err) {
        // Catch any unexpected critical errors (e.g., network failure)
        handleError(err, lang);
        return null;
    }
};
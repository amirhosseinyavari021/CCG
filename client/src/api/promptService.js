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
 * -- UPDATED to pass all variables to the API --
 */
export const callApi = async ({
    mode,
    userInput,
    os,
    osVersion,
    cli,
    lang,
    iteration = 0,
    codeA = '',
    codeB = '',
    // --- NEWLY ADDED ---
    knowledgeLevel,
    deviceType,
    existingCommands,
    analysis,
    ...otherProps
}, onUpdate) => {

    const t = translations[lang];
    // Create a cache key from all unique request params
    const cacheKey = `${lang}-${mode}-${os}-${osVersion}-${cli}-${userInput}-${iteration}-${codeA.length}-${codeB.length}-${knowledgeLevel}-${deviceType}-${existingCommands?.length}`;

    if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
    }

    // This function is no longer streaming, so just signal we are fetching.
    onUpdate?.('fetching');

    // 1. Map UI-layer state to the new API 'variables'
    // -- UPDATED to include all new fields --
    const apiParams = {
        mode,
        os,
        lang,
        // Map userInput to the correct API variable based on mode
        user_request: (mode !== 'error' && mode !== 'detect-lang') ? userInput : '',
        input_a: codeA,
        input_b: codeB,
        error_message: (mode === 'error') ? userInput : '',
        // --- NEWLY ADDED FIELDS ---
        osVersion: osVersion || '',
        cli: cli || '',
        knowledgeLevel: knowledgeLevel || 'intermediate',
        deviceType: deviceType || '',
        existingCommands: existingCommands || [],
        analysis: analysis || ''
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
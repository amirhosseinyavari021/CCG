import { getSystemPrompt } from './promptService';
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

// A simple session cache to avoid refetching the same data during a session.
const sessionCache = new Map();

/**
 * Main function to communicate with the backend proxy.
 * It constructs the payload, sends the request, and processes the streamed response.
 * @param {object} params - The parameters for the API call.
 * @returns {object|null} A structured result object or null if an error occurs.
 */
export const callApi = async ({ mode, userInput, os, osVersion, cli, lang, iteration = 0, existingCommands = [] }) => {
    const t = translations[lang];
    
    // --- Start of Correction ---
    // The cache key now includes the language (`lang`) to ensure language changes trigger a new API call.
    const cacheKey = `${lang}-${mode}-${os}-${osVersion}-${cli}-${userInput}-${iteration}`;
    // --- End of Correction ---
    
    if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
    }

    const isPlainText = mode !== 'explain';
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, { existingCommands });
    const userMessage = `User request: "${userInput}"`;
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }] };

    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({})); // Try to parse JSON error, fallback to empty object
            throw new Error(err?.error?.message || t.errorServer);
        }
        if (!response.body) {
            throw new Error("Response body is missing.");
        }

        // Process the streamed response from the server
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const dataLines = chunk.split('\n').filter(line => line.startsWith('data: '));
            for (const line of dataLines) {
                const jsonPart = line.substring(5).trim();
                if (jsonPart && jsonPart !== "[DONE]") {
                    try {
                        const p = JSON.parse(jsonPart);
                        fullContent += p.choices[0].delta.content || '';
                    } catch (e) {
                        console.warn("Stream chunk parsing error:", e);
                    }
                }
            }
        }
        
        let result;
        if (isPlainText) {
            // Use the dedicated parser for structured text responses
            const finalData = parseAndConstructData(fullContent, mode, cli);
            if (!finalData) {
                toast.error(t.errorParse);
                return null;
            }
            result = { type: mode, data: finalData };
        } else {
            // For 'explain' mode, the raw markdown is the result
            result = { type: mode, data: fullContent };
        }
        
        sessionCache.set(cacheKey, result);
        return result;

    } catch (err) {
        toast.error(err.message || t.errorNetwork);
        return null;
    }
};

import { getSystemPrompt } from './promptService';
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

// A simple cache for this session
const sessionCache = new Map();

export const callApi = async ({ mode, userInput, os, osVersion, cli, lang, iteration = 0, existingCommands = [] }) => {
    const t = translations[lang];
    
    // A more robust cache key
    const cacheKey = `${mode}-${os}-${osVersion}-${cli}-${userInput}-${iteration}`;
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
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.error?.message || t.errorServer);
        }
        if (!response.body) {
            throw new Error("Response body is missing.");
        }

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
            const finalData = parseAndConstructData(fullContent, mode, cli);
            if (!finalData) {
                toast.error(t.errorParse);
                return null;
            }
            result = { type: mode, data: finalData };
        } else {
            result = { type: mode, data: fullContent };
        }
        
        sessionCache.set(cacheKey, result);
        return result;

    } catch (err) {
        toast.error(err.message || t.errorNetwork);
        return null;
    }
};

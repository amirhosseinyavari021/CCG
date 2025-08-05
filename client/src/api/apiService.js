import { getSystemPrompt } from './promptService';
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

const sessionCache = new Map();

export const callApi = async ({ mode, userInput, os, osVersion, cli, lang, iteration = 0, existingCommands = [] }, onUpdate) => {
    const t = translations[lang];
    const cacheKey = `${lang}-${mode}-${os}-${osVersion}-${cli}-${userInput}-${iteration}`;

    if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
    }

    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, { existingCommands });
    const userMessage = userInput;

    const payload = {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        stream: true
    };

    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        onUpdate?.('fetching');

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
                    } catch {}
                }
            }
        }

        const finalData = parseAndConstructData(fullContent, mode, cli);
        if (!finalData) {
            toast.error(t.errorParse);
            return null;
        }

        const result = { type: mode, data: finalData };
        sessionCache.set(cacheKey, result);
        return result;

    } catch (err) {
        toast.error(err.message || t.errorNetwork);
        return null;
    }
};

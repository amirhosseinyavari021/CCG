import { getSystemPrompt } from './promptService';
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

const sessionCache = new Map();

// تابع کمکی برای مدیریت و نمایش خطاها
const handleError = (error, lang) => {
    const t = translations[lang];
    let message = t.errorDefault;

    if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
            message = t.errorAccessConfig;
        } else if (status === 429) {
            message = t.errorTooManyRequests;
        } else if (status >= 500) {
            message = t.errorProvider;
        } else if (status >= 400) {
            message = t.errorInput;
        }
    } else if (error.message.includes('Network')) {
        message = t.errorNetwork;
    }
    
    toast.error(message, { duration: 5000 });
};

export const callApi = async ({ mode, userInput, os, osVersion, cli, lang, iteration = 0, existingCommands = [], command = '' }, onUpdate) => {
    const t = translations[lang];
    const cacheKey = `${lang}-${mode}-${os}-${osVersion}-${cli}-${userInput}-${command}-${iteration}`;

    if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
    }

    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, { existingCommands, command });
    const payload = {
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }],
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
            const error = new Error("Server responded with an error");
            error.response = { status: response.status, data: await response.json().catch(() => ({})) };
            throw error;
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
        handleError(err, lang);
        return null;
    }
};

import { getSystemPrompt } from './promptService';
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

const handleError = (error, lang) => {
    const t = translations[lang];
    let message = t.errorDefault;

    if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.error?.message || '';

        if (status === 401 || status === 403) message = t.errorApiKey;
        else if (status === 429) message = t.errorTooManyRequests;
        else if (status >= 500) message = t.errorServer;
        else if (status >= 400) message = t.errorInput;
        
        toast.error(`${message}\n${serverMessage}`, { duration: 6000, style: { whiteSpace: 'pre-line' } });
    } else {
        toast.error(t.errorNetwork);
    }
};

export const callApi = async ({ mode, userInput, os, osVersion, cli, lang, iteration = 0, existingCommands = [] }, onUpdate) => {
    const t = translations[lang];
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, { existingCommands });
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }], stream: true };

    try {
        onUpdate?.('connecting');
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        onUpdate?.('fetching');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error("Server responded with an error");
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            fullContent += decoder.decode(value, { stream: true });
        }

        const finalData = parseAndConstructData(fullContent, mode, cli);
        if (!finalData) {
            toast.error(t.errorParse);
            return null;
        }
        return { type: mode, data: finalData };

    } catch (err) {
        handleError(err, lang);
        return null;
    }
};

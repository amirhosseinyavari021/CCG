import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { transformPrompt } from './utils/promptTransformer.js';

// Load environment variables
dotenv.config();

const {
    OPENAI_API_KEY,
    OPENAI_API_URL,
    AI_PRIMARY_MODEL,
    AI_LOCAL_MODEL_URL,
    AI_LOCAL_MODEL_NAME
} = process.env;

// 1. Configure the primary OpenAI client (First choice)
const openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_API_URL || 'https://api.openai.com/v1',
});

// 2. Configure the local model client (Fallback choice)
const localClient = new OpenAI({
    apiKey: 'ollama', // Dummy key, required by the client
    baseURL: AI_LOCAL_MODEL_URL || 'http://localhost:11434/v1',
});

/**
 * Attempts to fulfill the request using the primary AI, and falls back
 * to the local AI if the primary fails.
 * @param {object} prompt - The client's prompt object.
 * @returns {Promise<string>} The AI's direct string output.
 */
export const routeRequest = async (prompt) => {

    // 1. Transform the client's variables into an OpenAI-compatible messages array
    // This is done once and reused for both primary and fallback attempts.
    const messages = transformPrompt(prompt.variables);

    // 2. --- MODIFICATION: Implement Primary API attempt ---
    try {
        console.log(JSON.stringify({
            event: 'ai_route_attempt',
            mode: prompt.variables.mode,
            engine: 'openai',
            model: AI_PRIMARY_MODEL,
        }));

        const response = await openaiClient.chat.completions.create({
            model: AI_PRIMARY_MODEL,
            messages: messages,
            stream: false,
            temperature: 0.5,
        });

        const aiContent = response.choices[0].message.content;
        if (!aiContent) throw new Error('Primary AI returned an empty response.');

        return aiContent; // Success! Return the result.

    } catch (primaryError) {
        // 3. --- MODIFICATION: Implement Fallback Logic ---
        console.error(JSON.stringify({
            event: 'ai_primary_failed',
            mode: prompt.variables.mode,
            model: AI_PRIMARY_MODEL,
            error: primaryError.message,
        }));

        console.log(JSON.stringify({
            event: 'ai_route_fallback',
            mode: prompt.variables.mode,
            engine: 'local',
            model: AI_LOCAL_MODEL_NAME,
        }));

        // Try the fallback local model
        try {
            const fallbackResponse = await localClient.chat.completions.create({
                model: AI_LOCAL_MODEL_NAME,
                messages: messages,
                stream: false,
                temperature: 0.5,
            });

            const aiContent = fallbackResponse.choices[0].message.content;
            if (!aiContent) throw new Error('Fallback AI returned an empty response.');

            return aiContent; // Success on fallback!

        } catch (fallbackError) {
            // 4. --- MODIFICATION: Both models failed ---
            console.error(JSON.stringify({
                event: 'ai_fallback_failed',
                mode: prompt.variables.mode,
                model: AI_LOCAL_MODEL_NAME,
                error: fallbackError.message,
            }));

            // Throw a final error to be caught by server.js
            throw new Error(`Both primary and fallback AI services failed. Primary: ${primaryError.message} | Fallback: ${fallbackError.message}`);
        }
    }
};
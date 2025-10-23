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

// 1. Configure the primary OpenAI client
const openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_API_URL || 'https://api.openai.com/v1',
});

// 2. Configure the local model client (e.g., Ollama, Jan, etc.)
// It uses a dummy API key as local servers often don't require one.
const localClient = new OpenAI({
    apiKey: 'ollama', // Dummy key, required by the client
    baseURL: AI_LOCAL_MODEL_URL || 'http://localhost:11434/v1', // OpenAI-compatible endpoint
});

/**
 * Routes the user's prompt to the appropriate AI model based on complexity.
 * @param {object} prompt - The client's prompt object.
 * @returns {Promise<string>} The AI's direct string output.
 */
export const routeRequest = async (prompt) => {
    const { mode } = prompt.variables;

    // Define which modes are "simple" and can be handled by the local model
    const simpleModes = [
        'generate',
        'analyze',
        'explain', // Web client uses 'explain'
        'error',
        'detect-lang'
    ];

    // Determine if the request is complex (e.g., script, compare, merge)
    const isComplex = !simpleModes.includes(mode);

    const client = isComplex ? openaiClient : localClient;
    const model = isComplex ? AI_PRIMARY_MODEL : AI_LOCAL_MODEL_NAME;

    console.log(JSON.stringify({
        event: 'ai_route',
        mode: mode,
        engine: isComplex ? 'openai' : 'local',
        model: model,
    }));

    // 1. Transform the client's variables into an OpenAI-compatible messages array
    const messages = transformPrompt(prompt.variables);

    try {
        // 2. Call the selected AI model
        const response = await client.chat.completions.create({
            model: model,
            messages: messages,
            stream: false, // Client expects a single response
            temperature: 0.5,
        });

        const aiContent = response.choices[0].message.content;
        
        if (!aiContent) {
            throw new Error('AI returned an empty response.');
        }

        // 3. Return the raw string content
        return aiContent;

    } catch (error) {
        console.error(`AI request failed for model ${model}:`, error.message);
        throw new Error(`AI service error: ${error.message}`);
    }
};
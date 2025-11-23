import { OpenAI } from 'openai';
import dotenv from 'dotenv';
// ⚠️ ما به این فایل *فقط* برای حالت پشتیبان (Fallback) نیاز داریم
import { transformPrompt } from './utils/promptTransformer.js';

// Load environment variables
dotenv.config();

const {
    OPENAI_API_KEY,
    OPENAI_API_URL,
    // اینها برای Fallback لازم هستند
    AI_LOCAL_MODEL_URL,
    AI_LOCAL_MODEL_NAME
} = process.env;

// -------------------------------------------------------------------------
// 🛑 مهم: این متن کامل پرامپت سیستمی نهایی است
// مدل محلی (Fallback) به این متن کامل نیاز دارد
const FINAL_SYSTEM_MESSAGE = `You are **CCG (Cando Command Generator)** — an expert-level, multilingual AI assistant for DevOps, Networking, Scripting, and Programming, developed by AY-Tech and Cando Academy.

🎯 **Mission:**
Your primary mission is to generate, explain, debug, analyze, and compare code or commands with unparalleled accuracy, safety, and practicality. You must act as a professional, expert-level assistant.

🧠 **Supported Environments:**
- Linux / macOS (Bash, Zsh, Sh)
- Windows (CMD, PowerShell)
- Networking: Cisco IOS, MikroTik (RouterOS), FortiGate (FortiOS)
- Scripting & Code: Python, Node.js (Express), JavaScript, SQL, Dockerfile, etc.

---
### 🧩 1. Core Abilities (What You Do)

1.  **Command & Script Generation (Mode: \`generate\`, \`script\`)**
    * **Precision:** Understand the user's intent precisely based on their context (OS, Shell, Device, Knowledge Level).
    * **Multiple Options:** Generate **one or more** practical, safe, and efficient commands. Do not provide just one option if multiple valid approaches exist.
    * **Complexity:** Adapt the complexity of the command and explanation to the user's "Knowledge Level" (Beginner, Intermediate, Expert).
    * **Safety:** You MUST NOT produce harmful or destructive commands (like \`rm -rf /\`, \`format\`, \`del /s /q\`) *unless* it is the *only* possible solution for the user's explicit request (e.g., "force delete a directory"). In such rare cases, you MUST include a strong, unavoidable warning in the "Warning" field.

2.  **Explanation & Analysis (Mode: \`explain\`, \`analyze\`)**
    * Explain the logic, parameters, flags, and execution flow of a given command or script clearly and concisely.
    * Highlight best practices, potential risks, and performance considerations.

3.  **Error Debugging (Mode: \`error\`)**
    * Interpret error messages accurately within the user's provided context.
    * Provide a clear "Probable Cause" and one or more "Solution Steps" that directly fix the problem. Explain *why* the fix works.

4.  **Smart Code Compare & Merge (Mode: \`compare-*\`)**
    * When two code snippets are provided, you MUST perform a three-step process:
    * **1. Analyze:** Perform a detailed logical diff, identifying changes in syntax, logic, performance, and security.
    * **2. Summarize:** Provide a human-readable summary of these logical differences (in the user's language).
    * **3. Merge:** Produce a **final, merged, optimized, and runnable version** that intelligently combines the best of both snippets and applies all relevant best practices.
    * **Strict Merge Rules (Node.js/Express):** When merging Express.js apps, the final code MUST adhere to this template:
        * Include \`helmet({ contentSecurityPolicy: false })\`, \`cors()\`, \`express.json({ limit: "10kb" })\`, \`compression()\`, \`rateLimit(...)\`, and \`morgan("combined")\`.
        * Wrap database connection and \`app.listen()\` inside an \`async startServer()\` function with a \`try/catch\` block.
        * Include a global error handler middleware at the *end* of the stack.
        * Log all errors in structured JSON (level, message, stack, timestamp).
        * Respond with "Internal Server Error" if \`NODE_ENV === "production"\`.
        * Handle graceful shutdown for \`SIGTERM\` and \`SIGINT\`.
        * Use modern JS syntax (\`??\`, optional chaining).

---
### 📜 2. Core Rules (How You MUST Behave)

1.  **Language Adaptation (Non-Negotiable)**
    * **If the user message is in Persian (fa):**
        * You MUST respond *entirely* in **Persian (fa)**.
        * This applies to ALL text you generate: explanations, notes, warnings, and all analysis/summaries in compare mode.
        * All Persian text MUST be formatted for **RTL (Right-to-Left)** display to ensure correct rendering.
        * **Crucial:** All technical keywords, code, commands, CLI syntax, file paths, and error names (e.g., \`command not found\`) MUST remain in **English (LTR)**. Do NOT translate code.
    * **If the user message is in English (en):**
        * You MUST respond *entirely* in **English**.
    * You must automatically detect the user's language from their message.

2.  **Output Format (Strict Adherence)**
    * You MUST return responses *only* in the precise format requested by the user's prompt (which is provided by the API backend).
    * **Do NOT** add any conversational fluff, greetings, apologies, or introductory sentences (e.g., "Here is the command you asked for:", "Certainly!", "I hope this helps!").
    * **Be Direct:** Start the response *immediately* with the requested format (e.g., \`command ||| explanation ||| warning\`).
    * **Markdown:** All code, commands, and scripts MUST be inside proper Markdown code blocks (\`\`\`) with the correct language identifier (e.g., \`bash\`, \`javascript\`, \`powershell\`, \`cisco\`).

3.  **Professionalism & Accuracy**
    * Your priority is **Correctness, Safety, and Practicality**.
    * You are an expert. Be confident, direct, and structured.
    * Always prioritize the *most correct and practical* solution for the user's *specific* context (OS, Shell, Device, Knowledge Level).
`;
// -------------------------------------------------------------------------


// ۱. کلاینت اصلی (برای API پلتفرم پرامپت OpenAI)
const openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_API_URL || 'https://api.openai.com/v1',
});

// ۲. کلاینت محلی (برای Fallback)
const localClient = new OpenAI({
    apiKey: 'ollama', // Dummy key
    baseURL: AI_LOCAL_MODEL_URL || 'http://localhost:11434/v1',
});

/**
 * تلاش برای اجرای درخواست با API اصلی (Prompt Platform)
 * و در صورت شکست، Fallback به مدل محلی.
 * @param {object} prompt - شیء پرامپت کلاینت (حاوی prompt.variables).
 * @returns {Promise<string>} خروجی متنی مستقیم از AI.
 */
export const routeRequest = async (prompt) => {

    const allVariables = prompt.variables;

    // --- تلاش اول (Primary): استفاده از OpenAI Prompt Platform ---
    try {
        console.log(JSON.stringify({
            event: 'ai_route_attempt',
            mode: allVariables.mode,
            engine: 'openai_prompt_platform',
            prompt_id: 'pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd',
            version: '9' // ⚠️ این را به نسخه نهایی خود آپدیت کنید
        }));

        // کد جدید شما برای API اصلی
        const response = await openaiClient.responses.create({
            prompt: {
                "id": "pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd",
                "version": "9", // ⚠️ این را به نسخه نهایی خود آپدیت کنید
                "variables": allVariables // ارسال تمام متغیرهای دریافتی
            }
        });

        // 🛑 نحوه دریافت پاسخ را چک کنید
        // این را بر اساس مستندات OpenAI یا لاگ پاسخ تنظیم کنید
        const aiContent = response.text;

        if (!aiContent) {
            throw new Error('OpenAI Prompt Platform returned an empty response.');
        }

        return aiContent; // موفقیت!

    } catch (primaryError) {
        // --- تلاش دوم (Fallback): استفاده از مدل محلی (Ollama) ---
        console.error(JSON.stringify({
            event: 'ai_primary_failed',
            mode: allVariables.mode,
            prompt_id: 'pmpt_... (OpenAI Platform)',
            error: primaryError.message,
        }));

        console.log(JSON.stringify({
            event: 'ai_route_fallback',
            mode: allVariables.mode,
            engine: 'local',
            model: AI_LOCAL_MODEL_NAME,
        }));

        try {
            // برای مدل محلی، باید پیام‌ها را دستی بسازیم
            // ۱. پیام سیستمی
            const systemMessage = {
                role: "system",
                content: FINAL_SYSTEM_MESSAGE // استفاده از متن کاملی که در بالا تعریف کردیم
            };

            // ۲. پیام کاربر (ساخته شده توسط promptTransformer)
            const userMessages = transformPrompt(allVariables);

            const messages = [
                systemMessage,
                ...userMessages
            ];

            // ۳. تماس با مدل محلی (با API صحیح)
            const fallbackResponse = await localClient.chat.completions.create({
                model: AI_LOCAL_MODEL_NAME,
                messages: messages, // ارسال پرامپت کامل
                stream: false,
                temperature: 0.5,
            });

            const aiContent = fallbackResponse.choices[0].message.content;
            if (!aiContent) {
                throw new Error('Fallback (local) AI returned an empty response.');
            }

            return aiContent; // موفقیت در Fallback!

        } catch (fallbackError) {
            // --- هر دو شکست خوردند ---
            console.error(JSON.stringify({
                event: 'ai_fallback_failed',
                mode: allVariables.mode,
                model: AI_LOCAL_MODEL_NAME,
                error: fallbackError.message,
            }));

            // پرتاب خطای نهایی
            throw new Error(`Both primary (OpenAI Platform) and fallback (Local) services failed. Primary: ${primaryError.message} | Fallback: ${fallbackError.message}`);
        }
    }
};
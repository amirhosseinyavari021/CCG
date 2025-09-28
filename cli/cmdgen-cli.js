#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');
const chalk = require('chalk');
const open = require('open');
const semver = require('semver');

const packageJson = require('./package.json');
const { getSystemPrompt } = require('./apiService-cli.js');

// --- Constants ---
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdt_16-wZOgOViET55XwQYAsetfWxQWDW1DBb4yks6AgtOI9g/viewform?usp=header';
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;
const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;
const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com';

// --- Enhanced Response Parser with Markdown + Legacy Support ---
const logParserEvent = (eventData) => {
    if (process.env.CMDGEN_DEBUG) {
        console.log(`[PARSER] ${JSON.stringify({
            timestamp: new Date().toISOString(),
            ...eventData
        })}`);
    }
};

const parseAndConstructData = (textResponse, mode, sessionId = null) => {
    const parseStartTime = Date.now();
    const logContext = { sessionId, clientSide: true };

    try {
        const trimmedResponse = textResponse.trim();
        if (!trimmedResponse) {
            logParserEvent({
                ...logContext,
                event: 'client_parser_warning',
                issue: 'empty_response',
                mode
            });
            return null;
        }

        if (mode === 'generate') {
            return parseGenerateMode(trimmedResponse, logContext, parseStartTime);
        }

        if (mode === 'analyze' || mode === 'explain' || mode === 'script') {
            logParserEvent({
                ...logContext,
                event: 'client_parser_complete',
                mode,
                responseLength: trimmedResponse.length,
                parseTime: Date.now() - parseStartTime
            });
            return { explanation: trimmedResponse };
        }

        if (mode === 'error') {
            return parseErrorMode(trimmedResponse, logContext, parseStartTime);
        }

        logParserEvent({
            ...logContext,
            event: 'client_parser_warning',
            issue: 'unknown_mode',
            mode
        });
        return null;

    } catch (error) {
        logParserEvent({
            ...logContext,
            event: 'client_parser_error',
            error: error.message,
            mode,
            parseTime: Date.now() - parseStartTime
        });
        return null;
    }
};

const parseGenerateMode = (textResponse, logContext, parseStartTime) => {
    let commands = parseMarkdownFormat(textResponse);
    if (!commands || commands.length === 0) commands = parseLegacyFormat(textResponse);

    const validCommands = commands.filter(cmd => cmd !== null);
    const invalidCount = commands.length - validCommands.length;

    logParserEvent({
        ...logContext,
        event: 'client_parser_complete',
        mode: 'generate',
        totalParsedItems: commands.length,
        validCommands: validCommands.length,
        invalidLines: invalidCount,
        parseTime: Date.now() - parseStartTime,
        successRate: commands.length > 0 ? ((validCommands.length / commands.length) * 100).toFixed(1) : 0,
        parsingMethod: commands.length > 0 ? (isMarkdownFormat(textResponse) ? 'markdown' : 'legacy') : 'unknown'
    });

    return validCommands.length > 0 ? { commands: validCommands } : null;
};

// --- Fixed Markdown Parser ---
const parseMarkdownFormat = (textResponse) => {
    const commands = [];
    const lines = textResponse.split('\n');
    let currentCommand = null;
    let currentExplanation = '';
    let insideCodeBlock = false;
    let codeBlockContent = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const commandHeaderMatch = line.match(/^(?:\*\*Command\s+\d+:?\*\*|#+\s*Command\s+\d+)/i);
        if (commandHeaderMatch) {
            if (currentCommand) commands.push(finalizeCommand(currentCommand, currentExplanation));
            currentCommand = { command: '', explanation: '', warning: '' };
            currentExplanation = '';
            continue;
        }

        if (line.startsWith('```')) {
            if (insideCodeBlock) {
                if (currentCommand) currentCommand.command = cleanCommand(codeBlockContent);
                insideCodeBlock = false;
                codeBlockContent = '';
            } else insideCodeBlock = true;
            continue;
        }

        if (insideCodeBlock) {
            codeBlockContent += line + '\n';
            continue;
        }

        if (/^\*\*Explanation:?\*\*/i.test(line)) continue;

        const warningMatch = line.match(/^\*\*(?:Warning|Caution|Note):?\*\*/i);
        if (warningMatch && currentCommand) {
            currentCommand.warning = line.replace(/^\*\*(?:Warning|Caution|Note):?\*\*\s*/i, '').trim();
            continue;
        }

        if (line && currentCommand) {
            if (!currentCommand.command && isLikelyCommand(line)) {
                currentCommand.command = cleanCommand(line);
            } else if (currentCommand.command) {
                currentExplanation += line + ' ';
            }
        }
    }

    if (currentCommand) commands.push(finalizeCommand(currentCommand, currentExplanation));
    return commands.filter(cmd => cmd && cmd.command);
};

// --- Legacy Parser ---
const parseLegacyFormat = (textResponse) => {
    const lines = textResponse.split('\n').filter(line => line.trim());
    const commands = [];
    let invalidLines = [];

    lines.forEach((line, index) => {
        const parts = line.split('|||');
        if (parts.length < 2) {
            invalidLines.push({
                lineNumber: index + 1,
                issue: 'insufficient_parts',
                partsFound: parts.length,
                line: line.substring(0, 50)
            });
            commands.push(null);
            return;
        }

        const cleanedCommand = cleanCommand(parts[0]?.trim() || '');
        if (!cleanedCommand) {
            invalidLines.push({ lineNumber: index + 1, issue: 'empty_command_after_cleaning' });
            commands.push(null);
            return;
        }

        commands.push({
            command: cleanedCommand,
            explanation: parts[1]?.trim() || '',
            warning: parts[2]?.trim() || ''
        });
    });

    if (invalidLines.length > 0) {
        logParserEvent({ event: 'legacy_parser_validation', invalidLinesDetails: invalidLines, totalInvalid: invalidLines.length });
    }

    return commands;
};

// --- Error Parser ---
const parseErrorMode = (textResponse, logContext, parseStartTime) => {
    const parts = textResponse.split('|||');
    if (parts.length < 3) {
        logParserEvent({
            ...logContext,
            event: 'client_parser_warning',
            mode: 'error',
            issue: 'using_fallback_error_parsing',
            partsFound: parts.length
        });

        return {
            cause: 'Error analysis',
            explanation: textResponse,
            solution: []
        };
    }

    logParserEvent({
        ...logContext,
        event: 'client_parser_complete',
        mode: 'error',
        errorPartsFound: parts.length,
        parseTime: Date.now() - parseStartTime
    });

    return {
        cause: parts[0]?.trim() || '',
        explanation: parts[1]?.trim() || '',
        solution: parts.slice(2).map(s => s.trim()).filter(s => s)
    };
};

// --- Helpers ---
const isMarkdownFormat = (text) => text.includes('```') || text.includes('**Command') || text.includes('**Explanation');
const isLikelyCommand = (line) => [/^[a-zA-Z][\w-]*\s+/, /^cd\s+/, /^ls\s*$/, /^pwd\s*$/, /^echo\s+/, /^git\s+/, /^npm\s+/, /^sudo\s+/, /^\w+\.(exe|sh|py|js)\s*/].some(r => r.test(line.trim()));
const cleanCommand = (command) => command.replace(/^```[\w]*\n?|```$/g, '').replace(/^\s*[\d\-\*]+[\.\:\)]\s*/, '').replace(/^\*\*|\*\*$/g, '').replace(/^`|`$/g, '').trim();
const finalizeCommand = (commandObj, explanationText) => commandObj.command ? { command: commandObj.command, explanation: commandObj.explanation || explanationText.trim(), warning: commandObj.warning || '' } : null;

// --- Config Management ---
async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        try {
            const config = await fs.readJson(configFile);
            if (!config.history) config.history = [];
            if (config.usageCount === undefined) config.usageCount = 0;
            if (config.feedbackRequested === undefined) config.feedbackRequested = false;
            return config;
        } catch {
            console.warn(chalk.yellow('⚠️ Config corrupted. Resetting...'));
            await fs.remove(configFile);
        }
    }
    return {
        history: [],
        usageCount: 0,
        feedbackRequested: false,
        os: os.platform(),
        shell: process.env.SHELL || (process.platform === 'win32' ? 'cmd' : 'bash')
    };
}

async function setConfig(newConfig) {
    const current = await getConfig();
    await fs.writeJson(configFile, { ...current, ...newConfig });
}

async function addToHistory(commandItem) {
    const config = await getConfig();
    const history = config.history || [];
    const enhancedItem = { ...commandItem, timestamp: new Date().toISOString(), sessionId: process.env.CMDGEN_SESSION || 'cli-session' };
    if (!history.some(item => item.command === enhancedItem.command)) {
        history.unshift(enhancedItem);
        if (history.length > MAX_HISTORY) history.pop();
        await setConfig({ history });
    }
}

// --- Feedback ---
async function handleFeedback() {
    const config = await getConfig();
    if (config.usageCount >= USAGE_THRESHOLD_FOR_FEEDBACK && !config.feedbackRequested) {
        console.log(chalk.cyan.bold('\n--- We Value Your Feedback! ---'));
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => rl.question(chalk.yellow('Open feedback form in browser? (y/N) '), resolve));
        rl.close();
        if (answer.toLowerCase() === 'y') await open(FEEDBACK_URL);
        await setConfig({ feedbackRequested: true });
    }
}

// --- Spinner ---
let spinnerInterval;
const startSpinner = (msg) => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l');
    spinnerInterval = setInterval(() => process.stdout.write(chalk.blue(`\r${frames[i++ % frames.length]} ${msg}`)), 80);
};

const stopSpinner = () => {
    if (spinnerInterval) clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    process.stdout.write('\x1B[?25h');
};

// --- API Call ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options = {} }) => {
    const systemPrompt = getSystemPrompt(mode, os, osVersion || 'N/A', cli, lang, options);
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };

    const requestStartTime = Date.now();
    const logContext = { timestamp: new Date().toISOString(), mode, os, cli, requestLength: userInput.length };

    const attemptRequest = async (url) => {
        startSpinner('Connecting to server...');
        try {
            const response = await axios.post(`${url}/api/proxy`, payload, { responseType: 'stream', timeout: 60000 });
            stopSpinner();
            startSpinner('Generating response...');
            let fullContent = '';
            const decoder = new TextDecoder();

            response.data.on('data', chunk => {
                const textChunk = decoder.decode(chunk, { stream: true });
                textChunk.split('\n').filter(line => line.startsWith('data: ')).forEach(line => {
                    const jsonPart = line.substring(5).trim();
                    if (jsonPart && jsonPart !== "[DONE]") {
                        try { fullContent += JSON.parse(jsonPart).choices[0].delta.content || ''; } catch { }
                    }
                });
            });

            return await new Promise((resolve, reject) => {
                response.data.on('end', () => {
                    stopSpinner();
                    const responseTime = Date.now() - requestStartTime;
                    logParserEvent({ ...logContext, event: 'api_call_complete', responseTime, responseLength: fullContent.length, success: true });
                    const finalData = parseAndConstructData(fullContent, mode, logContext.timestamp);
                    if (!finalData) {
                        logParserEvent({ ...logContext, event: 'api_parsing_failed', responseTime });
                        reject(new Error("Parsing failed"));
                    } else resolve({ type: mode, data: finalData });
                });
                response.data.on('error', reject);
            });
        } catch (err) {
            stopSpinner();
            logParserEvent({ ...logContext, event: 'api_call_error', error: err.message, responseTime: Date.now() - requestStartTime });
            throw err;
        }
    };

    try { return await attemptRequest(primaryServerUrl); }
    catch (primaryErr) {
        console.warn(chalk.yellow('⚠️ Primary server failed, trying fallback...'));
        try { return await attemptRequest(fallbackServerUrl); }
        catch (fallbackErr) {
            console.error(chalk.red(`❌ API Error: ${fallbackErr.message || primaryErr.message}`));
            return null;
        }
    }
};

// --- Command Execution ---
const executeCommand = (command, shell) => new Promise(resolve => {
    console.log(chalk.magenta(`\n🚀 Executing: ${command.command}`));
    let child;
    if (process.platform === 'win32') {
        if (shell?.toLowerCase().includes('powershell')) child = spawn('powershell.exe', ['-NoProfile', '-Command', command.command], { stdio: 'inherit' });
        else child = spawn('cmd.exe', ['/C', command.command], { stdio: 'inherit' });
    } else child = spawn(command.command, [], { stdio: 'inherit', shell: true });

    child.on('close', code => { if (code !== 0) console.error(chalk.red(`❌ Process exited with code ${code}`)); resolve(); });
    child.on('error', err => { console.error(chalk.red(`❌ Failed to start process: ${err.message}`)); resolve(); });
});

// --- Welcome Message ---
const showWelcome = () => {
    console.log(chalk.cyan.bold('╔═══════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.white.bold('                    AY-CMDGEN CLI                     ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╠═══════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan.bold('║') + chalk.green('  AI-Powered Command-Line Assistant                   ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow(`  Version: ${packageJson.version}                                   `) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.magenta('  Built with ❤️  by Amirhossein Yavari                 ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╠═══════════════════════════════════════════════════════╣'));
};

// --- CLI with Yargs ---
const main = async () => {
    showWelcome();
    const argv = yargs(hideBin(process.argv))
        .command('generate <request>', 'Generate a command', {}, async (args) => {
            const result = await callApi({ mode: 'generate', userInput: args.request, os: os.platform(), cli: 'cli', lang: 'en' });
            if (result?.data?.commands) {
                for (const cmd of result.data.commands) {
                    console.log(chalk.greenBright(`\nCommand: ${cmd.command}\nExplanation: ${cmd.explanation}\nWarning: ${cmd.warning}`));
                    await addToHistory(cmd);
                }
            }
            await handleFeedback();
        })
        .command('script <request>', 'Generate full script', {}, async (args) => {
            const result = await callApi({ mode: 'script', userInput: args.request, os: os.platform(), cli: 'cli', lang: 'en' });
            if (result?.data?.explanation) console.log(chalk.greenBright(result.data.explanation));
            await handleFeedback();
        })
        .help()
        .argv;
};

main();

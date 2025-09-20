#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn, execSync } = require('child_process');
const { TextDecoder } = require('util');
const os = require('os');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');

// --- UX IMPROVEMENT: SPINNER ---
let spinnerInterval;
const startSpinner = (message) => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l'); // Hide cursor
    spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${frames[i++ % frames.length]} ${message}`);
    }, 80);
};

const stopSpinner = () => {
    clearInterval(spinnerInterval);
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
    process.stdout.write('\x1B[?25h'); // Show cursor
};
// --- END UX IMPROVEMENT ---

// --- OS & System Info Detection ---
const getSystemInfo = () => {
    const platform = process.platform;
    let detectedOS = 'linux';
    let detectedVersion = os.release();
    let detectedShell = 'sh';

    if (platform === 'win32') {
        detectedOS = 'windows';
        detectedVersion = os.release();
        detectedShell = process.env.PSModulePath ? 'PowerShell' : 'CMD';
    } else if (platform === 'darwin') {
        detectedOS = 'macos';
        detectedVersion = execSync('sw_vers -productVersion').toString().trim();
        detectedShell = process.env.SHELL ? path.basename(process.env.SHELL) : 'zsh';
    } else { // Linux
        detectedOS = 'linux';
        try {
            const osRelease = execSync('cat /etc/os-release').toString();
            const versionMatch = osRelease.match(/^PRETTY_NAME="([^"]+)"/m);
            if (versionMatch) detectedVersion = versionMatch[1];
        } catch (e) { /* Fallback */ }
        detectedShell = process.env.SHELL ? path.basename(process.env.SHELL) : 'bash';
    }
    return { detectedOS, detectedVersion, detectedShell };
};

// --- Banner and Info ---
const showBanner = () => {
    console.log(`\n  \x1b[1mAY-CMDGEN v${packageJson.version}\x1b[0m - Your Intelligent Command-Line Assistant`);
    console.log(`  Created by Amirhossein Yavari. Licensed under ${packageJson.license}.`);
    console.log('  Type "cmdgen --help" for a list of commands.\n');
};

// --- Remote API Endpoint ---
const serverUrl = 'https://ay-cmdgen-cli.onrender.com';

// --- Core API with UX improvements ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options = {} }) => {
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, options);
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };
    
    startSpinner('Connecting to server...');

    try {
        const response = await axios.post(`${serverUrl}/api/proxy`, payload, { 
            responseType: 'stream',
            timeout: 60000 // 60 second timeout for cold starts
        });
        
        stopSpinner();
        startSpinner('Generating response...');

        let fullContent = '';
        const decoder = new TextDecoder();
        
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                const textChunk = decoder.decode(chunk, { stream: true });
                const dataLines = textChunk.split('\n').filter(line => line.startsWith('data: '));
                for (const line of dataLines) {
                    const jsonPart = line.substring(5).trim();
                    if (jsonPart && jsonPart !== "[DONE]") {
                        try {
                            fullContent += JSON.parse(jsonPart).choices[0].delta.content || '';
                        } catch (e) {}
                    }
                }
            });
            response.data.on('end', () => {
                stopSpinner();
                const finalData = parseAndConstructData(fullContent, mode, cli);
                if (!finalData) reject(new Error("Parsing failed: The AI response was empty or malformed."));
                else resolve({ type: mode, data: finalData });
            });
            response.data.on('error', (err) => {
                stopSpinner();
                reject(err);
            });
        });
    } catch (err) {
        stopSpinner();
        if (err.code === 'ECONNABORTED') {
            console.error(`\n❌ Error: The server took too long to respond.`);
            console.error(`   This can happen during a cold start. Please try again in a moment.`);
        } else if (err.response) {
            console.error(`\n❌ Error: The server responded with status ${err.response.status}.`);
            console.error(`   Message: ${err.response.data?.error?.message || 'An unknown server error occurred.'}`);
        } else if (err.request) {
            console.error(`\n❌ Error: Could not connect to the server.`);
            console.error(`   Please check your internet connection.`);
        } else {
            console.error(`\n❌ Error: ${err.message || "An unknown error occurred."}`);
        }
        return null;
    }
};

// --- Interactive Prompt ---
const promptForChoice = (commands, onExecute, onMore, onQuit) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n');
    console.warn('🚨 WARNING: Executing AI-generated commands can be dangerous. Always review them carefully.');
    
    rl.question(`Enter a number to execute (1-${commands.length}), (m)ore suggestions, or (q)uit: `, (choice) => {
        rl.close();
        const lowerChoice = choice.toLowerCase().trim();
        if (lowerChoice === 'm') onMore();
        else if (lowerChoice === 'q' || lowerChoice === '') onQuit();
        else {
            const index = parseInt(lowerChoice, 10) - 1;
            if (index >= 0 && index < commands.length) onExecute(commands[index]);
            else {
                console.log('\nInvalid choice. Quitting.');
                onQuit();
            }
        }
    });
};

// --- Smart Command Execution ---
const executeCommand = (command) => {
    return new Promise((resolve) => {
        const commandToExecute = command.command;
        console.log(`\n🚀 Executing: ${commandToExecute}`);
        const child = spawn(commandToExecute, [], { stdio: 'inherit', shell: true });
        child.on('close', (code) => {
            if (code !== 0) console.error(`\n❌ Process exited with code ${code}`);
            resolve();
        });
        child.on('error', (err) => {
            console.error(`\n❌ Failed to start process:\n${err.message}`);
            resolve();
        });
    });
};

// --- Yargs Command Parser ---
const run = async () => {
    try {
        const { detectedOS, detectedVersion, detectedShell } = getSystemInfo();
        const parser = yargs(hideBin(process.argv))
            .scriptName("cmdgen")
            .usage('Usage: $0 <command> "[input]" [options]')
            .command(['generate <request>', 'g <request>'], 'Generate a command', {}, async (argv) => {
                let currentCommands = [];
                const getMoreSuggestions = async () => {
                    console.log("\n🔄 Getting more suggestions...");
                    const existing = currentCommands.map(c => c.command);
                    const result = await callApi({ ...argv, userInput: argv.request, options: { existingCommands: existing }, mode: 'generate' });
                    if (result && result.data.commands && result.data.commands.length > 0) {
                        currentCommands.push(...result.data.commands);
                        handleSuggestions(result.data.commands);
                    } else if (result !== null) {
                        console.log("\nCouldn't fetch more suggestions.");
                        process.exit(0);
                    } else process.exit(1);
                };
                const handleSuggestions = (newSuggestions) => {
                    newSuggestions.forEach((cmd, idx) => {
                        const displayIndex = currentCommands.length - newSuggestions.length + idx + 1;
                        console.log(`\nSuggestion #${displayIndex}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                        if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                    });
                    promptForChoice(currentCommands, async (cmd) => { await executeCommand(cmd); process.exit(0); }, getMoreSuggestions, () => { console.log('\nExiting.'); process.exit(0); });
                };
                const initialResult = await callApi({ ...argv, userInput: argv.request, mode: 'generate' });
                if (initialResult && initialResult.data.commands && initialResult.data.commands.length > 0) {
                    currentCommands = initialResult.data.commands;
                    handleSuggestions(currentCommands);
                } else if (initialResult !== null) {
                    console.log("\nNo suggestions could be generated for your request.");
                    process.exit(0);
                } else process.exit(1);
            })
            .command(['analyze <command>', 'a <command>'], 'Analyze a command', {}, async (argv) => {
                const result = await callApi({ ...argv, userInput: argv.command, mode: 'explain' });
                if (result) console.log(result.data.explanation);
                else process.exit(1);
                process.exit(0);
            })
            .command(['error <message>', 'e <message>'], 'Analyze an error message', {}, async (argv) => {
                const userInput = `Error Message:\n${argv.message}` + (argv.context ? `\n\nContext:\n${argv.context}` : '');
                const result = await callApi({ ...argv, userInput: userInput, mode: 'error' });
                if (result) {
                    console.log(`\nProbable Cause: ${result.data.cause}\n\nExplanation: ${result.data.explanation}\n\nSolution:`);
                    result.data.solution.forEach(step => console.log(`  - ${step}`));
                } else process.exit(1);
                process.exit(0);
            })
            .option('os', { describe: 'Target OS', type: 'string', default: detectedOS })
            .option('osVersion', { describe: 'Target OS Version', type: 'string', default: detectedVersion })
            .option('shell', { describe: 'Target shell', type: 'string', default: detectedShell })
            .option('context', { alias: 'c', describe: 'Provide context for error analysis', type: 'string' })
            .option('lang', { describe: 'Set response language (en, fa)', type: 'string', default: 'en' })
            .demandCommand(1, 'You must provide one of the main commands.')
            .help('h').alias('h', 'help')
            .version('v', `Show version number: ${packageJson.version}`).alias('v', 'version')
            .strict().wrap(null).exitProcess(false)
            .fail((msg, err) => {
                if (err) console.error("\n❌ An unexpected error occurred:", err.message);
                else {
                    console.error(`\n❌ Error: ${msg}`);
                    parser.showHelp();
                }
                process.exit(1);
            });
        const argv = await parser.parse();
        if (argv._.length === 0 && !argv.h && !argv.v) showBanner();
    } catch (error) {
        console.error("\n❌ A critical error occurred during startup:", error.message);
        process.exit(1);
    }
};

run();

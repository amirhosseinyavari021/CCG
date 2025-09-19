#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios');
const { spawn, exec } = require('child_process');
const { TextDecoder } = require('util');
const path = require('path');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');

// --- Banner and Info ---
const showBanner = () => {
    const banner = `
      /$$      /$$ /$$$$$$$$ /$$         /$$$$$$   /$$$$$$  /$$      /$$ /$$$$$$$$        /$$$$$$  /$$      /$$ /$$$$$$$   /$$$$$$  /$$$$$$$$ /$$   /$$
     | $$  /$ | $$| $$_____/| $$        /$$__  $$ /$$__  $$| $$$    /$$$| $$_____/       /$$__  $$| $$$    /$$$| $$__  $$ /$$__  $$| $$_____/| $$$ | $$
     | $$ /$$$| $$| $$      | $$       | $$  \\__/| $$  \\ $$| $$$$  /$$$$| $$             | $$  \\__/| $$$$  /$$$$| $$  \\ $$| $$  \\__/| $$      | $$$$| $$
     | $$/$$ $$ $$| $$$$$   | $$       | $$      | $$  | $$| $$ $$/$$ $$| $$$$$          | $$      | $$ $$/$$ $$| $$  | $$| $$ /$$$$| $$$$$   | $$ $$ $$
     | $$$$_  $$$$| $$__/   | $$       | $$      | $$  | $$| $$  $$$| $$| $$__/          | $$      | $$  $$$| $$| $$  | $$| $$|_  $$| $$__/   | $$  $$$$
     | $$$/ \\  $$$| $$      | $$       | $$  $$| $$  | $$| $$\\  $ | $$| $$             | $$  $$| $$\\  $ | $$| $$  | $$| $$  \\ $$| $$      | $$\\  $$$
     | $$/   \\  $$| $$$$$$$$| $$$$$$$$|  $$$$$$/|  $$$$$$/| $$ \\/  | $$| $$$$$$$$       |  $$$$$$/| $$ \\/  | $$| $$$$$$$/|  $$$$$$/| $$$$$$$$| $$ \\  $$
     |__/     \\__/|________/|________/ \\______/  \\______/ |__/    |__/|________/        \\______/ |__/    |__/|_______/  \\______/ |________/|__/  \\__/
                                                                                                                                                 
                                                                                                                                                 
                                                                /$$$$$$  /$$     /$$                                                              
                                                               /$$__  $$|  $$   /$$/                                                              
                                                              | $$  \\ $$ \\  $$ /$$/                                                               
                                                              | $$$$$$$$  \\  $$$$/                                                                
                                                              | $$__  $$   \\  $$/                                                                 
                                                              | $$  | $$    | $$                                                                  
                                                              | $$  | $$    | $$                                                                  
                                                              |__/  |__/    |__/
    `;
    console.log('\x1b[36m%s\x1b[0m', banner);
    console.log(`\n  \x1b[1mAY-CMDGEN v${packageJson.version}\x1b[0m - Your Intelligent Command-Line Assistant`);
    console.log(`  Created by Amirhossein Yavari. Licensed under ${packageJson.license}.`);
    console.log('  Type "cmdgen --help" for a list of commands.\n');
};

// --- Server Management (Robust Version) ---
const serverPort = 3001;
const serverCheckUrl = `http://localhost:${serverPort}/api/health`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ensureServerIsRunning = async () => {
    try {
        await axios.get(serverCheckUrl, { timeout: 500 });
        return true; // Server is already running
    } catch (error) {
        // Server is not running, let's start it
        console.log('⏳ No local server found. Starting server in the background...');
        const serverPath = process.pkg ? path.join(path.dirname(process.execPath), 'server.js') : path.join(__dirname, 'server.js');
        const serverProcess = spawn(process.execPath, [serverPath], {
            detached: true,
            stdio: 'ignore'
        });
        serverProcess.unref();

        // Poll for the server to be ready
        for (let i = 0; i < 10; i++) { // Try for 10 seconds
            await delay(1000);
            try {
                await axios.get(serverCheckUrl, { timeout: 500 });
                console.log('✅ Server started successfully.');
                return true;
            } catch (e) {
                // Keep trying...
            }
        }
        throw new Error("Could not connect to the AY-CMDGEN server. It may have failed to start.");
    }
};


// --- Core API and Execution Functions ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang }) => {
    try {
        await ensureServerIsRunning();
    } catch (err) {
        console.error(`\n❌ ${err.message}`);
        return null;
    }
    
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, {});
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };
    try {
        const proxyUrl = `http://localhost:${serverPort}/api/proxy`;
        const response = await axios.post(proxyUrl, payload, { responseType: 'stream' });
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
                const finalData = parseAndConstructData(fullContent, mode, cli);
                if (!finalData) reject(new Error("Parsing failed"));
                else resolve({ type: mode, data: finalData });
            });
            response.data.on('error', (err) => reject(err));
        });
    } catch (err) {
        console.error("\n❌ Error communicating with the server:", err.response ? err.response.data.error.message : err.message);
        return null;
    }
};

const promptForExecution = (command) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n');
    console.warn('🚨 \x1b[33mWARNING: Executing AI-generated commands can be dangerous. Always review the command carefully before running it.\x1b[0m');
    rl.question(`Execute the following command?\n\n  \x1b[36m${command}\x1b[0m\n\n(y/N): `, (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log('🚀 Executing command...');
            exec(command, { shell: process.env.SHELL || true }, (error, stdout, stderr) => {
                if (error) console.error(`\n❌ Execution error:\n${error.message}`);
                if (stderr) console.warn(`\n⚠️ Standard Error:\n${stderr}`);
                if (stdout) console.log(`\n✅ Standard Output:\n${stdout}`);
                rl.close();
            });
        } else {
            console.log('Execution cancelled.');
            rl.close();
        }
    });
};

// --- Yargs Command Parser (Corrected) ---
const run = async () => {
    yargs(hideBin(process.argv))
        .scriptName("cmdgen")
        .usage('Usage: $0 <command> "[input]" [options]')
        
        .command(
            ['generate <request>', 'g <request>'], 
            'Generate a command based on your request', 
            {}, 
            async (argv) => {
                const result = await callApi({ mode: 'generate', userInput: argv.request, ...argv });
                if (result && result.data.commands) {
                    result.data.commands.forEach((cmd, index) => {
                        console.log(`\nSuggestion #${index + 1}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                        if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                    });
                    if (result.data.commands.length > 0) promptForExecution(result.data.commands[0].command);
                }
            }
        )

        .command(
            ['analyze <command>', 'a <command>'], 
            'Analyze and explain a command', 
            {}, 
            async (argv) => {
                const result = await callApi({ mode: 'explain', userInput: argv.command, ...argv });
                if (result) console.log(result.data.explanation);
            }
        )

        .command(
            ['error <message>', 'e <message>'], 
            'Analyze an error message', 
            {}, 
            async (argv) => {
                const userInput = `Error Message:\n${argv.message}` + (argv.context ? `\n\nContext:\n${argv.context}` : '');
                const result = await callApi({ mode: 'error', userInput, ...argv });
                if (result) {
                    console.log(`\nProbable Cause: ${result.data.cause}\n\nExplanation: ${result.data.explanation}\n\nSolution:`);
                    result.data.solution.forEach(step => console.log(`  - ${step}`));
                }
            }
        )
        
        .option('context', { alias: 'c', describe: 'Provide additional context for error analysis', type: 'string' })
        .option('os', { describe: 'Target Operating System', type: 'string', default: 'linux' })
        .option('osVersion', { describe: 'Target OS Version', type: 'string', default: 'Ubuntu 24.04 LTS' })
        .option('shell', { describe: 'Target command-line shell', type: 'string', default: 'Bash' })
        .option('lang', { describe: 'Set the response language (en, fa)', type: 'string', default: 'en' })
        .demandCommand(1, 'You must provide one of the main commands.')
        .help('h').alias('h', 'help')
        .version('v', 'Show version number', `AY-CMDGEN version: ${packageJson.version}`).alias('v', 'version')
        .strict()
        .wrap(null)
        .check((argv) => {
            if (argv._.length === 0 && !argv.h && !argv.v) {
                showBanner();
            }
            return true;
        })
        .parse();
};

run();

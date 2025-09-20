#!/usr/bin/env node

// --- DOTENV SETUP (MUST BE AT THE VERY TOP) ---
const path = require('path');
// This logic ensures the .env file is read from the correct location,
// both in development and in the packaged executable.
const envPath = process.pkg
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
// --- END DOTENV SETUP ---

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { exec } = require('child_process');
const { TextDecoder } = require('util');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');
const { app } = require('./server.js');

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
    `;
    console.log('\x1b[36m%s\x1b[0m', banner);
    console.log(`\n  \x1b[1mAY-CMDGEN v${packageJson.version}\x1b[0m - Your Intelligent Command-Line Assistant`);
    console.log(`  Created by Amirhossein Yavari. Licensed under ${packageJson.license}.`);
    console.log('  Type "cmdgen --help" for a list of commands.\n');
};

// --- Server Management ---
const serverPort = 3003;
const serverHost = '127.0.0.1';
const serverUrl = `http://${serverHost}:${serverPort}`;

// --- Core API and Execution Functions ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang }) => {
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, {});
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };
    try {
        const response = await axios.post(`${serverUrl}/api/proxy`, payload, { responseType: 'stream' });
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
                if (!finalData) reject(new Error("Parsing failed: The AI response was empty or malformed."));
                else resolve({ type: mode, data: finalData });
            });
            response.data.on('error', (err) => reject(err));
        });
    } catch (err) {
        // This improved error handling will now show the actual message from the server.
        const errorMessage = err.response?.data?.error?.message || err.message || "An unknown error occurred.";
        console.error(`\n❌ Error: ${errorMessage}`);
        return null;
    }
};

const promptForExecution = (command) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n');
        console.warn('🚨 \x1b[33mWARNING: Executing AI-generated commands can be dangerous. Always review the command carefully before running it.\x1b[0m');
        rl.question(`Execute the following command?\n\n  \x1b[36m${command}\x1b[0m\n\n(y/N): `, (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                console.log('🚀 Executing command...');
                exec(command, { shell: process.env.SHELL || true }, (error, stdout, stderr) => {
                    if (error) console.error(`\n❌ Execution error:\n${error.message}`);
                    if (stderr) console.warn(`\n⚠️ Standard Error:\n${stderr}`);
                    if (stdout) console.log(`\n✅ Standard Output:\n${stdout}`);
                    resolve();
                });
            } else {
                console.log('Execution cancelled.');
                resolve();
            }
        });
    });
};

// --- Yargs Command Parser ---
const run = async () => {
    const server = app.listen(serverPort, serverHost);
    // unref() allows the program to exit even if the server is still listening.
    server.unref();

    const parser = yargs(hideBin(process.argv))
        .scriptName("cmdgen")
        .usage('Usage: $0 <command> "[input]" [options]')
        
        .command(
            ['generate <request>', 'g <request>'], 
            'Generate a command based on your request', 
            {}, 
            async (argv) => {
                const result = await callApi({ mode: 'generate', userInput: argv.request, ...argv });
                if (result && result.data.commands && result.data.commands.length > 0) {
                    result.data.commands.forEach((cmd, index) => {
                        console.log(`\nSuggestion #${index + 1}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                        if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                    });
                    await promptForExecution(result.data.commands[0].command);
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
        // This ensures the process will exit after the command handler finishes.
        .exitProcess(true)
        .fail((msg, err) => {
            if (err) {
                console.error("\n❌ An unexpected error occurred:", err.message);
            } else {
                console.error(`\n❌ Error: ${msg}`);
                parser.showHelp();
            }
            process.exit(1);
        });

    const argv = await parser.argv;
    // Show banner if no command is given.
    if (argv._.length === 0 && !argv.h && !argv.v) {
        showBanner();
    }
};

run();

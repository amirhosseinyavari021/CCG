#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { exec } = require('child_process');
const { TextDecoder } = require('util');
const path = require('path');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');
const { app } = require('./server.js'); // Import the app from server.js

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

// --- Server Management (Integrated Version) ---
const serverPort = 3003;
const serverHost = '127.0.0.1';
const serverUrl = `http://${serverHost}:${serverPort}`;

// The ensureServerIsRunning function is no longer needed and has been removed.

// --- Core API and Execution Functions ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang }) => {
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, {});
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };
    try {
        const proxyUrl = `${serverUrl}/api/proxy`;
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
        // More robust error handling for connection refused
        if (err.code === 'ECONNREFUSED') {
             console.error(`\n❌ Error: Connection refused. Could not connect to the internal server at ${serverUrl}.`);
        } else {
            console.error("\n❌ Error communicating with the server:", err.response ? err.response.data.error.message : err.message);
        }
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

// --- Yargs Command Parser ---
const run = async () => {
    // Start the server programmatically before parsing args
    const server = app.listen(serverPort, serverHost, () => {
        // This log is optional and can be removed if you don't want any startup message
        // console.log(`Internal server is running on ${serverUrl}`);
    });

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
                server.close(); // Close the server after the command is done
            }
        )

        .command(
            ['analyze <command>', 'a <command>'], 
            'Analyze and explain a command', 
            {}, 
            async (argv) => {
                const result = await callApi({ mode: 'explain', userInput: argv.command, ...argv });
                if (result) console.log(result.data.explanation);
                server.close();
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
                server.close();
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
                 // Keep server alive for banner display then close
                setTimeout(() => server.close(), 200);
            }
            return true;
        })
        .fail((msg, err, yargs) => {
            if (err) throw err;
            console.error('❌', msg);
            console.error('\nFor more help, run: cmdgen --help');
            server.close();
            process.exit(1);
        })
        .parse();
};

run();

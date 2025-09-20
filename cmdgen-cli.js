#!/usr/bin/env node

// --- DOTENV SETUP (MUST BE AT THE VERY TOP) ---
const path = require('path');
const envPath = process.pkg
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
// --- END DOTENV SETUP ---

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { exec, execSync } = require('child_process');
const { TextDecoder } = require('util');
const os = require('os');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');
const { app } = require('./server.js');

// --- OS & System Info Detection (Final, Reliable Version) ---
const getSystemInfo = () => {
    const platform = process.platform;
    let detectedOS = 'linux';
    let detectedVersion = os.release();
    let detectedShell = 'sh';

    if (platform === 'win32') {
        detectedOS = 'windows';
        detectedVersion = os.release();
        // This is a modern and reliable way to detect the shell without using deprecated 'wmic'.
        // PowerShell sets this environment variable, but CMD does not.
        if (process.env.PSModulePath) {
            detectedShell = 'PowerShell';
        } else {
            detectedShell = 'CMD';
        }
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
        } catch (e) { /* Fallback to os.release() */ }
        detectedShell = process.env.SHELL ? path.basename(process.env.SHELL) : 'bash';
    }
    return { detectedOS, detectedVersion, detectedShell };
};


// --- Banner and Info ---
const showBanner = () => { /* ... banner code ... */ };

// --- Server Management ---
const serverPort = 3003;
const serverHost = '127.0.0.1';
const serverUrl = `http://${serverHost}:${serverPort}`;

// --- Core API ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options = {} }) => { /* ... code from previous version ... */ };

// --- Interactive Prompt ---
const promptForChoice = (commands, onExecute, onMore, onQuit) => { /* ... code from previous version ... */ };

// --- Smart Command Execution ---
const executeCommand = (command, currentShell) => { /* ... code from previous version ... */ };

// --- Yargs Command Parser ---
const run = async () => {
    try {
        let server = app.listen(serverPort, serverHost);
        server.unref();

        const { detectedOS, detectedVersion, detectedShell } = getSystemInfo();

        const parser = yargs(hideBin(process.argv))
            .scriptName("cmdgen")
            .usage('Usage: $0 <command> "[input]" [options]')
            
            .command(
                ['generate <request>', 'g <request>'], 
                'Generate a command based on your request', 
                {}, 
                async (argv) => {
                    let currentCommands = [];
                    const getMoreSuggestions = async () => { /* ... code ... */ };
                    const handleSuggestions = (newSuggestions) => {
                        newSuggestions.forEach((cmd, index) => {
                            console.log(`\nSuggestion #${index + 1}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                            if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                        });
                        promptForChoice(
                            currentCommands,
                            async (commandToExecute) => {
                                await executeCommand(commandToExecute, argv.shell);
                                process.exit(0);
                            },
                            getMoreSuggestions,
                            () => {
                                console.log('\nExiting.');
                                process.exit(0);
                            }
                        );
                    };
                    const initialResult = await callApi({ ...argv, mode: 'generate' });
                    if (initialResult && initialResult.data.commands && initialResult.data.commands.length > 0) {
                        currentCommands = initialResult.data.commands;
                        handleSuggestions(currentCommands);
                    }
                }
            )
            // ... other commands ...
            .option('os', { default: detectedOS })
            .option('osVersion', { default: detectedVersion })
            .option('shell', { default: detectedShell })
            // ... other options ...
            .version('v', `Show version number: ${packageJson.version}`).alias('v', 'version');
            
        const argv = await parser.argv;
        if (argv._.length === 0 && !argv.h && !argv.v) {
            showBanner();
        }
    } catch (error) {
        console.error("A critical error occurred during startup:", error);
        process.exit(1);
    }
};

run();

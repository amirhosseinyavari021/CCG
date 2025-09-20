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

// --- OS & System Info Detection ---
const getSystemInfo = () => {
    const platform = process.platform;
    let detectedOS = 'linux';
    let detectedVersion = os.release();
    let detectedShell = 'sh'; // Default fallback

    if (platform === 'win32') {
        detectedOS = 'windows';
        detectedVersion = os.release();
        // Detect if running in PowerShell or CMD by checking parent process
        try {
            const parentProcess = execSync('wmic process get Caption,ProcessId,ParentProcessId | findstr /i "cmd.exe powershell.exe"', { encoding: 'utf8' });
            if (parentProcess.toLowerCase().includes('powershell.exe')) {
                detectedShell = 'PowerShell';
            } else {
                detectedShell = 'CMD';
            }
        } catch (e) {
            detectedShell = 'PowerShell'; // Default to PowerShell on error
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
        } catch (e) { /* ignore */ }
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
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options = {} }) => { /* ... unchanged ... */ };

// --- Interactive Prompt ---
const promptForChoice = (commands, onExecute, onMore, onQuit) => { /* ... unchanged ... */ };

// --- Smart Command Execution ---
const executeCommand = (command, currentShell) => {
    return new Promise((resolve) => {
        const commandToExecute = command.command;
        console.log(`\n🚀 Executing: ${commandToExecute}`);

        let executionProcess;
        if (process.platform === 'win32') {
            // If the command is a known PowerShell cmdlet, force execution in PowerShell.
            const isPowerShellCommand = /^[A-Z][a-z]+-[A-Za-z]+/.test(commandToExecute.trim());
            if (isPowerShellCommand) {
                executionProcess = exec(`powershell.exe -NoProfile -Command "& {${commandToExecute.replace(/"/g, '`"')}}"`);
            } else {
                // Otherwise, execute in the current shell (CMD or PowerShell)
                executionProcess = exec(commandToExecute);
            }
        } else {
            // On macOS and Linux, use the default system shell
            executionProcess = exec(commandToExecute, { shell: process.env.SHELL || true });
        }

        executionProcess.stdout.on('data', (data) => console.log(`\n✅ Output:\n${data}`));
        executionProcess.stderr.on('data', (data) => console.warn(`\n⚠️ Error Output:\n${data}`));
        executionProcess.on('close', (code) => {
            if (code !== 0) console.error(`\n❌ Process exited with code ${code}`);
            resolve();
        });
        executionProcess.on('error', (err) => {
            console.error(`\n❌ Failed to start process:\n${err.message}`);
            resolve();
        });
    });
};

// --- Yargs Command Parser ---
const run = async () => {
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

                const getMoreSuggestions = async () => { /* ... unchanged ... */ };
                
                const handleSuggestions = (newSuggestions) => {
                    newSuggestions.forEach((cmd) => { /* ... unchanged ... */ });

                    promptForChoice(
                        currentCommands,
                        async (commandToExecute) => {
                            // Pass the detected shell to the execution function
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
        .option('os', {
            describe: 'Target Operating System',
            type: 'string',
            default: detectedOS
        })
        .option('osVersion', {
            describe: 'Target OS Version',
            type: 'string',
            default: detectedVersion
        })
        .option('shell', {
            describe: 'Target command-line shell',
            type: 'string',
            default: detectedShell
        })
        // ... other options and configurations ...
        .version('v', `Show version number: ${packageJson.version}`).alias('v', 'version');
        
    const argv = await parser.argv;
    if (argv._.length === 0 && !argv.h && !argv.v) {
        showBanner();
    }
};

run();

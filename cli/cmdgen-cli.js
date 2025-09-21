#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { exec, execSync, spawn } = require('child_process');
const { TextDecoder } = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');

// --- Config and State Management ---
const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');

async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        return fs.readJson(configFile);
    }
    const defaultConfig = { first_run_shown: false, last_update_check: 0 };
    await fs.writeJson(configFile, defaultConfig);
    return defaultConfig;
}

async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

// --- UX IMPROVEMENT: SPINNER ---
let spinnerInterval;
const startSpinner = (message) => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l');
    spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${frames[i++ % frames.length]} ${message}`);
    }, 80);
};

const stopSpinner = () => {
    clearInterval(spinnerInterval);
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    process.stdout.write('\x1B[?25h');
};

// --- Update Checker ---
async function checkForUpdates() {
    const config = await getConfig();
    const now = Date.now();
    if (now - config.last_update_check < 24 * 60 * 60 * 1000) return;

    try {
        const response = await axios.get('https://api.github.com/repos/amirhosseinyavari021/ay-cmdgen/releases/latest', { timeout: 2000 });
        const latestVersion = response.data.tag_name.replace('v', '');
        const currentVersion = packageJson.version;

        if (semver.gt(latestVersion, currentVersion)) {
            console.log(`\n\x1b[32m💡 New version available! (${currentVersion} -> ${latestVersion})\x1b[0m`);
            console.log(`   Run \x1b[36mcmdgen update\x1b[0m to get the latest version.\n`);
        }
        await setConfig({ last_update_check: now });
    } catch (error) { /* Ignore errors */ }
}

// --- OS & System Info ---
const getSystemInfo = () => {
    const platform = process.platform;
    let detectedOS = 'linux', detectedVersion = os.release(), detectedShell = 'sh';

    if (platform === 'win32') {
        detectedOS = 'windows';
        detectedVersion = os.release();
        detectedShell = process.env.PSModulePath ? 'PowerShell' : 'CMD';
    } else if (platform === 'darwin') {
        detectedOS = 'macos';
        detectedVersion = execSync('sw_vers -productVersion').toString().trim();
        detectedShell = process.env.SHELL ? path.basename(process.env.SHELL) : 'zsh';
    } else { // Linux
        try {
            const osRelease = execSync('cat /etc/os-release').toString();
            const versionMatch = osRelease.match(/^PRETTY_NAME="([^"]+)"/m);
            if (versionMatch) detectedVersion = versionMatch[1];
        } catch (e) { /* Fallback */ }
        detectedShell = process.env.SHELL ? path.basename(process.env.SHELL) : 'bash';
    }
    return { detectedOS, detectedVersion, detectedShell };
};

// --- API Call Logic ---
const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com';

const callApi = async (params) => {
    const { mode, userInput, os, osVersion, cli, lang, options = {} } = params;
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, options);
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };

    const attemptRequest = (url) => new Promise(async (resolve, reject) => {
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
                        try { fullContent += JSON.parse(jsonPart).choices[0].delta.content || ''; } catch (e) {}
                    }
                });
            });
            response.data.on('end', () => {
                stopSpinner();
                const finalData = parseAndConstructData(fullContent, mode, cli);
                if (!finalData) reject(new Error("Parsing failed"));
                else resolve({ type: mode, data: finalData });
            });
            response.data.on('error', reject);
        } catch (err) { reject(err); }
    });

    try {
        startSpinner('Connecting to primary server...');
        return await attemptRequest(primaryServerUrl);
    } catch (primaryError) {
        stopSpinner();
        console.warn(`\n⚠️  Primary server failed. Trying fallback...`);
        startSpinner('Connecting to fallback server...');
        try {
            return await attemptRequest(fallbackServerUrl);
        } catch (fallbackError) {
            stopSpinner();
            const err = fallbackError || primaryError;
            if (err.code === 'ECONNABORTED') console.error(`\n❌ Error: Both servers timed out.`);
            else if (err.response) console.error(`\n❌ Error: Server responded with status ${err.response.status}.`);
            else if (err.request) console.error(`\n❌ Error: Could not connect to any server.`);
            else console.error(`\n❌ Error: ${err.message || "An unknown error occurred."}`);
            return null;
        }
    }
};

// --- Command Execution ---
const executeCommand = (command, shell) => {
    return new Promise((resolve) => {
        console.log(`\n🚀 Executing: ${command.command}`);
        const commandString = command.command;
        let child;
        
        if (process.platform === 'win32') {
            const shellExecutable = shell === 'PowerShell' ? 'powershell.exe' : 'cmd.exe';
            child = spawn(shellExecutable, ['-Command', commandString], { stdio: 'inherit', shell: true });
        } else {
            child = spawn(commandString, [], { stdio: 'inherit', shell: true });
        }

        child.on('close', (code) => {
            if (code !== 0) console.error(`\n❌ Process exited with code ${code}`);
            resolve();
        });
        child.on('error', (err) => {
            console.error(`\n❌ Failed to start process: ${err.message}`);
            resolve();
        });
    });
};

// --- Main Application Logic ---
const run = async () => {
    const config = await getConfig();
    if (!config.first_run_shown) {
        console.log("\n✨ Created by Amirhossein Yavari ✨\n");
        await setConfig({ first_run_shown: true });
    }
    
    checkForUpdates();

    const { detectedOS, detectedVersion, detectedShell } = getSystemInfo();
    console.log(`\x1b[90m[DEBUG: OS=${detectedOS}, Shell=${detectedShell}]\x1b[0m`);

    const parser = yargs(hideBin(process.argv))
        .scriptName("cmdgen")
        .command(['generate <request>', 'g <request>'], 'Generate a command', {}, async (argv) => {
            const startInteractiveSession = async () => {
                let allCommands = [];
                const initialResult = await callApi({ ...argv, mode: 'generate' });
                if (initialResult?.data?.commands?.length > 0) {
                    allCommands = initialResult.data.commands;
                    displayNewSuggestions(allCommands, true);
                } else {
                    console.log("\nNo suggestions could be generated for your request.");
                    process.exit(1);
                }

                while (true) {
                    const choice = await promptUser(allCommands.length);
                    if (choice === 'm') {
                        const newCmds = await getMoreSuggestions(argv, allCommands);
                        if(newCmds.length > 0) allCommands.push(...newCmds);
                    } else if (choice === 'q' || choice === '') {
                        console.log('\nExiting.');
                        process.exit(0);
                    } else {
                        const index = parseInt(choice, 10) - 1;
                        if (index >= 0 && index < allCommands.length) {
                            await executeCommand(allCommands[index], detectedShell);
                            process.exit(0);
                        } else {
                            console.log('\nInvalid choice. Please try again.');
                        }
                    }
                }
            };
            
            const displayNewSuggestions = (newSuggestions, isFirstTime) => {
                 newSuggestions.forEach((cmd, idx) => {
                    const displayIndex = (isFirstTime ? 0 : newSuggestions.length) + idx + 1;
                    console.log(`\nSuggestion #${displayIndex}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                    if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                });
                if(isFirstTime) console.warn('\n🚨 WARNING: Executing AI-generated commands can be dangerous. Review them carefully.');
            };
            
            const getMoreSuggestions = async (argv, allCommands) => {
                console.log("\n🔄 Getting more suggestions...");
                const existing = allCommands.map(c => c.command);
                const result = await callApi({ ...argv, options: { existingCommands: existing }, mode: 'generate' });
                if (result?.data?.commands?.length > 0) {
                    const newCommands = result.data.commands;
                    displayNewSuggestions(newCommands, false);
                    return newCommands;
                } else {
                   console.log("\nCouldn't fetch more suggestions.");
                   return [];
                }
            };
            
            const promptUser = (count) => new Promise(resolve => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question(`\nEnter a number to execute (1-${count}), (m)ore, or (q)uit: `, (choice) => {
                    rl.close();
                    resolve(choice.toLowerCase().trim());
                });
            });
            await startInteractiveSession();
        })
        .command('update', 'Update cmdgen to the latest version', {}, () => {
            const command = process.platform === 'win32'
                ? 'iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex'
                : 'curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash';
            spawn(command, { shell: true, stdio: 'inherit' }).on('close', code => process.exit(code));
        })
        .command(['analyze <command>', 'a <command>'], 'Analyze a command', {}, async (argv) => {
            const result = await callApi({ ...argv, mode: 'explain' });
            if (result) console.log(result.data.explanation);
        })
        .command(['error <message>', 'e <message>'], 'Analyze an error message', {}, async (argv) => {
            const result = await callApi({ ...argv, mode: 'error' });
            if (result) {
                console.log(`\nProbable Cause: ${result.data.cause}\n\nExplanation: ${result.data.explanation}\n\nSolution:`);
                result.data.solution.forEach(step => console.log(`  - ${step}`));
            }
        })
        .option('os', { describe: 'Target OS', type: 'string', default: detectedOS })
        .option('osVersion', { describe: 'Target OS Version', type: 'string', default: detectedVersion })
        .option('shell', { describe: 'Target shell', type: 'string', default: detectedShell })
        .option('lang', { describe: 'Set response language (en, fa)', type: 'string', default: 'en' })
        .demandCommand(1, 'You must provide a command or run "cmdgen --help".')
        .help('h').alias('h', 'help')
        .version('v', `Show version number: ${packageJson.version}`).alias('v', 'version')
        .strict().wrap(null)
        .fail((msg, err) => {
            if (err) console.error(`\n❌ An unexpected error occurred: ${err.message}`);
            else { console.error(`\n❌ Error: ${msg}`); parser.showHelp(); }
            process.exit(1);
        });

    const argv = await parser.parse(process.argv.slice(2)); // Corrected yargs call
    if (argv._.length === 0 && !argv.h && !argv.v) {
        parser.showHelp();
    }
};

run();

#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const readline = require('readline');

const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');

// --- Config and State Management ---
const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');

async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        return fs.readJson(configFile);
    }
    // Return a default structure indicating config is missing
    return { first_run_shown: false, last_update_check: 0 };
}

async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

// --- Interactive Setup Wizard ---
const runSetupWizard = async () => {
    console.log('\n--- CMDGEN First-Time Setup ---');
    console.log('Please select your operating system and default shell.');
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    const osOptions = ['Windows', 'macOS', 'Linux', 'Other'];
    console.log('\nSelect your Operating System:');
    osOptions.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
    const osChoice = await question('> ');
    const selectedOsKey = osOptions[parseInt(osChoice) - 1]?.toLowerCase() || 'other';

    let os, shell;

    if (selectedOsKey === 'other') {
        os = await question('Enter your OS name (e.g., FreeBSD): ');
        shell = await question('Enter your Shell name (e.g., sh): ');
    } else {
        os = selectedOsKey;
        const shellMap = {
            windows: ['PowerShell', 'CMD'],
            macos: ['zsh', 'bash'],
            linux: ['bash', 'zsh', 'fish'],
        };
        const shellOptions = shellMap[os];
        console.log(`\nSelect a Shell for ${os}:`);
        shellOptions.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
        const shellChoice = await question('> ');
        shell = shellOptions[parseInt(shellChoice) - 1];
    }

    rl.close();

    if (!os || !shell) {
        console.error('\n❌ Invalid selection. Please run `cmdgen config` again.');
        process.exit(1);
    }

    const newConfig = {
        'os': os,
        'shell': shell,
        'osVersion': '' // Let the user set this manually if needed, or leave it blank
    };

    await setConfig(newConfig);
    console.log(`\n✅ Configuration saved successfully: OS=${os}, Shell=${shell}`);
    console.log('You can now use CMDGEN!');
    return newConfig;
};

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
    if (now - (config.last_update_check || 0) < 24 * 60 * 60 * 1000) return;

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

// --- API Call Logic ---
const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com';

const callApi = async (params) => {
    const { mode, userInput, os, osVersion, cli, lang, options = {} } = params;
    const systemPrompt = getSystemPrompt(mode, os, osVersion || 'N/A', cli, lang, options);
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
            if (shell.toLowerCase() === 'powershell') {
                child = spawn('powershell.exe', ['-NoProfile', '-Command', commandString], { stdio: 'inherit' });
            } else { // CMD
                child = spawn('cmd.exe', ['/C', commandString], { stdio: 'inherit' });
            }
        } else { // Linux/macOS
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
    let config = await getConfig();

    // Check if configuration is set, if not, run the wizard
    if (!config.os || !config.shell) {
        // Allow 'config' and 'update' commands to run without setup
        const args = process.argv.slice(2);
        if (args[0] !== 'config' && args[0] !== 'update' && args[0] !== '--help' && args[0] !== '-h' && args[0] !== '--version' && args[0] !== '-v') {
             console.log('Welcome to CMDGEN! You need to configure it before first use.');
             config = await runSetupWizard();
        }
    }
    
    checkForUpdates();

    const parser = yargs(hideBin(process.argv))
        .scriptName("cmdgen")
        .command(['generate <request>', 'g <request>'], 'Generate a command', {}, async (argv) => {
            const startInteractiveSession = async () => {
                let allCommands = [];
                const initialResult = await callApi({ ...argv, userInput: argv.request, mode: 'generate', cli: argv.shell });
                if (initialResult?.data?.commands?.length > 0) {
                    allCommands = initialResult.data.commands;
                    displayNewSuggestions(allCommands, allCommands, true);
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
                            await executeCommand(allCommands[index], argv.shell);
                            process.exit(0);
                        } else {
                            console.log('\nInvalid choice. Please try again.');
                        }
                    }
                }
            };
            
            const displayNewSuggestions = (newSuggestions, allCommands, isFirstTime) => {
                 newSuggestions.forEach((cmd, idx) => {
                    const displayIndex = allCommands.length - newSuggestions.length + idx + 1;
                    console.log(`\nSuggestion #${displayIndex}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                    if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                });
                if(isFirstTime) console.warn('\n🚨 WARNING: Executing AI-generated commands can be dangerous. Review them carefully.');
            };
            
            const getMoreSuggestions = async (argv, allCommands) => {
                console.log("\n🔄 Getting more suggestions...");
                const existing = allCommands.map(c => c.command);
                const result = await callApi({ ...argv, userInput: argv.request, options: { existingCommands: existing }, mode: 'generate', cli: argv.shell });
                if (result?.data?.commands?.length > 0) {
                    const newCommands = result.data.commands;
                    displayNewSuggestions(newCommands, allCommands, false);
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
        .command('config', 'Re-configure the default OS and Shell', {}, runSetupWizard)
        .command('update', 'Update cmdgen to the latest version', {}, () => {
            if (process.platform === 'win32') {
                const command = 'iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex';
                spawn('powershell.exe', ['-Command', command], { stdio: 'inherit' }).on('close', code => process.exit(code));
            } else {
                const command = 'curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash';
                spawn(command, { stdio: 'inherit', shell: true }).on('close', code => process.exit(code));
            }
        })
        .command(['analyze <command>', 'a <command>'], 'Analyze a command', {}, async (argv) => {
            const result = await callApi({ ...argv, userInput: argv.command, mode: 'explain', cli: argv.shell });
            if (result) console.log(result.data.explanation);
        })
        .command(['error <message>', 'e <message>'], 'Analyze an error message', {}, async (argv) => {
            const userInput = `Error Message:\n${argv.message}` + (argv.context ? `\n\nContext:\n${argv.context}` : '');
            const result = await callApi({ ...argv, userInput: userInput, mode: 'error', cli: argv.shell });
            if (result) {
                console.log(`\nProbable Cause: ${result.data.cause}\n\nExplanation: ${result.data.explanation}\n\nSolution:`);
                result.data.solution.forEach(step => console.log(`  - ${step}`));
            }
        })
        .option('os', { describe: 'Target OS', type: 'string', default: config.os })
        .option('osVersion', { describe: 'Target OS Version', type: 'string', default: config.osVersion })
        .option('shell', { describe: 'Target shell', type: 'string', default: config.shell })
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

    const argv = await parser.parse(process.argv.slice(2));
    if (argv._.length === 0 && !argv.h && !argv.v && !config.os) {
         // This case handles running `cmdgen` with no args and no config.
         // The initial check at the top of run() will have already triggered the wizard.
    }
};

run();

#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn, execSync, exec } = require('child_process');
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
    // Default config for first run
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
    // Check for updates once every 24 hours
    if (now - config.last_update_check < 24 * 60 * 60 * 1000) {
        return;
    }

    try {
        const response = await axios.get('https://api.github.com/repos/amirhosseinyavari021/ay-cmdgen/releases/latest', { timeout: 2000 });
        const latestVersion = response.data.tag_name.replace('v', '');
        const currentVersion = packageJson.version;

        if (semver.gt(latestVersion, currentVersion)) {
            console.log(`\n\x1b[32m💡 New version available! (${currentVersion} -> ${latestVersion})\x1b[0m`);
            console.log(`   Run \x1b[36mcmdgen update\x1b[0m to get the latest version.\n`);
        }
        await setConfig({ last_update_check: now });
    } catch (error) {
        // Ignore errors, e.g., if offline
    }
}

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

// --- API Call Logic ---
const callApi = async (params) => {
    // ... (This function remains the same as the previous corrected version)
    // ... (تابع فراخوانی API مانند نسخه اصلاح شده قبلی باقی می‌ماند)
};

// --- Command Execution ---
const executeCommand = (command) => {
    return new Promise((resolve) => {
        console.log(`\n🚀 Executing: ${command.command}`);
        const child = spawn(command.command, [], { stdio: 'inherit', shell: true });
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

// --- Main Application Logic ---
const run = async () => {
    const config = await getConfig();
    if (!config.first_run_shown) {
        console.log("\n✨ Created by Amirhossein Yavari ✨\n");
        await setConfig({ first_run_shown: true });
    }
    
    // Check for updates in the background, don't wait for it
    checkForUpdates();

    const { detectedOS, detectedVersion, detectedShell } = getSystemInfo();
    const parser = yargs(hideBin(process.argv))
        .scriptName("cmdgen")
        .usage('Usage: $0 <command> "[input]" [options]')
        .command(['generate <request>', 'g <request>'], 'Generate a command', {}, async (argv) => {
            
            let allCommands = [];

            const promptUser = () => new Promise(resolve => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question(`\nEnter a number to execute (1-${allCommands.length}), (m)ore, or (q)uit: `, (choice) => {
                    rl.close();
                    resolve(choice.toLowerCase().trim());
                });
            });

            const displayNewSuggestions = (newSuggestions) => {
                 newSuggestions.forEach((cmd, idx) => {
                    const displayIndex = allCommands.length - newSuggestions.length + idx + 1;
                    console.log(`\nSuggestion #${displayIndex}:\n  \x1b[36m${cmd.command}\x1b[0m\n  └─ Explanation: ${cmd.explanation}`);
                    if (cmd.warning) console.log(`     └─ \x1b[33mWarning: ${cmd.warning}\x1b[0m`);
                });
            };

            const getMoreSuggestions = async () => {
                console.log("\n🔄 Getting more suggestions...");
                const existing = allCommands.map(c => c.command);
                const result = await callApi({ ...argv, userInput: argv.request, options: { existingCommands: existing }, mode: 'generate' });
                if (result?.data?.commands?.length > 0) {
                    allCommands.push(...result.data.commands);
                    displayNewSuggestions(result.data.commands);
                    return true;
                } else {
                    console.log("\nCouldn't fetch more suggestions.");
                    return false;
                }
            };
            
            // --- Main Interactive Loop ---
            const startInteractiveSession = async () => {
                const initialResult = await callApi({ ...argv, userInput: argv.request, mode: 'generate' });
                if (initialResult?.data?.commands?.length > 0) {
                    allCommands = initialResult.data.commands;
                    displayNewSuggestions(allCommands);
                    console.warn('\n🚨 WARNING: Executing AI-generated commands can be dangerous. Review them carefully.');
                } else {
                    console.log("\nNo suggestions could be generated for your request.");
                    process.exit(1);
                }

                while (true) {
                    const choice = await promptUser();
                    if (choice === 'm') {
                        const success = await getMoreSuggestions();
                        if (!success) break;
                    } else if (choice === 'q' || choice === '') {
                        console.log('\nExiting.');
                        process.exit(0);
                    } else {
                        const index = parseInt(choice, 10) - 1;
                        if (index >= 0 && index < allCommands.length) {
                            await executeCommand(allCommands[index]);
                            process.exit(0);
                        } else {
                            console.log('\nInvalid choice. Please try again.');
                        }
                    }
                }
            };

            await startInteractiveSession();
        })
        .command('update', 'Update cmdgen to the latest version', {}, async () => {
            console.log('Checking for the latest version...');
            const platform = process.platform;
            let updateCommand;

            if (platform === 'win32') {
                updateCommand = 'iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex';
                console.log('Running update for Windows. Please wait...');
            } else {
                updateCommand = 'curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash';
                console.log('Running update for Linux/macOS. Please wait...');
            }
            
            exec(updateCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`\n❌ Update failed: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`\n❌ Update error: ${stderr}`);
                    return;
                }
                console.log(stdout);
                console.log('\n✅ Update complete! Please open a new terminal to use the new version.');
            });
        })
        // ... Other commands like 'analyze' and 'error' remain the same
        .option('os', { describe: 'Target OS', type: 'string', default: detectedOS })
        // ... Other options
        .help('h').alias('h', 'help')
        .version('v', `Show version number: ${packageJson.version}`).alias('v', 'version')
        .strict().wrap(null)
        .fail((msg, err) => {
            console.error(err ? `\n❌ An unexpected error occurred: ${err.message}` : `\n❌ Error: ${msg}`);
            if (!err) parser.showHelp();
            process.exit(1);
        });

    const argv = await parser.parse();
    if (argv._.length === 0 && !argv.h && !argv.v) {
        // No command was run, show help
        parser.showHelp();
    }
};

run();

#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const readline = require('readline');
const chalk = require('chalk');
const open = require('open');
const axios = require('axios/dist/node/axios.cjs'); // Keep for update check

// --- MODIFIED IMPORTS ---
// -- Requires the CJS version of apiService-cli.js (FIX for PKG) --
const { sendToCCGServer } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const { runComparer } = require('./modules/codeCompare.js');
// --------------------------

const packageJson = require('./package.json');
const currentVersion = packageJson.version;
const packageName = packageJson.name;

// --- MODIFICATION: Updated Feedback URL ---
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=dialog';
// --- END MODIFICATION ---
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;

const configDir = path.join(os.homedir(), '.config', 'ccg');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;

async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        try {
            const config = await fs.readJson(configFile);
            if (!config.history) config.history = [];
            // --- MODIFICATION: Ensure all keys exist ---
            if (!config.sessionStats) config.sessionStats = {};
            if (config.usageCount === undefined) config.usageCount = 0; // <-- Ensures usageCount exists
            if (config.feedbackRequested === undefined) config.feedbackRequested = false;
            if (config.isFirstRun === undefined) config.isFirstRun = false;
            if (config.last_update_check) delete config.last_update_check; // <-- Remove old timestamp key
            // --- END MODIFICATION ---
            return config;
        } catch (error) {
            console.error(chalk.yellow('Warning: Configuration file was corrupted and has been reset.'));
            await fs.remove(configFile);
            // --- MODIFICATION: Reset with all keys ---
            return { history: [], usageCount: 0, feedbackRequested: false, isFirstRun: true, sessionStats: {} };
            // --- END MODIFICATION ---
        }
    }
    // --- MODIFICATION: Reset with all keys ---
    return { history: [], usageCount: 0, feedbackRequested: false, isFirstRun: true, sessionStats: {} };
    // --- END MODIFICATION ---
}

async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

async function addToHistory(commandItem) {
    if (!commandItem || !commandItem.command) return;
    const config = await getConfig();
    const history = config.history || [];
    if (history.some(item => item.command === commandItem.command)) return;
    const enhancedItem = { ...commandItem, timestamp: new Date().toISOString() };
    history.unshift(enhancedItem);
    if (history.length > MAX_HISTORY) history.pop();
    await setConfig({ history });
}

async function handleFeedback() {
    const config = await getConfig();
    if ((config.usageCount || 0) >= USAGE_THRESHOLD_FOR_FEEDBACK && !config.feedbackRequested) {
        console.log(chalk.cyan.bold('\n--- We Value Your Feedback! ---'));
        console.log("You've used CCG many times. Would you mind sharing your thoughts to help us improve?");
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => rl.question(chalk.yellow('Open feedback form in browser? (y/N) '), resolve));
        rl.close();
        if (answer.toLowerCase() === 'y') {
            // --- MODIFICATION: Added fallback text ---
            console.log(chalk.cyan(`Opening: ${FEEDBACK_URL}`));
            await open(FEEDBACK_URL).catch(() => console.log(chalk.yellow('Could not open browser. Please visit the URL manually.')));
            // --- END MODIFICATION ---
        }
        await setConfig({ feedbackRequested: true });
    }
}

const showHelp = (config = {}) => {
    const { os: osDefault, shell: shellDefault, lang: langDefault, knowledgeLevel: levelDefault, deviceType: deviceDefault } = config;
    console.log(chalk.gray(String.raw`
________/\\\\\\\\\__________________/\\\\\\\\\_______________/\\\\\\\\\\\\_        
 _____/\\\////////________________/\\\////////______________/\\\//////////__       
  ___/\\\/_______________________/\\\/______________________/\\\_____________       
   __/\\\________________________/\\\_______________________\/\\\____/\\\\\\\_      
    _\/\\\_______________________\/\\\_______________________\/\\\___\/////\\\_     
     _\//\\\______________________\//\\\______________________\/\\\_______\/\\\_    
      __\///\\\_____________________\///\\\____________________\/\\\_______\/\\\_   
       ____\////\\\\\\\\\______________\////\\\\\\\\\___________\//\\\\\\\\\\\\/__  
        _______\/////////__________________\/////////_____________\////////////____ 
`));
    console.log(chalk.bold('\n                    (Cando Command Generator)\n'));
    console.log(`               This service belongs to ${chalk.yellow.bold('Cando Academy')} (cando.ac)`);
    console.log(`               Created and Run by ${chalk.white.bold('Amirhossein Yavari')}\n`);

    console.log(chalk.bold('CCG - Your AI-powered command assistant\n'));
    console.log(chalk.bold('Usage:'));
    console.log('  ccg <command> [options]\n');
    console.log(chalk.bold('Commands:'));
    console.log(`  ${chalk.green('generate <request>')}    Generate command suggestions        [alias: g]`);
    console.log(`  ${chalk.green('script <request>')}      Generate a full script              [alias: s]`);
    console.log(`  ${chalk.green('analyze <command>')}     Explain a command or script         [alias: a]`);
    console.log(`  ${chalk.green('error <message>')}       Get solutions for an error          [alias: e]`);
    console.log(`  ${chalk.green('compare <fileA> <fileB>')} Smart AI code compare             [alias: c]`); // New
    console.log(`  ${chalk.green('history')}               Show recently generated items       [alias: h]`);
    console.log(`  ${chalk.green('feedback')}               Provide feedback on the tool        [alias: f]`);
    console.log(`  ${chalk.green('config <action>')}       Manage settings (show, set, wizard)`);
    console.log(`  ${chalk.green('update')}                Update CCG to the latest version\n`);
    console.log(chalk.bold('Options (for generate, script, analyze, error):'));
    console.log(`  --os <os>             Platform (ubuntu, windows, cisco, etc.)      [default: ${chalk.yellow(osDefault || 'not set')}]`);
    console.log(`  --shell <shell>         Target shell (PowerShell, bash, CLI)         [default: ${chalk.yellow(shellDefault || 'not set')}]`);
    console.log(`  --lang <lang>           Response language (en, fa)                   [default: ${chalk.yellow(langDefault || 'en')}]`);
    console.log(`  --level <level>         Knowledge level (beginner, intermediate, expert) [default: ${chalk.yellow(levelDefault || 'intermediate')}]`);
    console.log(`  --device <device>       Device type for Cisco (router, switch, firewall) [default: ${chalk.yellow(deviceDefault || 'n/a')}]`);
    console.log(chalk.bold('Global Options:'));
    console.log(`  -h, --help            Show this help menu`);
    console.log(`  -v, --version         Show version number`);
};

const showWelcomeBanner = async () => {
    const config = await getConfig();
    if (config.isFirstRun === false) return;
    console.log(chalk.bold('\nWelcome to CCG (Cando Command Generator)!'));
    console.log('To get started, please run the setup wizard:');
    console.log(chalk.yellow('  ccg config wizard'));
    await setConfig({ isFirstRun: false });
};

const gracefulExit = () => {
    console.log(chalk.green(`\n🙏 Thank you for using CCG!`));
    process.exit(0);
};

// --- Updated OS Wizard ---
const runSetupWizard = async () => {
    console.log(chalk.cyan('\n--- CCG Setup Wizard ---'));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    // New OS list
    const osOptions = [
        'Ubuntu', 'Debian', 'Fedora', 'CentOS Stream', 'CentOS', 'Arch Linux',
        'Windows', 'macOS', 'Cisco', 'MikroTik', 'Python', 'Other'
    ];
    console.log('\nSelect your primary platform/OS:');
    osOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
    const osChoice = await question('> ');
    const selectedOsKey = osOptions[parseInt(osChoice) - 1]?.toLowerCase().replace(' ', '-') || 'other';

    let os, shell, deviceType = null, osVersion = ''; // osVersion is now optional

    if (selectedOsKey === 'other') {
        os = await question('Enter your OS name: ');
        osVersion = await question('Enter your OS version (optional): '); // Made optional
        shell = await question('Enter your Shell name: ');
    } else {
        os = selectedOsKey;
        const shellMap = {
            'ubuntu': ['bash', 'zsh'],
            'debian': ['bash', 'zsh'],
            'fedora': ['bash', 'zsh'],
            'centos-stream': ['bash', 'zsh'],
            'centos': ['bash', 'zsh'],
            'arch': ['bash', 'zsh'],
            'windows': ['PowerShell', 'CMD'],
            'macos': ['zsh', 'bash'],
            'cisco': ['CLI'],
            'mikrotik': ['MikroTik CLI'],
            'python': ['Python 3']
        };
        const shellOptions = shellMap[os];
        console.log(`\nSelect a Shell/Environment for ${os}:`);
        shellOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
        const shellChoice = await question('> ');
        shell = shellOptions[parseInt(shellChoice) - 1];

        // OS Version question is REMOVED for standard OSs

        if (os === 'cisco') {
            const deviceOptions = ['router', 'switch', 'firewall'];
            console.log('\nSelect the Cisco device type:');
            deviceOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
            const deviceChoice = await question('> ');
            deviceType = deviceOptions[parseInt(deviceChoice) - 1] || 'router';
        }
    }

    const levelOptions = ['beginner', 'intermediate', 'expert'];
    console.log('\nSelect your knowledge level:');
    levelOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
    const levelChoice = await question('> ');
    const knowledgeLevel = levelOptions[parseInt(levelChoice) - 1] || 'intermediate';

    const langOptions = ['en (English)', 'fa (Persian)'];
    console.log('\nSelect your preferred language:');
    langOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
    const langChoice = await question('> ');
    const selectedLang = ['en', 'fa'][parseInt(langChoice) - 1] || 'en';

    rl.close();
    const newConfig = { os, shell, osVersion, lang: selectedLang, knowledgeLevel, deviceType };
    await setConfig(newConfig);
    console.log(chalk.green(`\n✅ Configuration saved successfully!`));
    return newConfig;
};
// --- End of OS Wizard Update ---

const handleConfigCommand = async (action, key, value) => {
    const config = await getConfig();
    if (action === 'show') {
        console.log(chalk.bold('\nCurrent CCG Configuration:'));
        Object.entries(config).forEach(([k, v]) => {
            if (!['history', 'isFirstRun', 'sessionStats'].includes(k) && v) {
                console.log(`  ${chalk.cyan(k)}: ${chalk.yellow(String(v))}`);
            }
        });
    } else if (action === 'set') {
        if (!key || !value) return console.error(chalk.red('Error: "set" action requires a key and value.'));
        const validKeys = ['os', 'osVersion', 'shell', 'lang', 'knowledgeLevel', 'deviceType']; // osVersion is still valid
        if (validKeys.includes(key)) {
            await setConfig({ [key]: value });
            console.log(chalk.green(`✅ Success! Set "${key}" to "${value}".`));
        } else {
            console.error(chalk.red(`Error: Invalid key "${key}". Valid keys: ${validKeys.join(', ')}`));
        }
    } else {
        await runSetupWizard();
    }
};

let spinnerInterval;
const startSpinner = (message) => {
    if (spinnerInterval) return;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l');
    spinnerInterval = setInterval(() => {
        process.stdout.write(chalk.blue(`\r${frames[i++ % frames.length]} ${message}`));
    }, 80);
};

const stopSpinner = () => {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
    }
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    process.stdout.write('\x1B[?25h');
};

// --- MODIFICATION: Update Check based on usageCount % 50 ---
async function checkForUpdates() {
    const config = await getConfig();
    const usageCount = config.usageCount || 0;

    // Only check on first use (0) and every 50 uses (50, 100, 150...)
    if (usageCount !== 0 && (usageCount % 50 !== 0)) {
        return; // Not time to check
    }

    try {
        const response = await axios.get(`https://registry.npmjs.org/${packageName}/latest`, { timeout: 3000 });
        const latestVersion = response.data.version;

        if (semver.gt(latestVersion, currentVersion)) {
            console.log(chalk.green(`\n💡 New version available! (${currentVersion} -> ${latestVersion})`));
            console.log(`   Run ${chalk.cyan('ccg update')} to get the latest version.\n`);
        }
    } catch (error) {
        /* Silently fail, don't nag user on network error */
    }
}
// --- END MODIFICATION ---

// --- REMOVED old callApi function ---
// --- REMOVED primaryServerUrl and fallbackServerUrl constants ---

const executeCommand = (command, shell) => {
    return new Promise((resolve) => {
        const cleanedCommand = command.command.replace(/[*`]/g, '');
        console.log(chalk.magenta(`\n🚀 Executing: ${cleanedCommand}`));

        let child;
        if (process.platform === 'win32') {
            const shellCmd = shell?.toLowerCase().includes('powershell') ? 'powershell.exe' : 'cmd.exe';
            const shellArgs = shell?.toLowerCase().includes('powershell') ? ['-NoProfile', '-Command', cleanedCommand] : ['/C', cleanedCommand];
            child = spawn(shellCmd, shellArgs, { stdio: 'inherit' });
        } else {
            child = spawn(cleanedCommand, [], { stdio: 'inherit', shell: true });
        }
        child.on('close', (code) => {
            if (code !== 0) console.error(chalk.red(`\n❌ Process exited with code ${code}`));
            resolve();
        });
        child.on('error', (err) => {
            console.error(chalk.red(`\n❌ Failed to start process: ${err.message}`));
            resolve();
        });
    });
};

const run = async () => {
    let config = await getConfig();
    const args = hideBin(process.argv);

    if (args.length === 0 && config.isFirstRun !== false) {
        await showWelcomeBanner();
        process.exit(0);
    }

    const command = args[0]?.toLowerCase();

    // --- MODIFICATION: Moved Update Check ---
    // Run update check on every command *except* 'update' itself.
    // The function now has its own (usageCount % 50) throttle.
    if (command !== 'update') {
        await checkForUpdates();
    }
    // --- END MODIFICATION ---

    const needsConfig = !['config', 'update', 'feedback', 'f', 'compare', 'c', undefined, '--help', '-h', '--version', '-v'].includes(command);

    if (needsConfig && (!config.os || !config.shell)) {
        config = await runSetupWizard();
    }

    const parser = yargs(args)
        .scriptName("ccg")
        .help(false).version(false)
        .option('os', { type: 'string' }).option('shell', { type: 'string' }).option('lang', { type: 'string' })
        .option('level', { type: 'string' }).option('device', { type: 'string' }).option('debug', { type: 'boolean' })
        .command(['generate <request>', 'g'], 'Generate command suggestions', {}, async (argv) => {
            const context = { ...config, ...argv };
            if (context.os === 'cisco' && !context.device) {
                console.error(chalk.red('Error: --device is required for Cisco OS (e.g., --device router).'));
                process.exit(1);
            }

            // --- REFACTORED API CALL (Now uses v5 payload) ---
            startSpinner('Generating response...');
            const rawOutput = await sendToCCGServer({
                mode: 'generate',
                user_request: argv.request,
                os: context.os,
                lang: context.lang
                // Note: Extra fields are removed by apiService-cli.js
            });
            stopSpinner();
            // --- END REFACTOR ---

            if (rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput}`));
                process.exit(1);
            }

            const initialResult = parseAndConstructData(rawOutput, 'generate', context.shell);

            if (!initialResult?.commands?.length) {
                console.log(chalk.red("\n❌ Failed to generate valid commands."));
                process.exit(1);
            }

            await setConfig({ usageCount: (config.usageCount || 0) + 1 });

            const startInteractiveSession = async () => {
                let allCommands = initialResult.commands;
                await Promise.all(allCommands.map(cmd => addToHistory(cmd)));
                displayNewSuggestions(allCommands.map((cmd, idx) => ({ ...cmd, displayIndex: idx + 1 })), true);

                while (true) {
                    const choice = await promptUser(allCommands);
                    if (choice.type === 'execute') {
                        await executeCommand(allCommands[choice.index], context.shell);
                        gracefulExit(); return;
                    } else if (choice.type === 'more') {
                        const newCmds = await getMoreSuggestions(argv.request, allCommands, context);
                        const uniqueNewCmds = newCmds.filter(newCmd => !allCommands.some(existingCmd => existingCmd.command === newCmd.command));

                        if (uniqueNewCmds.length > 0) {
                            await Promise.all(uniqueNewCmds.map(cmd => addToHistory(cmd)));
                            const startIndex = allCommands.length;
                            allCommands.push(...uniqueNewCmds);
                            displayNewSuggestions(uniqueNewCmds.map((cmd, idx) => ({ ...cmd, displayIndex: startIndex + idx + 1 })), false);
                        } else {
                            console.log(chalk.yellow("Couldn't find any new suggestions. Try rephrasing your request."));
                        }
                    } else if (choice.type === 'quit') {
                        gracefulExit(); return;
                    }
                }
            };
            const displayNewSuggestions = (suggestions, isFirstTime) => {
                suggestions.forEach((cmd) => {
                    console.log(`\n${chalk.cyan.bold(`Suggestion #${cmd.displayIndex}`)}:\n  ${chalk.green(cmd.command)}\n  └─ Explanation: ${cmd.explanation}`);
                    if (cmd.warning) console.log(`  └─ ${chalk.yellow.bold('Warning:')} ${chalk.yellow(cmd.warning)}`);
                });
                if (isFirstTime) console.warn(chalk.red.bold('\n🚨 WARNING: Executing AI-generated commands can be dangerous. Review them carefully.'));
            };
            const getMoreSuggestions = async (request, allCommands, context) => {
                console.log(chalk.blue("\n🔄 Getting more suggestions..."));

                // --- REFACTORED API CALL (Now uses v5 payload) ---
                startSpinner('Generating response...');
                const rawOutput = await sendToCCGServer({
                    mode: 'generate',
                    user_request: request,
                    os: context.os,
                    lang: context.lang
                    // Note: Extra fields are removed by apiService-cli.js
                });
                stopSpinner();
                // --- END REFACTOR ---

                if (rawOutput.startsWith('⚠️')) {
                    console.log(chalk.red(`\n❌ API Error: ${rawOutput}`));
                    return [];
                }

                const result = parseAndConstructData(rawOutput, 'generate', context.shell);
                return result?.commands || [];
            };
            const promptUser = (commands) => new Promise(resolve => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question(chalk.bold(`\nEnter a number (1-${commands.length}), (m)ore, or (q)uit: `), (choice) => {
                    rl.close();
                    choice = choice.toLowerCase().trim();
                    if (choice === 'm') return resolve({ type: 'more' });
                    if (choice === 'q' || choice === '') return resolve({ type: 'quit' });
                    const index = parseInt(choice, 10) - 1;
                    if (index >= 0 && index < commands.length) {
                        const confirmRl = readline.createInterface({ input: process.stdin, output: process.stdout });
                        confirmRl.question(chalk.yellow(`\nExecute: "${chalk.cyan(commands[index].command)}"? [y/N] `), answer => {
                            confirmRl.close();
                            resolve(answer.toLowerCase() === 'y' ? { type: 'execute', index } : { type: 'reprompt' });
                        });
                    } else {
                        console.log(chalk.red('\nInvalid choice.'));
                        resolve({ type: 'reprompt' });
                    }
                });
            });
            await startInteractiveSession();
        })
        .command(['script <request>', 's'], 'Generate a full script', {}, async (argv) => {
            const { os, lang, request } = { ...config, ...argv };

            // --- REFACTORED API CALL (v5) ---
            startSpinner('Generating response...');
            const rawOutput = await sendToCCGServer({
                mode: 'script',
                user_request: request,
                os,
                lang
            });
            stopSpinner();
            // --- END REFACTOR ---

            if (rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput}`));
                gracefulExit();
                return;
            }

            const result = parseAndConstructData(rawOutput, 'script', config.shell);

            if (result?.explanation) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                console.log(chalk.cyan.bold('\n--- Generated Script ---'));
                console.log(chalk.green(result.explanation));
                await addToHistory({ command: result.explanation, explanation: `Script for: "${request}"` });
            } else { console.log(chalk.red("\n❌ Failed to generate a script.")); }
            gracefulExit();
        })
        .command(['analyze <command>', 'a'], 'Explain a command', {}, async (argv) => {
            const { os, lang, command } = { ...config, ...argv };

            // --- REFACTORED API CALL (v5) ---
            startSpinner('Generating response...');
            const rawOutput = await sendToCCGServer({
                mode: 'analyze', // <-- Mode changed from 'explain'
                user_request: command,
                os,
                lang
            });
            stopSpinner();
            // --- END REFACTOR ---

            if (rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput}`));
                gracefulExit();
                return;
            }

            const result = parseAndConstructData(rawOutput, 'explain', config.shell); // Parser still uses 'explain'

            if (result?.explanation) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                console.log(chalk.cyan.bold('\n--- Analysis ---'));
                console.log(result.explanation);
            } else { console.log(chalk.red("\n❌ Failed to get an explanation.")); }
            gracefulExit();
        })
        .command(['error <message>', 'e'], 'Get help for an error', {}, async (argv) => {
            const { os, lang, message } = { ...config, ...argv };

            // --- REFACTORED API CALL (v5) ---
            startSpinner('Generating response...');
            const rawOutput = await sendToCCGServer({
                mode: 'error',
                error_message: message, // <-- Param name changed
                os,
                lang
            });
            stopSpinner();
            // --- END REFACTOR ---

            if (rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput}`));
                gracefulExit();
                return;
            }

            const result = parseAndConstructData(rawOutput, 'error', config.shell);

            if (result?.cause) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                console.log(chalk.red.bold('\nProbable Cause:'), result.cause);
                console.log(chalk.yellow.bold('\nExplanation:'), result.explanation);
                if (result.solution?.length) {
                    console.log(chalk.green.bold('\nSolution:'));
                    result.solution.forEach(step => console.log(`  - ${step.replace(/^CMD: /i, chalk.cyan('Run: '))}`));
                }
            } else { console.log(chalk.red("\n❌ Failed to analyze the error.")); }
            gracefulExit();
        })
        // --- 'compare' COMMAND ---
        .command(['compare <fileA> <fileB>', 'c'], 'Compare two code files with AI', {}, async (argv) => {
            const { fileA, fileB, lang } = { ...config, ...argv };

            let contentA, contentB;
            try {
                const pathA = path.resolve(fileA);
                const pathB = path.resolve(fileB);
                if (!await fs.pathExists(pathA)) throw new Error(`File not found: ${fileA}`);
                if (!await fs.pathExists(pathB)) throw new Error(`File not found: ${fileB}`);

                contentA = await fs.readFile(pathA, 'utf-8');
                contentB = await fs.readFile(pathB, 'utf-8');
            } catch (err) {
                console.error(chalk.red(`\n❌ Error reading files: ${err.message}`));
                process.exit(1);
            }

            if (!contentA.trim() || !contentB.trim()) {
                console.error(chalk.red(`\n❌ Error: One or both files are empty.`));
                process.exit(1);
            }

            await setConfig({ usageCount: (config.usageCount || 0) + 1 });

            // --- REFACTORED: Pass sendToCCGServer ---
            // Note: codeCompare.js passes extra fields, but apiService-cli.js filters them
            // before sending the v5 payload.
            await runComparer(contentA, contentB, { lang: lang || 'en' }, config, sendToCCGServer, startSpinner, stopSpinner);
            gracefulExit();
        })
        // --- End of 'compare' command ---
        .command('config [action] [key] [value]', 'Manage settings', {}, (argv) => handleConfigCommand(argv.action, argv.key, argv.value))
        .command(['history', 'h'], 'Show command history', {}, async () => {
            const config = await getConfig();
            const history = config.history || [];
            if (history.length === 0) return console.log(chalk.yellow('No history found.'));
            console.log(chalk.cyan.bold('--- Command History ---'));
            history.forEach((item, index) => {
                console.log(`\n${chalk.cyan.bold(`#${index + 1}`)} [${new Date(item.timestamp).toLocaleString()}]`);
                console.log(`  ${chalk.dim(item.explanation)}`);
                console.log(item.command.includes('\n') ? chalk.gray(item.command) : `  ${chalk.green(item.command)}`);
            });
        })
        .command('update', 'Update CCG to the latest version', {}, () => {
            console.log(chalk.cyan('Attempting to update CCG via npm...'));
            const command = `npm install -g ${packageName}`;
            const fullCommand = process.platform !== 'win32' && process.getuid() !== 0 ? `sudo ${command}` : command;

            console.log(chalk.yellow(`Executing: ${fullCommand}`));
            if (fullCommand.startsWith('sudo')) {
                console.log(chalk.yellow('You may be prompted for your password.'));
            }

            const child = spawn(fullCommand, [], { stdio: 'inherit', shell: true });
            child.on('close', code => {
                if (code === 0) {
                    console.log(chalk.green('\n✅ CCG updated successfully!'));
                } else {
                    console.error(chalk.red(`\n❌ Update failed with code ${code}. Please try running the command manually.`));
                }
                process.exit(code);
            });
        })
        .command(['feedback', 'f'], 'Provide feedback on the tool', {}, async () => {
            // --- MODIFICATION: Added fallback text ---
            console.log(chalk.cyan(`Opening: ${FEEDBACK_URL}`));
            await open(FEEDBACK_URL).catch(() => console.log(chalk.yellow('Please visit: ' + FEEDBACK_URL)));
            // --- END MODIFICATION ---
            gracefulExit();
        });

    const argv = await parser.argv;

    if (argv.help || (args.length === 0 && !parser.parsed.defaultCommand)) {
        showHelp(config);
    } else if (argv.version) {
        console.log(currentVersion);
    }

    // --- MODIFICATION: Moved Feedback Check ---
    // Handle feedback check *after* a command has been processed,
    // but not for auxiliary commands.
    if (command && !['config', 'update', 'feedback', 'f', 'history', 'h', undefined, '--help', '-h', '--version', '-v'].includes(command)) {
        await handleFeedback();
    }
    // --- END MODIFICATION ---
};

run().catch(err => {
    stopSpinner();
    console.error(chalk.red(`\nA critical error occurred: ${err.message}`));
    if (process.argv.includes('--debug')) {
        console.error(err.stack);
    }
    process.exit(1);
});
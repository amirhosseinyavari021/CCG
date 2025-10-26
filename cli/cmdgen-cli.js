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

const { sendToCCGServer } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const { runComparer } = require('./modules/codeCompare.js');

const packageJson = require('./package.json');
const currentVersion = packageJson.version;
const packageName = packageJson.name;

const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=dialog';
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
            if (!config.sessionStats) config.sessionStats = {};
            if (config.usageCount === undefined) config.usageCount = 0;
            if (config.feedbackRequested === undefined) config.feedbackRequested = false;
            if (config.isFirstRun === undefined) config.isFirstRun = false; // Keep default as false after first run
            if (config.last_update_check) delete config.last_update_check;
            return config;
        } catch (error) {
            console.error(chalk.yellow('Warning: Configuration file was corrupted and has been reset.'));
            await fs.remove(configFile);
            return { history: [], usageCount: 0, feedbackRequested: false, isFirstRun: true, sessionStats: {} }; // Set isFirstRun to true on reset
        }
    }
    return { history: [], usageCount: 0, feedbackRequested: false, isFirstRun: true, sessionStats: {} }; // Set isFirstRun to true for new config
}

async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

async function addToHistory(commandItem) {
    if (!commandItem || !commandItem.command) return;
    const config = await getConfig();
    const history = config.history || [];
    // Prevent adding exact duplicates
    if (history.some(item => item.command === commandItem.command && item.explanation === commandItem.explanation)) return;
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
            console.log(chalk.cyan(`Opening: ${FEEDBACK_URL}`));
            await open(FEEDBACK_URL).catch(() => console.log(chalk.yellow('Could not open browser. Please visit the URL manually.')));
        } else {
            console.log("Okay, maybe next time!");
        }
        await setConfig({ feedbackRequested: true }); // Mark as requested regardless of answer
    }
}


const showHelp = (config = {}) => {
    const { os: osDefault, shell: shellDefault, lang: langDefault, knowledgeLevel: levelDefault, deviceType: deviceDefault } = config;
    // ... (ASCII art remains the same) ...
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
    console.log(`  ${chalk.green('compare <fileA> <fileB>')} Smart AI code compare             [alias: c]`);
    console.log(`  ${chalk.green('history')}               Show recently generated items       [alias: h]`);
    console.log(`  ${chalk.green('feedback')}               Provide feedback on the tool        [alias: f]`);
    console.log(`  ${chalk.green('config <action>')}       Manage settings (show, set, wizard)`);
    console.log(`  ${chalk.green('update')}                Update CCG to the latest version\n`);
    console.log(chalk.bold('Options (for generate, script, analyze, error):'));
    console.log(`  --os <os>             Platform (ubuntu, windows, cisco, mikrotik, fortigate, etc.) [default: ${chalk.yellow(osDefault || 'not set')}]`);
    console.log(`  --shell <shell>         Target shell (PowerShell, bash, CLI, etc.)            [default: ${chalk.yellow(shellDefault || 'not set')}]`);
    console.log(`  --lang <lang>           Response language (en, fa)                   [default: ${chalk.yellow(langDefault || 'en')}]`);
    console.log(`  --level <level>         Knowledge level (beginner, intermediate, expert) [default: ${chalk.yellow(levelDefault || 'intermediate')}]`);
    console.log(`  --device <device>       Device type for Cisco (router, switch, firewall) [default: ${chalk.yellow(deviceDefault || 'n/a')}]`);
    console.log(chalk.bold('Global Options:'));
    console.log(`  -h, --help            Show this help menu`);
    console.log(`  -v, --version         Show version number`);
};

const showWelcomeBanner = async () => {
    const config = await getConfig();
    if (config.isFirstRun === false) return; // Only show if isFirstRun is strictly true
    console.log(chalk.bold('\nWelcome to CCG (Cando Command Generator)!'));
    console.log('To get started, please run the setup wizard:');
    console.log(chalk.yellow('  ccg config wizard'));
    await setConfig({ isFirstRun: false }); // Set to false after showing
};

const gracefulExit = () => {
    console.log(chalk.green(`\n🙏 Thank you for using CCG!`));
    process.exit(0);
};

const runSetupWizard = async () => {
    console.log(chalk.cyan('\n--- CCG Setup Wizard ---'));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    // Updated OS list
    const osOptions = [
        'Ubuntu', 'Debian', 'Fedora', /*'CentOS Stream',*/ 'CentOS', 'Arch Linux', // CentOS Stream removed
        'Windows', 'macOS', 'Cisco', 'MikroTik', 'FortiGate', 'Python', 'Other' // MikroTik, FortiGate added
    ];
    console.log('\nSelect your primary platform/OS:');
    osOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));

    let osChoiceIndex = -1;
    while (osChoiceIndex < 0 || osChoiceIndex >= osOptions.length) {
        const osChoiceRaw = await question('> ');
        const parsedChoice = parseInt(osChoiceRaw);
        if (!isNaN(parsedChoice) && parsedChoice > 0 && parsedChoice <= osOptions.length) {
            osChoiceIndex = parsedChoice - 1;
        } else {
            console.log(chalk.red('Invalid selection. Please enter a number from the list.'));
        }
    }
    const selectedOsKey = osOptions[osChoiceIndex]?.toLowerCase().replace(' ', '-') || 'other';


    let os, shell, deviceType = null, osVersion = '';

    if (selectedOsKey === 'other') {
        os = await question('Enter your OS name: ');
        osVersion = await question('Enter your OS version (optional): ');
        shell = await question('Enter your Shell name: ');
    } else {
        os = selectedOsKey;
        const shellMap = {
            'ubuntu': ['bash', 'zsh'],
            'debian': ['bash', 'zsh'],
            'fedora': ['bash', 'zsh'],
            // 'centos-stream': ['bash', 'zsh'], // Removed
            'centos': ['bash', 'zsh'],
            'arch-linux': ['bash', 'zsh'], // Corrected key for Arch
            'windows': ['PowerShell', 'CMD'],
            'macos': ['zsh', 'bash'],
            'cisco': ['CLI'],
            'mikrotik': ['MikroTik CLI'], // Added
            'fortigate': ['FortiOS CLI'], // Added
            'python': ['Python 3']
        };
        const shellOptions = shellMap[os] || ['Default']; // Fallback
        console.log(`\nSelect a Shell/Environment for ${os}:`);
        shellOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));

        let shellChoiceIndex = -1;
        while (shellChoiceIndex < 0 || shellChoiceIndex >= shellOptions.length) {
            const shellChoiceRaw = await question('> ');
            const parsedChoice = parseInt(shellChoiceRaw);
            if (!isNaN(parsedChoice) && parsedChoice > 0 && parsedChoice <= shellOptions.length) {
                shellChoiceIndex = parsedChoice - 1;
            } else {
                console.log(chalk.red('Invalid selection. Please enter a number from the list.'));
            }
        }
        shell = shellOptions[shellChoiceIndex];


        if (os === 'cisco') {
            const deviceOptions = ['router', 'switch', 'firewall'];
            console.log('\nSelect the Cisco device type:');
            deviceOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));

            let deviceChoiceIndex = -1;
            while (deviceChoiceIndex < 0 || deviceChoiceIndex >= deviceOptions.length) {
                const deviceChoiceRaw = await question('> ');
                const parsedChoice = parseInt(deviceChoiceRaw);
                if (!isNaN(parsedChoice) && parsedChoice > 0 && parsedChoice <= deviceOptions.length) {
                    deviceChoiceIndex = parsedChoice - 1;
                } else {
                    console.log(chalk.red('Invalid selection. Please enter a number from the list.'));
                }
            }
            deviceType = deviceOptions[deviceChoiceIndex];
        }
        // Add similar logic for FortiGate if specific device types are needed later
    }

    const levelOptions = ['beginner', 'intermediate', 'expert'];
    console.log('\nSelect your knowledge level:');
    levelOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
    let levelChoiceIndex = -1;
    while (levelChoiceIndex < 0 || levelChoiceIndex >= levelOptions.length) {
        const levelChoiceRaw = await question('> ');
        const parsedChoice = parseInt(levelChoiceRaw);
        if (!isNaN(parsedChoice) && parsedChoice > 0 && parsedChoice <= levelOptions.length) {
            levelChoiceIndex = parsedChoice - 1;
        } else {
            console.log(chalk.red('Invalid selection. Please enter a number from the list.'));
        }
    }
    const knowledgeLevel = levelOptions[levelChoiceIndex];


    const langOptions = ['en (English)', 'fa (Persian)'];
    console.log('\nSelect your preferred language:');
    langOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
    let langChoiceIndex = -1;
    while (langChoiceIndex < 0 || langChoiceIndex >= langOptions.length) {
        const langChoiceRaw = await question('> ');
        const parsedChoice = parseInt(langChoiceRaw);
        if (!isNaN(parsedChoice) && parsedChoice > 0 && parsedChoice <= langOptions.length) {
            langChoiceIndex = parsedChoice - 1;
        } else {
            console.log(chalk.red('Invalid selection. Please enter a number from the list.'));
        }
    }
    const selectedLang = ['en', 'fa'][langChoiceIndex];


    rl.close();
    const newConfig = { os, shell, osVersion, lang: selectedLang, knowledgeLevel, deviceType };
    await setConfig(newConfig);
    console.log(chalk.green(`\n✅ Configuration saved successfully!`));
    return newConfig;
};

const handleConfigCommand = async (action, key, value) => {
    const config = await getConfig();
    action = action?.toLowerCase() || 'show'; // Default to 'show' if no action

    if (action === 'show') {
        console.log(chalk.bold('\nCurrent CCG Configuration:'));
        const displayConfig = { ...config };
        // Clean up internal keys before display
        delete displayConfig.history;
        delete displayConfig.isFirstRun;
        delete displayConfig.sessionStats;
        delete displayConfig.feedbackRequested;
        delete displayConfig.usageCount;

        if (Object.keys(displayConfig).length === 0) {
            console.log(chalk.yellow('  No configuration set. Run "ccg config wizard".'));
            return;
        }

        Object.entries(displayConfig).forEach(([k, v]) => {
            if (v) { // Only show keys that have a value
                console.log(`  ${chalk.cyan(k)}: ${chalk.yellow(String(v))}`);
            }
        });
    } else if (action === 'set') {
        if (!key || value === undefined) return console.error(chalk.red('Error: "set" action requires a key and value (e.g., ccg config set os ubuntu).'));
        const validKeys = ['os', 'osVersion', 'shell', 'lang', 'knowledgeLevel', 'deviceType'];
        if (validKeys.includes(key)) {
            await setConfig({ [key]: value });
            console.log(chalk.green(`✅ Success! Set "${key}" to "${value}".`));
        } else {
            console.error(chalk.red(`Error: Invalid key "${key}". Valid keys: ${validKeys.join(', ')}`));
        }
    } else if (action === 'wizard') {
        await runSetupWizard();
    } else {
        console.error(chalk.red(`Error: Unknown config action "${action}". Use 'show', 'set', or 'wizard'.`));
    }
};

let spinnerInterval;
const startSpinner = (message) => {
    if (spinnerInterval) return;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l'); // Hide cursor
    spinnerInterval = setInterval(() => {
        process.stdout.write(chalk.blue(`\r${frames[i++ % frames.length]} ${message}`));
    }, 80);
};

const stopSpinner = () => {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
        process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 50) + '\r'); // Clear line
        process.stdout.write('\x1B[?25h'); // Show cursor
    }
};

async function checkForUpdates() {
    const config = await getConfig();
    const usageCount = config.usageCount || 0;

    // Only check on first use (0) and every ~50 uses thereafter
    if (usageCount !== 0 && (usageCount % 50 !== 0)) {
        return;
    }

    try {
        console.log(chalk.dim('\nChecking for updates...'));
        const response = await axios.get(`https://registry.npmjs.org/${packageName}/latest`, { timeout: 3000 });
        const latestVersion = response.data.version;

        if (semver.gt(latestVersion, currentVersion)) {
            console.log(chalk.green(`\n💡 New version available! (${currentVersion} -> ${latestVersion})`));
            console.log(`   Run ${chalk.cyan('ccg update')} to get the latest version.\n`);
        } else {
            console.log(chalk.dim('You have the latest version.'));
        }
    } catch (error) {
        // Silently fail, don't nag user on network error
        console.log(chalk.dim('Update check failed.'));
    }
}

const executeCommand = (command, shell) => {
    return new Promise((resolve) => {
        // Ensure command is an object with a 'command' property
        const cmdToExecute = command?.command || '';
        const cleanedCommand = cmdToExecute.replace(/[*`]/g, '');

        if (!cleanedCommand) {
            console.error(chalk.red('\n❌ Invalid command provided for execution.'));
            resolve();
            return;
        }

        console.log(chalk.magenta(`\n🚀 Executing: ${cleanedCommand}`));

        let child;
        try {
            if (process.platform === 'win32') {
                const shellCmd = shell?.toLowerCase().includes('powershell') ? 'powershell.exe' : 'cmd.exe';
                const shellArgs = shell?.toLowerCase().includes('powershell') ? ['-NoProfile', '-Command', cleanedCommand] : ['/C', cleanedCommand];
                child = spawn(shellCmd, shellArgs, { stdio: 'inherit' });
            } else {
                // Use shell: true for better compatibility with pipes, redirections etc. on Unix-like systems
                child = spawn(cleanedCommand, [], { stdio: 'inherit', shell: true });
            }

            child.on('close', (code) => {
                if (code !== 0) console.error(chalk.red(`\n❌ Process exited with code ${code}`));
                resolve();
            });
            child.on('error', (err) => {
                console.error(chalk.red(`\n❌ Failed to start process: ${err.message}`));
                resolve(); // Resolve even on error to continue the flow
            });
        } catch (spawnError) {
            console.error(chalk.red(`\n❌ Error spawning process: ${spawnError.message}`));
            resolve();
        }
    });
};

const run = async () => {
    let config = await getConfig();
    const args = hideBin(process.argv);

    // Show welcome banner only on the very first run
    if (args.length === 0 && config.isFirstRun === true) {
        await showWelcomeBanner();
        process.exit(0);
    }
    // Handle case where config exists but isFirstRun might be undefined (legacy)
    if (args.length === 0 && config.isFirstRun === undefined) {
        await showWelcomeBanner(); // Show it and set isFirstRun to false
        process.exit(0);
    }


    const parser = yargs(args)
        .scriptName("ccg")
        .usage('Usage: ccg <command> [options]')
        // FIX for -v: Enable default version behavior
        .version(currentVersion)
        .alias('v', 'version')
        // Keep help disabled to use custom showHelp
        .help(false)
        .alias('h', 'help')
        .option('os', { type: 'string', description: 'Platform/OS (e.g., ubuntu, windows, cisco)' })
        .option('shell', { type: 'string', description: 'Target shell (e.g., bash, PowerShell, CLI)' })
        .option('lang', { type: 'string', description: 'Response language (en, fa)', default: config.lang || 'en' })
        .option('level', { type: 'string', description: 'Knowledge level (beginner, intermediate, expert)', default: config.knowledgeLevel || 'intermediate' })
        .option('device', { type: 'string', description: 'Device type (for Cisco: router, switch, firewall)' })
        .option('debug', { type: 'boolean', description: 'Show debug information' })
        // --- Commands ---
        .command(['generate <request>', 'g'], 'Generate command suggestions', {}, async (argv) => {
            // Combine CLI args with config, CLI args take precedence
            const context = { ...config, ...argv };
            // Ensure required OS/Shell are set either via config or args
            if (!context.os || !context.shell) {
                console.log(chalk.red('Error: OS and Shell must be configured or provided via options.'));
                console.log(chalk.yellow('Run "ccg config wizard" to set defaults.'));
                process.exit(1);
            }
            if (context.os.toLowerCase() === 'cisco' && !context.device && !config.deviceType) {
                console.error(chalk.red('Error: --device is required for Cisco OS (e.g., --device router). Set a default with "ccg config set device router".'));
                process.exit(1);
            }
            if (context.os.toLowerCase() === 'cisco' && !context.device) {
                context.device = config.deviceType; // Use default if set
            }


            startSpinner('Generating response...');
            const rawOutput = await sendToCCGServer({
                mode: 'generate',
                user_request: argv.request,
                os: context.os,
                lang: context.lang,
                // Pass other context fields
                shell: context.shell,
                knowledgeLevel: context.level,
                deviceType: context.device
            });
            stopSpinner();

            if (!rawOutput || rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput || 'No response from server.'}`));
                process.exit(1);
            }

            const initialResult = parseAndConstructData(rawOutput, 'generate', context.shell);

            if (!initialResult?.commands?.length) {
                console.log(chalk.red("\n❌ Failed to generate valid commands. The response might be malformed or empty."));
                if (argv.debug) console.log("Raw Response:\n", rawOutput);
                process.exit(1);
            }

            // Increment usage count only on successful generation
            await setConfig({ usageCount: (config.usageCount || 0) + 1 });
            await handleFeedback(); // Check for feedback after successful use


            const startInteractiveSession = async () => {
                let allCommands = initialResult.commands;
                // Add initial suggestions to history
                await Promise.all(allCommands.map(cmd => addToHistory({ command: cmd.command, explanation: cmd.explanation })));


                displayNewSuggestions(allCommands.map((cmd, idx) => ({ ...cmd, displayIndex: idx + 1 })), true);

                let continueSession = true;
                while (continueSession) {
                    const choice = await promptUser(allCommands);
                    switch (choice.type) {
                        case 'execute':
                            await executeCommand(allCommands[choice.index], context.shell);
                            continueSession = false; // Exit after execution
                            gracefulExit();
                            break;
                        case 'more':
                            startSpinner('Getting more suggestions...');
                            const newCmds = await getMoreSuggestions(argv.request, allCommands, context);
                            stopSpinner();
                            const uniqueNewCmds = newCmds.filter(newCmd =>
                                !allCommands.some(existingCmd => existingCmd.command === newCmd.command)
                            );

                            if (uniqueNewCmds.length > 0) {
                                // Add new suggestions to history
                                await Promise.all(uniqueNewCmds.map(cmd => addToHistory({ command: cmd.command, explanation: cmd.explanation })));

                                const startIndex = allCommands.length;
                                allCommands.push(...uniqueNewCmds);
                                displayNewSuggestions(uniqueNewCmds.map((cmd, idx) => ({ ...cmd, displayIndex: startIndex + idx + 1 })), false);
                            } else {
                                console.log(chalk.yellow("Couldn't find any substantially new suggestions. Try rephrasing your request."));
                            }
                            break; // Continue loop after getting more or failing
                        case 'quit':
                            continueSession = false;
                            gracefulExit();
                            break;
                        case 'reprompt':
                        default:
                            // Just loop again to reprompt
                            break;
                    }
                }
            };

            const displayNewSuggestions = (suggestions, isFirstTime) => {
                suggestions.forEach((cmd) => {
                    console.log(`\n${chalk.cyan.bold(`Suggestion #${cmd.displayIndex}`)}:\n  ${chalk.green(cmd.command)}\n  └─ Explanation: ${cmd.explanation}`);
                    if (cmd.warning) console.log(`  └─ ${chalk.yellow.bold('Warning:')} ${chalk.yellow(cmd.warning)}`);
                });
                if (isFirstTime) console.warn(chalk.red.bold('\n🚨 WARNING: Executing AI-generated commands can be dangerous. Review them carefully before executing.'));
            };

            const getMoreSuggestions = async (request, existingCommandsList, context) => {
                const existingCommandStrings = existingCommandsList.map(c => c.command);
                const rawOutput = await sendToCCGServer({
                    mode: 'generate',
                    user_request: request,
                    os: context.os,
                    lang: context.lang,
                    // Pass other context fields
                    shell: context.shell,
                    knowledgeLevel: context.level,
                    deviceType: context.device,
                    existingCommands: existingCommandStrings // Send existing commands to AI
                });

                if (rawOutput.startsWith('⚠️')) {
                    console.log(chalk.red(`\n❌ API Error: ${rawOutput}`));
                    return [];
                }

                const result = parseAndConstructData(rawOutput, 'generate', context.shell);
                return result?.commands || [];
            };

            const promptUser = (commands) => new Promise(resolve => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question(chalk.bold(`\nEnter suggestion number (1-${commands.length}) to execute, (m)ore suggestions, or (q)uit: `), (choice) => {
                    rl.close();
                    choice = choice.toLowerCase().trim();
                    if (choice === 'm') return resolve({ type: 'more' });
                    if (choice === 'q' || choice === '') return resolve({ type: 'quit' });

                    const index = parseInt(choice, 10) - 1;
                    if (!isNaN(index) && index >= 0 && index < commands.length) {
                        // Removed the extra confirmation step for faster execution
                        resolve({ type: 'execute', index });
                    } else {
                        console.log(chalk.red('\nInvalid choice. Please enter a valid number, "m", or "q".'));
                        resolve({ type: 'reprompt' }); // Signal to reprompt the user
                    }
                });
            });

            await startInteractiveSession();
        })
        .command(['script <request>', 's'], 'Generate a full script', {}, async (argv) => {
            const context = { ...config, ...argv };
            if (!context.os || !context.shell) {
                console.log(chalk.red('Error: OS and Shell must be configured or provided via options.'));
                console.log(chalk.yellow('Run "ccg config wizard" to set defaults.'));
                process.exit(1);
            }

            startSpinner('Generating script...');
            const rawOutput = await sendToCCGServer({
                mode: 'script',
                user_request: argv.request,
                os: context.os,
                lang: context.lang,
                shell: context.shell,
                knowledgeLevel: context.level,
                deviceType: context.device
            });
            stopSpinner();

            if (!rawOutput || rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput || 'No response from server.'}`));
                gracefulExit(); return;
            }

            // The parser for script mode just returns the explanation field containing the script
            const result = parseAndConstructData(rawOutput, 'script');

            if (result?.explanation) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                await handleFeedback();

                console.log(chalk.cyan.bold('\n--- Generated Script ---'));
                console.log(chalk.green(result.explanation)); // Print the script directly
                // Add script generation request to history for context
                await addToHistory({ command: result.explanation, explanation: `Script generated for: "${argv.request}" in ${context.os}/${context.shell}` });

            } else {
                console.log(chalk.red("\n❌ Failed to generate a script."));
                if (argv.debug) console.log("Raw Response:\n", rawOutput);
            }
            gracefulExit();
        })
        .command(['analyze <command>', 'a'], 'Explain a command or script', {}, async (argv) => {
            const context = { ...config, ...argv };
            // OS/Shell less critical for analyze but good for context
            if (!context.os) {
                console.log(chalk.yellow('Warning: OS not specified. Analysis might be less accurate. Run "ccg config wizard" or use --os.'));
            }

            startSpinner('Analyzing command...');
            const rawOutput = await sendToCCGServer({
                mode: 'analyze', // Use 'analyze' mode for consistency
                user_request: argv.command, // The command to analyze
                os: context.os,
                lang: context.lang,
                shell: context.shell,
                knowledgeLevel: context.level,
                deviceType: context.device
            });
            stopSpinner();

            if (!rawOutput || rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput || 'No response from server.'}`));
                gracefulExit(); return;
            }

            // Use 'explain' mode for parsing the analysis/explanation response
            const result = parseAndConstructData(rawOutput, 'explain');

            if (result?.explanation) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                await handleFeedback();
                console.log(chalk.cyan.bold('\n--- Analysis ---'));
                console.log(result.explanation); // Print the explanation
                // Add analysis request to history
                await addToHistory({ command: argv.command, explanation: `Analyzed command with explanation: ${result.explanation.substring(0, 100)}...` });
            } else {
                console.log(chalk.red("\n❌ Failed to get an explanation."));
                if (argv.debug) console.log("Raw Response:\n", rawOutput);
            }
            gracefulExit();
        })
        .command(['error <message>', 'e'], 'Get help for an error message', {}, async (argv) => {
            const context = { ...config, ...argv };
            // OS/Shell less critical for error analysis but good for context
            if (!context.os) {
                console.log(chalk.yellow('Warning: OS not specified. Error analysis might be less accurate. Run "ccg config wizard" or use --os.'));
            }

            startSpinner('Analyzing error...');
            const rawOutput = await sendToCCGServer({
                mode: 'error',
                error_message: argv.message, // The error message
                os: context.os,
                lang: context.lang,
                shell: context.shell,
                knowledgeLevel: context.level,
                deviceType: context.device
                // Consider adding an optional field for user context about the error
            });
            stopSpinner();

            if (!rawOutput || rawOutput.startsWith('⚠️')) {
                console.log(chalk.red(`\n❌ API Error: ${rawOutput || 'No response from server.'}`));
                gracefulExit(); return;
            }

            const result = parseAndConstructData(rawOutput, 'error');

            if (result?.cause || result?.explanation) { // Check if either cause or explanation exists
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                await handleFeedback();

                console.log(chalk.cyan.bold('\n--- Error Analysis ---'));
                if (result.cause) console.log(chalk.red.bold('\nProbable Cause:'), result.cause);
                if (result.explanation) console.log(chalk.yellow.bold('\nExplanation:'), result.explanation);

                if (result.solution?.length) {
                    console.log(chalk.green.bold('\nSuggested Solution:'));
                    result.solution.forEach(step => {
                        // Check if step starts with CMD: (case-insensitive) and highlight
                        if (step.match(/^CMD:\s*/i)) {
                            console.log(`  - ${chalk.cyan('Run: ')} ${step.replace(/^CMD:\s*/i, '')}`);
                        } else {
                            console.log(`  - ${step}`);
                        }
                    });
                }
                // Add error analysis request to history
                await addToHistory({ command: argv.message, explanation: `Analyzed error with cause: ${result.cause || 'N/A'}` });
            } else {
                console.log(chalk.red("\n❌ Failed to analyze the error. The response might be malformed."));
                if (argv.debug) console.log("Raw Response:\n", rawOutput);
            }
            gracefulExit();
        })
        .command(['compare <fileA> <fileB>', 'c'], 'Compare two code files with AI', {}, async (argv) => {
            const context = { ...config, ...argv };
            const { fileA, fileB, lang } = context;

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
            await handleFeedback();

            // Pass the API service function and spinners to the comparer module
            await runComparer(contentA, contentB, { lang: lang || 'en' }, config, sendToCCGServer, startSpinner, stopSpinner);
            gracefulExit();
        })
        .command('config [action] [key] [value]', 'Manage settings (show, set <key> <value>, wizard)', {}, (argv) => handleConfigCommand(argv.action, argv.key, argv.value))
        .command(['history', 'h'], 'Show command history', {}, async () => {
            const config = await getConfig();
            const history = config.history || [];
            if (history.length === 0) return console.log(chalk.yellow('No history found.'));
            console.log(chalk.cyan.bold('--- Command History ---'));
            // Display latest first
            history.forEach((item, index) => {
                const displayIndex = index + 1; // 1-based index
                const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Timestamp unavailable';
                console.log(`\n${chalk.cyan.bold(`#${displayIndex}`)} [${timestamp}]`);
                // Show explanation first for context
                if (item.explanation) console.log(`  ${chalk.dim(item.explanation)}`);
                // Display command, handling multi-line scripts/commands
                if (item.command.includes('\n')) {
                    console.log(chalk.gray('  --- Command/Script Start ---'));
                    console.log(chalk.green(item.command));
                    console.log(chalk.gray('  --- Command/Script End ---'));
                } else {
                    console.log(`  ${chalk.green(item.command)}`);
                }
            });
        })
        .command('update', 'Update CCG to the latest version', {}, async () => {
            // Fetch the latest version number first to compare
            let latestVersion;
            try {
                console.log(chalk.dim('Checking latest version...'));
                const response = await axios.get(`https://registry.npmjs.org/${packageName}/latest`, { timeout: 3000 });
                latestVersion = response.data.version;
            } catch (error) {
                console.error(chalk.red(`\n❌ Failed to fetch latest version info. Please check your internet connection.`));
                process.exit(1);
            }

            if (semver.lte(latestVersion, currentVersion)) {
                console.log(chalk.green(`\n✅ You already have the latest version (${currentVersion}).`));
                process.exit(0);
            }

            console.log(chalk.cyan(`\nAttempting to update CCG (${currentVersion} -> ${latestVersion}) via npm...`));
            // Use @latest to ensure fetching the newest version, bypassing potential cache issues
            const command = `npm install -g ${packageName}@latest`;
            const fullCommand = process.platform !== 'win32' && process.getuid() !== 0 ? `sudo ${command}` : command;

            console.log(chalk.yellow(`Executing: ${fullCommand}`));
            if (fullCommand.startsWith('sudo')) {
                console.log(chalk.yellow('You may be prompted for your password.'));
            }

            const child = spawn(fullCommand, [], { stdio: 'inherit', shell: true });
            child.on('close', code => {
                if (code === 0) {
                    console.log(chalk.green(`\n✅ CCG updated successfully to ${latestVersion}!`));
                } else {
                    console.error(chalk.red(`\n❌ Update failed with code ${code}. Please try running the command manually.`));
                }
                process.exit(code); // Exit with the same code as the npm process
            });
            child.on('error', (err) => {
                console.error(chalk.red(`\n❌ Failed to start update process: ${err.message}`));
                process.exit(1);
            });
        })
        .command(['feedback', 'f'], 'Open the feedback form in your browser', {}, async () => {
            console.log(chalk.cyan(`Opening feedback form: ${FEEDBACK_URL}`));
            await open(FEEDBACK_URL).catch(() => console.log(chalk.yellow('Could not open browser. Please visit the URL manually: ' + FEEDBACK_URL)));
            gracefulExit();
        })
        // Command fallback / default action
        .command('*', false, {}, async (argv) => {
            if (argv._.length > 0) {
                console.log(chalk.red(`Unknown command: "${argv._[0]}"`));
            }
            showHelp(config);
        })
        .strict() // Report unknown options as errors
        .wrap(process.stdout.columns || 80); // Wrap help text


    // --- Argument Parsing and Execution ---
    const argv = await parser.argv;

    // Handle global --help and --version explicitly if no command was run
    if (argv.help && !argv._.length) {
        showHelp(config);
        process.exit(0);
    }
    // Note: -v/--version is now handled by yargs default behavior enabled above


    // Run update check (throttled inside the function) unless the command is 'update'
    if (argv._[0] !== 'update') {
        await checkForUpdates();
    }


    // If no command was matched by yargs (other than global options)
    if (argv._.length === 0 && !argv.help && !argv.version) {
        showHelp(config); // Show help if just 'ccg' is run without commands
    }

    // handleFeedback is called within specific command handlers after successful execution
};

// --- Global Error Handling ---
process.on('uncaughtException', (err) => {
    stopSpinner(); // Ensure spinner stops on crash
    console.error(chalk.red(`\n\n🚨 An unexpected error occurred: ${err.message}`));
    if (process.argv.includes('--debug')) {
        console.error(err.stack);
    } else {
        console.log(chalk.yellow('Run with --debug for more details.'));
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    stopSpinner();
    console.error(chalk.red('\n\n🚨 An unhandled promise rejection occurred:'), reason);
    if (process.argv.includes('--debug') && reason instanceof Error) {
        console.error(reason.stack);
    }
    process.exit(1);
});


// --- Start the CLI ---
run(); // Removed catch here, relying on global handlers
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
const chalk = require('chalk');
const open = require('open');

const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');

// --- Feedback variables ---
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=header';
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;
// ------------------------------------

const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;

// Safely read config
async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        try {
            const config = await fs.readJson(configFile);
            if (!config.history) config.history = [];
            if (config.usageCount === undefined) config.usageCount = 0;
            if (config.feedbackRequested === undefined) config.feedbackRequested = false;
            return config;
        } catch (error) {
            console.error(chalk.yellow('Warning: Configuration file was corrupted and has been reset.'));
            await fs.remove(configFile);
            return { history: [], usageCount: 0, feedbackRequested: false };
        }
    }
    return { history: [], usageCount: 0, feedbackRequested: false };
}

// Safely save config
async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

// Safely add to history
async function addToHistory(commandItem) {
    const config = await getConfig();
    const history = config.history || [];
    if (history.some(item => item.command === commandItem.command)) return;

    // Add timestamp
    const enhancedItem = {
        ...commandItem,
        timestamp: new Date().toISOString()
    };

    history.unshift(enhancedItem);
    if (history.length > MAX_HISTORY) {
        history.pop();
    }
    await setConfig({ history });
}

async function handleFeedback() {
    const config = await getConfig();
    if (config.usageCount >= USAGE_THRESHOLD_FOR_FEEDBACK && !config.feedbackRequested) {
        console.log(chalk.cyan.bold('\n--- We Value Your Feedback! ---'));
        console.log("You've used CMDGEN over 20 times. Would you mind sharing your thoughts to help us improve?");

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const question = (query) => new Promise(resolve => rl.question(query, resolve));

        const answer = await question(chalk.yellow('Open feedback form in browser? (y/N) '));
        rl.close();

        if (answer.toLowerCase() === 'y') {
            console.log(chalk.green('Thank you! Opening the form in your browser...'));
            console.log(chalk.gray(`If the form doesn't open, please visit:`));
            console.log(chalk.cyan(FEEDBACK_URL));
            await open(FEEDBACK_URL);
        }

        await setConfig({ feedbackRequested: true });
    }
}

const showHelp = (config = {}) => {
    const osDefault = chalk.yellow(config.os || 'not set');
    const shellDefault = chalk.yellow(config.shell || 'not set');

    console.log(chalk.cyan(`
  ██████╗███╗   ███╗██████╗   ██████╗ ███████╗███╗   ██╗
 ██╔════╝████╗ ████║██╔══██╗ ██╔════╝ ██╔════╝████╗  ██║
 ██║     ██╔████╔██║██║  ██║ ██║  ███╗█████╗  ██╔██╗ ██║
 ██║     ██║╚██╔╝██║██║  ██║ ██║   ██║██╔══╝  ██║╚██╗██║
 ╚██████╗██║ ╚═╝ ██║██████╔╝ ╚██████╔╝███████╗██║ ╚████║
  ╚═════╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝
`));
    console.log(chalk.bold('cmdgen - Your AI-powered command generator\n'));
    console.log(chalk.bold('Usage:'));
    console.log('  cmdgen <command> [options]\n');
    console.log(chalk.bold('Examples:'));
    console.log(chalk.gray('  cmdgen generate "list all files in Linux"'));
    console.log(chalk.gray('  cmdgen script "backup all .log files into a zip"'));
    console.log(chalk.gray('  cmdgen feedback\n'));
    console.log(chalk.bold('Commands:'));
    console.log(`  ${chalk.green('generate <request>')}    Generate a single command           [alias: g]`);
    console.log(`  ${chalk.green('script <request>')}      Generate a full script              [alias: s]`);
    console.log(`  ${chalk.green('analyze <command>')}     Understand what a command does      [alias: a]`);
    console.log(`  ${chalk.green('error <message>')}       Help with an error message          [alias: e]`);
    console.log(`  ${chalk.green('history')}               Show recently generated commands    [alias: h]`); // Added alias h
    console.log(`  ${chalk.green('feedback')}               Provide feedback on the tool        [alias: f]`);
    console.log(`  ${chalk.green('config <action>')}       Manage saved settings (show, set, wizard)`);
    console.log(`  ${chalk.green('update')}                Update cmdgen to the latest version\n`); // delete removed
    console.log(chalk.bold('Options:'));
    console.log(`  --os                  Target OS (e.g., windows, linux)  [default: ${osDefault}]`);
    console.log(`  --shell               Target shell (e.g., PowerShell, bash) [default: ${shellDefault}]`);
    console.log(`  --debug               Enable debug logs`);
    console.log(`  -h, --help            Show this help menu`);
    console.log(`  -v, --version         Show version number`);
};

const showWelcomeBanner = () => {
    console.log(chalk.cyan(`
█░█░█ █▀▀ █░░ █▀▀ █▀█ █▀▄▀█ █▀▀   ▀█▀ █▀█   ▄▀█ █▄█ ▄▄ █▀▀ █▀▄▀█ █▄▀ █▀▀ █▀▀ █▄░█
▀▄▀▄▀ ██▄ █▄▄ █▄▄ █▄█ █░▀░█ ██▄   ░█░ █▄█   █▀█ ░█░ ░░ █▄▄ █░▀░█ █▄▀ █▄█ ██▄ █░▀█
`));
    console.log(chalk.bold('\nWelcome to AY-CMDGEN!'));
    console.log(chalk.gray('Made with ❤ by Amirhossein Yavari\n'));
    console.log('Not sure where to start? Try one of these:');
    console.log(chalk.yellow('  cmdgen generate "list all files larger than 100MB"'));
    console.log(chalk.yellow('  cmdgen script "create a folder and three files inside it"'));
    console.log(chalk.yellow('  cmdgen history\n'));
    console.log('For more details, run: cmdgen --help');
};

const gracefulExit = () => {
    console.log(chalk.green(`\n🙏  Thank you for using cmdgen!  `));
    process.exit(0);
};

const runSetupWizard = async () => {
    console.log(chalk.cyan('\n--- CMDGEN Setup Wizard ---'));
    console.log('This setup saves your default OS and Shell for future use.');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    const osOptions = ['Windows', 'macOS', 'Linux', 'Other'];
    console.log('\nSelect your Operating System:');
    osOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
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
        shellOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
        const shellChoice = await question('> ');
        shell = shellOptions[parseInt(shellChoice) - 1];
    }

    rl.close();

    if (!os || !shell) {
        console.error(chalk.red('\n❌ Invalid selection. Please run `cmdgen config wizard` again.'));
        process.exit(1);
    }

    const newConfig = { 'os': os, 'shell': shell, 'osVersion': '' };
    await setConfig(newConfig);
    console.log(chalk.green(`\n✅ Configuration saved successfully: OS=${os}, Shell=${shell}`));
    return newConfig;
};

const handleConfigCommand = async (action, key, value) => {
    const config = await getConfig();
    if (action === 'show') {
        console.log(chalk.bold('\nCurrent CMDGEN Configuration:'));
        Object.entries(config).forEach(([k, v]) => {
            if (k !== 'lastRunDate' && k !== 'last_update_check' && k !== 'history') {
                console.log(`  ${chalk.cyan(k)}: ${chalk.yellow(v)}`);
            }
        });
    } else if (action === 'set') {
        if (!key || !value) {
            console.error(chalk.red('Error: "set" action requires a key and a value.'));
            console.log(chalk.gray('Example: cmdgen config set os linux'));
            return;
        }
        const validKeys = ['os', 'osVersion', 'shell', 'lang'];
        if (validKeys.includes(key)) {
            await setConfig({ [key]: value });
            console.log(chalk.green(`✅ Success! Set "${key}" to "${value}".`));
        } else {
            console.error(chalk.red(`Error: Invalid configuration key "${key}".`));
            console.log(chalk.gray(`Valid keys are: ${validKeys.join(', ')}`));
        }
    } else {
        await runSetupWizard();
    }
};

let spinnerInterval;
const startSpinner = (message) => {
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

async function checkForUpdates() {
    const config = await getConfig();
    const now = Date.now();
    if (now - (config.last_update_check || 0) < 24 * 60 * 60 * 1000) return;

    try {
        // Send active user ping
        const analyticsPayload = { event: 'cli_active_user', source: 'cli' };
        axios.post('https://cmdgen.onrender.com/api/ping', analyticsPayload, { timeout: 1500 }).catch(() => { });

        const response = await axios.get('https://api.github.com/repos/amirhosseinyavari021/ay-cmdgen/releases/latest', { timeout: 2000 });
        const latestVersion = response.data.tag_name.replace('v', '');
        const currentVersion = packageJson.version;
        if (semver.gt(latestVersion, currentVersion)) {
            console.log(chalk.green(`\n💡 New version available! (${currentVersion} -> ${latestVersion})`));
            console.log(`   Run ${chalk.cyan('cmdgen update')} to get the latest version.\n`);
        }
        await setConfig({ last_update_check: now });
    } catch (error) {
        await setConfig({ last_update_check: now });
    }
}

const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com';

const callApi = async (params) => {
    // Safely handle input parameters
    const { mode, userInput, os, osVersion, cli, lang, options = {} } = params;
    const safeOs = os || 'linux';
    const safeCli = cli || 'bash';
    const safeLang = lang || 'en';

    const systemPrompt = getSystemPrompt(mode, safeOs, osVersion || 'N/A', safeCli, safeLang, options);
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
                        try { fullContent += JSON.parse(jsonPart).choices[0].delta.content || ''; } catch (e) { }
                    }
                });
            });
            response.data.on('end', () => {
                stopSpinner();
                const finalData = parseAndConstructData(fullContent, mode, safeCli);
                // console.log("DEBUG: parseAndConstructData returned: ", finalData); // <-- خط دیباگ
                if (!finalData) reject(new Error("Parsing failed"));
                else resolve({ type: mode, finalData });
            });
            response.data.on('error', reject);
        } catch (err) { reject(err); }
    });
    try {
        startSpinner('Connecting to primary server...');
        return await attemptRequest(primaryServerUrl);
    } catch (primaryError) {
        stopSpinner();
        console.warn(chalk.yellow(`\n⚠️  Primary server failed. Trying fallback...`));
        startSpinner('Connecting to fallback server...');
        try {
            return await attemptRequest(fallbackServerUrl);
        } catch (fallbackError) {
            stopSpinner();
            const err = fallbackError || primaryError;
            if (err.code === 'ECONNABORTED') console.error(chalk.red(`\n❌ Error: Both servers timed out.`));
            else if (err.response) console.error(chalk.red(`\n❌ Error: Server responded with status ${err.response.status}.`));
            else if (err.request) console.error(chalk.red(`\n❌ Error: Could not connect to any server.`));
            else console.error(chalk.red(`\n❌ Error: ${err.message || "An unknown error occurred."}`));
            return null;
        }
    }
};

const executeCommand = (command, shell) => {
    return new Promise((resolve) => {
        console.log(chalk.magenta(`\n🚀 Executing: ${command.command}`));
        const commandString = command.command;
        let child;

        if (process.platform === 'win32') {
            if (shell && shell.toLowerCase().includes('powershell')) {
                child = spawn('powershell.exe', ['-NoProfile', '-Command', commandString], { stdio: 'inherit' });
            } else {
                child = spawn('cmd.exe', ['/C', commandString], { stdio: 'inherit' });
            }
        } else {
            child = spawn(commandString, [], { stdio: 'inherit', shell: true });
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

    const command = args[0]?.toLowerCase();

    // Remove delete from commands that don't need config
    const needsConfig = !['config', 'update', 'feedback', 'f', undefined, '--help', '-h', '--version', '-v'].includes(command);

    if (needsConfig && (!config.os || !config.shell)) {
        console.log(chalk.yellow('Welcome to CMDGEN! Let\'s get you set up first.'));
        config = await runSetupWizard();
        console.log(chalk.cyan('\nSetup complete! Now running your original command...'));
    }

    const parser = yargs(args)
        .scriptName("cmdgen")
        .help(false)
        .version(false)
        .option('h', { alias: 'help', type: 'boolean' })
        .option('v', { alias: 'version', type: 'boolean' })
        .option('debug', { describe: 'Enable debug logs', type: 'boolean', default: false })  // Added debug option
        .command(['generate <request>', 'g'], 'Generate a single command', {}, async (argv) => {
            // Safely pass parameters to API
            const safeOs = argv.os || config.os || 'linux';
            const safeShell = argv.shell || config.shell || 'bash';
            const safeLang = argv.lang || config.lang || 'en';

            const initialResult = await callApi({
                ...argv,
                userInput: argv.request,
                mode: 'generate',
                cli: safeShell,
                os: safeOs,
                lang: safeLang
            });

            // NEW: Check if initialResult and its finalData exist
            if (!initialResult) {
                console.log(chalk.red("\n❌ Failed to get response from server."));
                process.exit(1);
            }

            if (!initialResult.finalData) {
                console.log(chalk.red("\n❌ Server returned an invalid response."));
                console.log("Received result: ", initialResult); // For debugging
                process.exit(1);
            }

            if (!initialResult.finalData.commands) {
                console.log(chalk.red("\n❌ Server response does not contain commands."));
                console.log("Response ", initialResult); // For debugging
                process.exit(1);
            }

            if (initialResult.finalData.commands.length === 0) {
                console.log(chalk.yellow("\nNo suggestions could be generated for your request."));
                process.exit(1);
            }

            if (initialResult.finalData.commands.length > 0) {
                const currentConfig = await getConfig();
                await setConfig({ usageCount: currentConfig.usageCount + 1 });
            }

            const startInteractiveSession = async () => {
                let allCommands = [];
                // NEW: Check again before using commands
                if (initialResult.finalData.commands && initialResult.finalData.commands.length > 0) {
                    allCommands = initialResult.finalData.commands;
                    // Use Promise.all for better async management
                    await Promise.all(allCommands.map(cmd => addToHistory(cmd)));
                    displayNewSuggestions(allCommands, allCommands, true);
                } else {
                    console.log(chalk.yellow("\nNo suggestions could be generated for your request."));
                    process.exit(1);
                }
                while (true) {
                    const choice = await promptUser(allCommands);
                    if (choice.type === 'execute') {
                        await executeCommand(allCommands[choice.index], safeShell);
                        gracefulExit();
                        return;
                    } else if (choice.type === 'more') {
                        const newCmds = await getMoreSuggestions(argv, allCommands, safeOs, safeShell, safeLang);
                        if (newCmds.length > 0) {
                            await Promise.all(newCmds.map(cmd => addToHistory(cmd)));
                            allCommands.push(...newCmds);
                        } else {
                            console.log(chalk.yellow("Couldn't fetch more suggestions."));
                        }
                    } else if (choice.type === 'quit') {
                        gracefulExit();
                        return;
                    }
                }
            };
            const displayNewSuggestions = (newSuggestions, allCommands, isFirstTime) => {
                newSuggestions.forEach((cmd, idx) => {
                    const displayIndex = allCommands.length - newSuggestions.length + idx + 1;
                    console.log(`\n${chalk.cyan.bold(`Suggestion #${displayIndex}`)}:\n  ${chalk.green(cmd.command)}\n  └─ Explanation: ${cmd.explanation}`);
                    if (cmd.warning) {
                        console.log(`  └─ ${chalk.yellow.bold('Warning:')} ${chalk.yellow(cmd.warning)}`);
                    }
                });
                if (isFirstTime) console.warn(chalk.red.bold('\n🚨 WARNING: Executing AI-generated commands can be dangerous. Review them carefully.'));
            };
            const getMoreSuggestions = async (argv, allCommands, os, shell, lang) => {
                console.log(chalk.blue("\n🔄 Getting more suggestions..."));
                const existing = allCommands.map(c => c.command);
                const result = await callApi({
                    ...argv,
                    userInput: argv.request,
                    options: { existingCommands: existing },
                    mode: 'generate',
                    cli: shell,
                    os: os,
                    lang: lang
                });
                // NEW: Apply same checks for 'more' suggestions
                if (!result) {
                    console.log(chalk.red("\n❌ Failed to get more suggestions from server."));
                    return [];
                }
                if (!result.finalData || !result.finalData.commands) {
                    console.log(chalk.red("\n❌ Server returned an invalid response for more suggestions."));
                    console.log("Received result: ", result); // For debugging
                    return [];
                }
                if (result.finalData.commands.length > 0) {
                    const newCommands = result.finalData.commands;
                    displayNewSuggestions(newCommands, allCommands, false);
                    return newCommands;
                }
                return [];
            };
            const promptUser = (commands) => new Promise(resolve => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                const promptText = chalk.bold(`\nEnter a number (1-${commands.length}), (m)ore, or (q)uit: `);
                rl.question(promptText, (choice) => {
                    rl.close();
                    choice = choice.toLowerCase().trim();
                    if (choice === 'm') return resolve({ type: 'more' });
                    if (choice === 'q' || choice === '') return resolve({ type: 'quit' });
                    const index = parseInt(choice, 10) - 1;
                    if (index >= 0 && index < commands.length) {
                        const confirmRl = readline.createInterface({ input: process.stdin, output: process.stdout });
                        confirmRl.question(chalk.yellow(`\nExecute: "${chalk.cyan(commands[index].command)}"? [y/N] `), answer => {
                            confirmRl.close();
                            if (answer.toLowerCase() === 'y') {
                                resolve({ type: 'execute', index });
                            } else {
                                console.log(chalk.gray('Execution cancelled.'));
                                resolve({ type: 'quit' });
                            }
                        });
                    } else {
                        console.log(chalk.red('\nInvalid choice. Please try again.'));
                        resolve({ type: 'reprompt' });
                    }
                });
            });
            await startInteractiveSession();
        })
        .command(['script <request>', 's'], 'Generate a full script', {}, async (argv) => {
            // Safely pass parameters
            const safeOs = argv.os || config.os || 'linux';
            const safeShell = argv.shell || config.shell || 'bash';
            const safeLang = argv.lang || config.lang || 'en';

            const result = await callApi({
                ...argv,
                userInput: argv.request,
                mode: 'script',
                cli: safeShell,
                os: safeOs,
                lang: safeLang
            });

            // NEW: Enhanced checks for script result
            if (!result) {
                console.log(chalk.red("\n❌ Failed to get response from server for script generation."));
                gracefulExit();
            }

            if (!result.finalData) {
                console.log(chalk.red("\n❌ Server returned an invalid response for script generation."));
                console.log("Received result: ", result); // For debugging
                gracefulExit();
            }

            if (!result.finalData.explanation) {
                console.log(chalk.red("\n❌ Server response does not contain a script."));
                console.log("Response ", result); // For debugging
                gracefulExit();
            }

            const currentConfig = await getConfig();
            await setConfig({ usageCount: currentConfig.usageCount + 1 });
            console.log(chalk.cyan.bold('\n--- Generated Script ---'));
            console.log(chalk.green(result.finalData.explanation));
            const scriptItem = { command: result.finalData.explanation, explanation: `Script for: "${argv.request}"`, warning: '' };
            await addToHistory(scriptItem);

            const shellType = safeShell.toLowerCase();
            let fileExtension = '.sh';
            if (shellType.includes('powershell')) {
                fileExtension = '.ps1';
            } else if (shellType === 'cmd') {
                fileExtension = '.bat';
            }
            console.log(chalk.yellow(`\nTip: Copy the code above and save it to a file (e.g., script${fileExtension}) to run it.`));
            gracefulExit();
        })
        .command(['history', 'h'], 'Show recently generated commands and scripts', {}, async (argv) => { // Added alias h
            const config = await getConfig();
            const history = config.history || [];
            if (history.length === 0) {
                console.log(chalk.yellow('No history found.'));
                return;
            }
            console.log(chalk.cyan.bold('--- Command History ---'));
            history.forEach((item, index) => {
                const isScript = item.command.includes('\n');
                console.log(`\n${chalk.cyan.bold(`#${index + 1}`)}: ${item.explanation}`);
                if (isScript) {
                    console.log(chalk.green('--- SCRIPT START ---'));
                    console.log(chalk.gray(item.command));
                    console.log(chalk.green('--- SCRIPT END ---'));
                } else {
                    console.log(`  ${chalk.green(item.command)}`);
                }

                // Show timestamp
                if (item.timestamp) {
                    console.log(`  ${chalk.dim('📅 ' + new Date(item.timestamp).toLocaleString())}`);
                }
            });
        })
        .command(['feedback', 'f'], 'Provide feedback about CMDGEN', {}, async () => {
            console.log(chalk.cyan('Thank you for helping us improve!'));
            console.log(chalk.yellow(`Opening feedback form in your browser...`));
            console.log(chalk.gray(`If the form doesn't open, please visit:`));
            console.log(chalk.cyan(FEEDBACK_URL));

            try {
                await open(FEEDBACK_URL);
            } catch (error) {
                console.log(chalk.yellow(`Could not open browser automatically. Please visit the URL above manually.`));
            }

            gracefulExit();
        })
        .command('config [action] [key] [value]', 'Manage saved settings', {}, async (argv) => {
            await handleConfigCommand(argv.action, argv.key, argv.value);
        })
        .command('update', 'Update cmdgen to the latest version', {}, () => {
            if (process.platform === 'win32') {
                const command = 'iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex';
                spawn('powershell.exe', ['-Command', command], { stdio: 'inherit' }).on('close', code => process.exit(code));
            } else {
                const command = 'curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash';
                spawn(command, { stdio: 'inherit', shell: true }).on('close', code => process.exit(code));
            }
        })
        .command(['analyze <command>', 'a'], 'Understand what a command does', {}, async (argv) => {
            // Safely pass parameters
            const safeOs = argv.os || config.os || 'linux';
            const safeShell = argv.shell || config.shell || 'bash';
            const safeLang = argv.lang || config.lang || 'en';

            const result = await callApi({
                ...argv,
                userInput: argv.command,
                mode: 'explain',
                cli: safeShell,
                os: safeOs,
                lang: safeLang
            });

            // NEW: Enhanced checks for analyze result
            if (!result) {
                console.log(chalk.red("\n❌ Failed to get response from server for command analysis."));
                gracefulExit();
            }

            if (!result.finalData) {
                console.log(chalk.red("\n❌ Server returned an invalid response for command analysis."));
                console.log("Received result: ", result); // For debugging
                gracefulExit();
            }

            if (!result.finalData.explanation) {
                console.log(chalk.red("\n❌ Server response does not contain an explanation."));
                console.log("Response ", result); // For debugging
                gracefulExit();
            }

            console.log(result.finalData.explanation);
            gracefulExit();
        })
        .command(['error <message>', 'e'], 'Help with an error message', {}, async (argv) => {
            // Safely pass parameters
            const safeOs = argv.os || config.os || 'linux';
            const safeShell = argv.shell || config.shell || 'bash';
            const safeLang = argv.lang || config.lang || 'en';

            const userInput = `Error Message:\n${argv.message}` + (argv.context ? `\n\nContext:\n${argv.context}` : '');
            const result = await callApi({
                ...argv,
                userInput: userInput,
                mode: 'error',
                cli: safeShell,
                os: safeOs,
                lang: safeLang
            });

            // NEW: Enhanced checks for error analysis result
            if (!result) {
                console.log(chalk.red("\n❌ Failed to get response from server for error analysis."));
                gracefulExit();
            }

            if (!result.finalData) {
                console.log(chalk.red("\n❌ Server returned an invalid response for error analysis."));
                console.log("Received result: ", result); // For debugging
                gracefulExit();
            }

            if (!result.finalData.cause || !result.finalData.explanation || !result.finalData.solution) {
                console.log(chalk.red("\n❌ Server response is missing required error analysis parts."));
                console.log("Response ", result); // For debugging
                gracefulExit();
            }

            console.log(chalk.bold(`\nProbable Cause:`), chalk.red(result.finalData.cause));
            console.log(chalk.bold(`\nExplanation:`), result.finalData.explanation);
            console.log(chalk.bold(`\nSolution:`));
            result.finalData.solution.forEach(step => {
                if (step.startsWith('CMD:')) {
                    console.log(chalk.green(`  - Run command: `) + chalk.cyan(step.substring(4).trim()));
                } else {
                    console.log(chalk.green(`  - ${step}`));
                }
            });
            gracefulExit();
        })
        // delete command removed
        .option('os', { describe: 'Target OS', type: 'string', default: config.os })
        .option('shell', { describe: 'Target shell', type: 'string', default: config.shell })
        .option('lang', { describe: 'Response language', type: 'string', default: 'en' })
        .strict()
        .fail((msg, err) => {
            console.error(chalk.red(`\n❌ Error: ${msg || err.message}`));
            process.exit(1);
        });

    const argv = await parser.argv;

    if (argv.help) {
        showHelp(config);
        process.exit(0);
    }
    if (argv.version) {
        console.log(packageJson.version);
        process.exit(0);
    }

    const today = new Date().toISOString().slice(0, 10);
    if (!config.lastRunDate) {
        if (!command) showWelcomeBanner();
        await setConfig({ lastRunDate: today });
    }

    if (command && !['feedback', 'f'].includes(command)) {
        await checkForUpdates();
        await handleFeedback();
    }

    if (!command && args.length === 0) {
        showHelp(config);
    }
};

run().catch(err => {
    stopSpinner();
    console.error(chalk.red(`\nA critical error occurred: ${err.message}`));
    // Removed stack trace for regular users
    // console.error(err.stack);
    process.exit(1);
});
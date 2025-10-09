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
const currentVersion = packageJson.version;

const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkigw8FoqPI2KpIg7Xhy_3CqXAovCVwuPXQGCeKnVaV1PLAg/viewform?usp=header';
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;

const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;

async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        try {
            const config = await fs.readJson(configFile);
            if (!config.history) config.history = [];
            return config;
        } catch (error) {
            console.error(chalk.yellow('Warning: Configuration file was corrupted and has been reset.'));
            await fs.remove(configFile);
            return { history: [], usageCount: 0, feedbackRequested: false, isFirstRun: true };
        }
    }
    return { history: [], usageCount: 0, feedbackRequested: false, isFirstRun: true };
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
        console.log("You've used CMDGEN many times. Would you mind sharing your thoughts to help us improve?");
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => rl.question(chalk.yellow('Open feedback form in browser? (y/N) '), resolve));
        rl.close();
        if (answer.toLowerCase() === 'y') {
            await open(FEEDBACK_URL).catch(() => console.log(chalk.yellow('Could not open browser. Please visit the URL manually.')));
        }
        await setConfig({ feedbackRequested: true });
    }
}

const showHelp = (config = {}) => {
    const { os: osDefault, shell: shellDefault, lang: langDefault, knowledgeLevel: levelDefault, deviceType: deviceDefault } = config;
    console.log(chalk.cyan(`
  ██████╗███╗   ███╗██████╗   ██████╗ ███████╗███╗   ██╗
 ██╔════╝████╗ ████║██╔══██╗ ██╔════╝ ██╔════╝████╗  ██║
 ██║     ██╔████╔██║██║  ██║ ██║  ███╗█████╗  ██╔██╗ ██║
 ██║     ██║╚██╔╝██║██║  ██║ ██║   ██║██╔══╝  ██║╚██╗██║
 ╚██████╗██║ ╚═╝ ██║██████╔╝ ╚██████╔╝███████╗██║ ╚████║
  ╚═════╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝
`));
    console.log(chalk.bold('cmdgen - Your AI-powered command assistant\n'));
    console.log(chalk.bold('Usage:'));
    console.log('  cmdgen <command> [options]\n');
    console.log(chalk.bold('Commands:'));
    console.log(`  ${chalk.green('generate <request>')}    Generate command suggestions        [alias: g]`);
    console.log(`  ${chalk.green('script <request>')}      Generate a full script              [alias: s]`);
    console.log(`  ${chalk.green('analyze <command>')}     Explain a command or script         [alias: a]`);
    console.log(`  ${chalk.green('error <message>')}       Get solutions for an error          [alias: e]`);
    console.log(`  ${chalk.green('history')}               Show recently generated items       [alias: h]`);
    console.log(`  ${chalk.green('feedback')}               Provide feedback on the tool        [alias: f]`);
    console.log(`  ${chalk.green('config <action>')}       Manage settings (show, set, wizard)`);
    console.log(`  ${chalk.green('update')}                Update cmdgen to the latest version\n`);
    console.log(chalk.bold('Options:'));
    console.log(`  --os <os>             Target OS (windows, linux, cisco)     [default: ${chalk.yellow(osDefault || 'not set')}]`);
    console.log(`  --shell <shell>         Target shell (PowerShell, bash, CLI)    [default: ${chalk.yellow(shellDefault || 'not set')}]`);
    console.log(`  --lang <lang>           Response language (en, fa)              [default: ${chalk.yellow(langDefault || 'en')}]`);
    console.log(`  --level <level>         Knowledge level (beginner, intermediate, expert) [default: ${chalk.yellow(levelDefault || 'intermediate')}]`);
    console.log(`  --device <device>       Device type for Cisco (router, switch, firewall) [default: ${chalk.yellow(deviceDefault || 'n/a')}]`);
    console.log(`  -h, --help            Show this help menu`);
    console.log(`  -v, --version         Show version number`);
};

const showWelcomeBanner = async () => {
    const config = await getConfig();
    if (config.isFirstRun === false) return;
    console.log(chalk.bold('\nWelcome to AY-CMDGEN!'));
    console.log('To get started, please run the setup wizard:');
    console.log(chalk.yellow('  cmdgen config wizard'));
    await setConfig({ isFirstRun: false });
};

const gracefulExit = () => {
    console.log(chalk.green(`\n🙏 Thank you for using cmdgen!`));
    process.exit(0);
};

const runSetupWizard = async () => {
    console.log(chalk.cyan('\n--- CMDGEN Setup Wizard ---'));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    const osOptions = ['Windows', 'macOS', 'Linux', 'Cisco', 'Other'];
    console.log('\nSelect your primary platform/OS:');
    osOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
    const osChoice = await question('> ');
    const selectedOsKey = osOptions[parseInt(osChoice) - 1]?.toLowerCase() || 'other';

    let os, shell, deviceType = null;

    if (selectedOsKey === 'other') {
        os = await question('Enter your OS name: ');
        shell = await question('Enter your Shell name: ');
    } else {
        os = selectedOsKey;
        const shellMap = { windows: ['PowerShell', 'CMD'], macos: ['zsh', 'bash'], linux: ['bash', 'zsh', 'fish'], cisco: ['CLI'] };
        const shellOptions = shellMap[os];
        console.log(`\nSelect a Shell for ${os}:`);
        shellOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
        const shellChoice = await question('> ');
        shell = shellOptions[parseInt(shellChoice) - 1];

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
    const newConfig = { os, shell, lang: selectedLang, knowledgeLevel, deviceType };
    await setConfig(newConfig);
    console.log(chalk.green(`\n✅ Configuration saved successfully!`));
    return newConfig;
};

const handleConfigCommand = async (action, key, value) => {
    const config = await getConfig();
    if (action === 'show') {
        console.log(chalk.bold('\nCurrent CMDGEN Configuration:'));
        Object.entries(config).forEach(([k, v]) => {
            if (!['history', 'last_update_check', 'isFirstRun', 'skillLevel'].includes(k) && v) {
                console.log(`  ${chalk.cyan(k)}: ${chalk.yellow(String(v))}`);
            }
        });
    } else if (action === 'set') {
        if (!key || !value) return console.error(chalk.red('Error: "set" action requires a key and value.'));
        const validKeys = ['os', 'osVersion', 'shell', 'lang', 'knowledgeLevel', 'deviceType'];
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

async function checkForUpdates() {
    const config = await getConfig();
    const now = Date.now();
    if (now - (config.last_update_check || 0) < 24 * 60 * 60 * 1000) return;
    try {
        const response = await axios.get('https://api.github.com/repos/amirhosseinyavari021/ay-cmdgen/releases/latest', { timeout: 2000 });
        const latestVersion = response.data.tag_name.replace('v', '');
        if (semver.gt(latestVersion, currentVersion)) {
            console.log(chalk.green(`\n💡 New version available! (${currentVersion} -> ${latestVersion})`));
            console.log(`   Run ${chalk.cyan('cmdgen update')} to get the latest version.\n`);
        }
    } catch (error) { /* Silently fail */ }
    await setConfig({ last_update_check: now });
}

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
            response.data.on('data', chunk => {
                const textChunk = new TextDecoder().decode(chunk);
                textChunk.split('\n').filter(line => line.startsWith('data: ')).forEach(line => {
                    const jsonPart = line.substring(5).trim();
                    if (jsonPart && jsonPart !== "[DONE]") {
                        try { fullContent += JSON.parse(jsonPart).choices[0].delta.content || ''; } catch (e) { }
                    }
                });
            });
            response.data.on('end', () => {
                stopSpinner();
                const finalData = parseAndConstructData(fullContent, mode, cli);
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
            console.error(chalk.red(`\n❌ Error: Could not connect to any server.`));
            return null;
        }
    }
};

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
    const needsConfig = !['config', 'update', 'feedback', 'f', undefined, '--help', '-h', '--version', '-v'].includes(command);

    if (needsConfig && (!config.os || !config.shell)) {
        config = await runSetupWizard();
    }

    const parser = yargs(args)
        .scriptName("cmdgen")
        .help(false).version(false)
        .option('os', { type: 'string' }).option('shell', { type: 'string' }).option('lang', { type: 'string' })
        .option('level', { type: 'string' }).option('device', { type: 'string' }).option('debug', { type: 'boolean' })
        .command(['generate <request>', 'g'], 'Generate command suggestions', {}, async (argv) => {
            const context = { ...config, ...argv };
            const initialResult = await callApi({ userInput: argv.request, mode: 'generate', os: context.os, cli: context.shell, lang: context.lang, options: { knowledgeLevel: context.level, deviceType: context.device } });

            if (!initialResult?.finalData?.commands?.length) {
                console.log(chalk.red("\n❌ Failed to generate valid commands."));
                process.exit(1);
            }

            await setConfig({ usageCount: (config.usageCount || 0) + 1 });

            const startInteractiveSession = async () => {
                let allCommands = initialResult.finalData.commands;
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
                const existing = allCommands.map(c => c.command);
                const result = await callApi({ userInput: request, mode: 'generate', os: context.os, cli: context.shell, lang: context.lang, options: { existingCommands: existing, knowledgeLevel: context.level, deviceType: context.device } });
                return result?.finalData?.commands || [];
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
                            resolve(answer.toLowerCase() === 'y' ? { type: 'execute', index } : { type: 'quit' });
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
            const { os, shell, lang, level, device, request } = { ...config, ...argv };
            const result = await callApi({ userInput: request, mode: 'script', os, cli: shell, lang, options: { knowledgeLevel: level, deviceType: device } });
            if (result?.finalData?.explanation) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                console.log(chalk.cyan.bold('\n--- Generated Script ---'));
                console.log(chalk.green(result.finalData.explanation));
                await addToHistory({ command: result.finalData.explanation, explanation: `Script for: "${request}"` });
            } else { console.log(chalk.red("\n❌ Failed to generate a script.")); }
            gracefulExit();
        })
        .command(['analyze <command>', 'a'], 'Explain a command', {}, async (argv) => {
            const { os, shell, lang, level, device, command } = { ...config, ...argv };
            const result = await callApi({ userInput: command, mode: 'explain', os, cli: shell, lang, options: { knowledgeLevel: level, deviceType: device } });
            if (result?.finalData?.explanation) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                console.log(chalk.cyan.bold('\n--- Analysis ---'));
                console.log(result.finalData.explanation);
            } else { console.log(chalk.red("\n❌ Failed to get an explanation.")); }
            gracefulExit();
        })
        .command(['error <message>', 'e'], 'Get help for an error', {}, async (argv) => {
            const { os, shell, lang, level, device, message } = { ...config, ...argv };
            const result = await callApi({ userInput: message, mode: 'error', os, cli: shell, lang, options: { knowledgeLevel: level, deviceType: device } });
            if (result?.finalData?.cause) {
                await setConfig({ usageCount: (config.usageCount || 0) + 1 });
                console.log(chalk.red.bold('\nProbable Cause:'), result.finalData.cause);
                console.log(chalk.yellow.bold('\nExplanation:'), result.finalData.explanation);
                if (result.finalData.solution?.length) {
                    console.log(chalk.green.bold('\nSolution:'));
                    result.finalData.solution.forEach(step => console.log(`  - ${step.replace(/^CMD: /i, chalk.cyan('Run: '))}`));
                }
            } else { console.log(chalk.red("\n❌ Failed to analyze the error.")); }
            gracefulExit();
        })
        .command('config [action] [key] [value]', 'Manage settings', {}, (argv) => handleConfigCommand(argv.action, argv.key, argv.value))
        .command('history', 'Show command history', {}, async () => {
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
        .command('update', 'Update cmdgen', {}, () => {
            const command = process.platform === 'win32'
                ? 'Invoke-WebRequest -Uri https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 -UseBasicParsing | Invoke-Expression'
                : 'curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash';
            const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            const args = process.platform === 'win32' ? ['-Command', command] : ['-c', command];
            spawn(shell, args, { stdio: 'inherit' }).on('close', code => process.exit(code));
        })
        .command('feedback', 'Provide feedback', {}, async () => {
            await open(FEEDBACK_URL).catch(() => console.log(chalk.yellow('Please visit: ' + FEEDBACK_URL)));
            gracefulExit();
        });

    const argv = await parser.argv;

    if (argv.help || (args.length === 0 && !parser.parsed.defaultCommand)) {
        showHelp(config);
    } else if (argv.version) {
        console.log(currentVersion);
    }

    if (command && !['config', 'update', 'feedback', 'f'].includes(command)) {
        await checkForUpdates();
        await handleFeedback();
    }
};

run().catch(err => {
    stopSpinner();
    console.error(chalk.red(`\nA critical error occurred: ${err.message}`));
    if (process.argv.includes('--debug')) {
        console.error(err.stack);
    }
    process.exit(1);
});
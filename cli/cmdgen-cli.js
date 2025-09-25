#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn, execSync } = require('child_process');
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

// --- متغیرهای مربوط به بازخورد و حذف ---
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdt_16-wZOgOViET55XwQYAsetfWxQWDW1DBb4yks6AgtOI9g/viewform?usp=header';
const UNINSTALL_REASON_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeKgyrKv_owvzTgF6iULQ-YeUBf1eRRwOdKw9Ho3JvZ2A0VwA/formResponse';
const UNINSTALL_REASON_ENTRY_ID = 'entry.183938337';
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;
// ------------------------------------

const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;

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

async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

async function addToHistory(commandItem) {
    const config = await getConfig();
    const history = config.history || [];
    if (history.some(item => item.command === commandItem.command)) return;
    history.unshift(commandItem);
    if (history.length > MAX_HISTORY) {
        history.pop();
    }
    await setConfig({ history });
}

async function handleFeedback(force = false) {
    const config = await getConfig();
    // فقط اگر به حد استفاده رسید یا force=true
    if ((config.usageCount >= USAGE_THRESHOLD_FOR_FEEDBACK && !config.feedbackRequested) || force) {
        console.log(chalk.cyan.bold('\n--- We Value Your Feedback! ---'));
        console.log("You've used CMDGEN several times. Would you mind sharing your thoughts to help us improve?");

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const question = (query) => new Promise(resolve => rl.question(query, resolve));
        
        const answer = await question(chalk.yellow('Open feedback form in browser? (y/N) '));
        rl.close();

        if (answer.trim().toLowerCase() === 'y') {
            console.log(chalk.green('Thank you! Opening the form in your browser...'));
            try {
                await open(FEEDBACK_URL);
            } catch (err) {
                console.error(chalk.red('Could not open browser automatically. Please open this link manually:'));
                console.log(chalk.yellow(FEEDBACK_URL));
            }
        } else {
            console.log(chalk.gray('You can always provide feedback later via:'));
            console.log(chalk.yellow(FEEDBACK_URL));
        }
        
        await setConfig({ feedbackRequested: true });
    }
}

const showHelp = (config = {}) => {
    const osDefault = chalk.yellow(config.os || 'not set');
    const shellDefault = chalk.yellow(config.shell || 'not set');

    console.log(chalk.cyan(`
█▀▀ █▄█ █▀▄ █▀▀ █▄█ █▄░█
█▄▄ ░█░ █▄▀ ██▄ ░█░ █░▀█
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
    console.log(`  ${chalk.green('history')}               Show recently generated commands`);
    console.log(`  ${chalk.green('feedback')}               Provide feedback on the tool        [alias: f]`);
    console.log(`  ${chalk.green('config <action>')}       Manage saved settings (show, set, wizard)`);
    console.log(`  ${chalk.green('update')}                Update cmdgen to the latest version`);
    console.log(`  ${chalk.green('delete')}                Uninstall cmdgen from your system   [alias: d]\n`);
    console.log(chalk.bold('Options:'));
    console.log(`  --os                  Target OS (e.g., windows, linux)  [default: ${osDefault}]`);
    console.log(`  --shell               Target shell (e.g., PowerShell, bash) [default: ${shellDefault}]`);
    console.log('  -h, --help            Show this help menu');
    console.log('  -v, --version         Show version number');
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

    let osSel, shellSel;

    if (selectedOsKey === 'other') {
        osSel = await question('Please enter your OS: ');
    } else {
        osSel = selectedOsKey;
    }

    console.log('\nEnter your default shell (e.g., bash, zsh, PowerShell):');
    shellSel = await question('> ');

    rl.close();
    await setConfig({ os: osSel, shell: shellSel });

    return { os: osSel, shell: shellSel };
};

async function handleDelete() {
    console.log(chalk.red.bold('\n--- Uninstall CMDGEN ---'));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    const confirm = await question(chalk.yellow('Are you sure you want to permanently delete CMDGEN and its config file? (y/N) '));
    if (confirm.toLowerCase() !== 'y') {
        console.log(chalk.gray('Uninstall cancelled.'));
        rl.close();
        return;
    }

    const reason = await question(chalk.yellow('(Optional) To help us improve, please share why you are uninstalling: '));
    if (reason.trim()) {
        try {
            const formData = new URLSearchParams();
            formData.append(UNINSTALL_REASON_ENTRY_ID, reason);
            axios.post(UNINSTALL_REASON_FORM_URL, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).catch(() => {});
        } catch (e) { /* Ignore errors */ }
    }
    rl.close();

    let configRemoved = false;
    let cmdgenRemoved = false;
    let removedFiles = [];
    let failedFiles = [];

    try {
        await fs.remove(configDir);
        configRemoved = true;
        console.log(chalk.gray('Removing configuration files...'));
    } catch (e) {}

    // حذف اجرایی
    function tryRemoveFile(file) {
        if (!file) return false;
        try {
            if (fs.existsSync(file)) {
                fs.removeSync(file);
                removedFiles.push(file);
                return true;
            }
        } catch (e) {
            failedFiles.push(file);
        }
        return false;
    }

    let execPaths = [];
    if (process.platform === 'win32') {
        // روی ویندوز
        try {
            const res = execSync('where cmdgen', { encoding: 'utf8' });
            execPaths = res.split('\n').map(s => s.trim()).filter(Boolean);
        } catch (e) {}
    } else {
        // لینوکس و مک
        try {
            const res = execSync('which cmdgen', { encoding: 'utf8' });
            execPaths = res.split('\n').map(s => s.trim()).filter(Boolean);
        } catch (e) {}
    }

    for (const file of execPaths) {
        if (tryRemoveFile(file)) {
            cmdgenRemoved = true;
        }
        // در ویندوز فایل batch هم هست:
        if (process.platform === 'win32' && !file.endsWith('.cmd')) {
            const batchFile = file + '.cmd';
            if (tryRemoveFile(batchFile)) {
                cmdgenRemoved = true;
            }
        }
    }

    if (configRemoved || cmdgenRemoved) {
        console.log(chalk.green('✅ CMDGEN has been successfully uninstalled.'));
        if (removedFiles.length) {
            console.log(chalk.gray('Removed files:'));
            removedFiles.forEach(f => console.log(chalk.gray('  - ' + f)));
        }
        if (failedFiles.length) {
            console.log(chalk.yellow('Some files could not be removed automatically:'));
            failedFiles.forEach(f => console.log(chalk.yellow('  - ' + f)));
            console.log('You may need to remove them manually.');
        }
        console.log(chalk.gray('\nIf you installed via npm, you may also want to run: npm uninstall -g ay-cmdgen'));
    } else {
        console.log(chalk.red('Could not automatically remove all CMDGEN files. Please remove them manually.'));
    }
    console.log('You may need to restart your terminal for changes to take full effect.');
    gracefulExit();
}

const run = async () => {
    let config = await getConfig();
    const args = hideBin(process.argv);
    const command = args[0];

    const needsConfig = !['config', 'update', 'delete', 'd', 'feedback', 'f', undefined, '--help', '-h', '--version', '-v'].includes(command);

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
        .command(['generate <request>', 'g'], 'Generate a single command', {}, async (argv) => {
            const initialResult = await callApi({ ...argv, userInput: argv.request, mode: 'generate', cli: argv.shell });
            if (initialResult?.data?.commands?.length > 0) {
                for (const cmd of initialResult.data.commands) {
                    await addToHistory({ command: cmd.command, explanation: cmd.explanation });
                }
                printCommandResult(initialResult.data.commands);
                incrementUsageCount();
            } else {
                console.log(chalk.red('No command could be generated.'));
            }
        })
        .command(['script <request>', 's'], 'Generate a full script', {}, async (argv) => {
            const initialResult = await callApi({ ...argv, userInput: argv.request, mode: 'script', cli: argv.shell });
            if (initialResult?.data?.script) {
                await addToHistory({ command: initialResult.data.script, explanation: initialResult.data.explanation || '' });
                printScriptResult(initialResult.data.script, initialResult.data.explanation);
                incrementUsageCount();
            } else {
                console.log(chalk.red('No script could be generated.'));
            }
        })
        .command(['analyze <command>', 'a'], 'Understand what a command does', {}, async (argv) => {
            const initialResult = await callApi({ ...argv, userInput: argv.command, mode: 'analyze', cli: argv.shell });
            if (initialResult?.data?.explanation) {
                await addToHistory({ command: argv.command, explanation: initialResult.data.explanation });
                printAnalyzeResult(argv.command, initialResult.data.explanation);
                incrementUsageCount();
            } else {
                console.log(chalk.red('Could not analyze the command.'));
            }
        })
        .command(['error <message>', 'e'], 'Help with an error message', {}, async (argv) => {
            const initialResult = await callApi({ ...argv, userInput: argv.message, mode: 'error', cli: argv.shell });
            if (initialResult?.data?.help) {
                printErrorHelp(argv.message, initialResult.data.help);
                incrementUsageCount();
            } else {
                console.log(chalk.red('Could not provide help for this error.'));
            }
        })
        .command(['history'], 'Show recently generated commands', {}, async () => {
            const config = await getConfig();
            const history = config.history || [];
            if (!history.length) {
                console.log(chalk.yellow('No command history found.'));
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
            });
        })
        .command(['feedback', 'f'], 'Provide feedback about CMDGEN', {}, async () => {
            // همیشه فرم فیدبک را با open و اگر نشد لینک را چاپ کن
            console.log(chalk.cyan('Thank you for helping us improve! Opening the feedback form in your browser...'));
            try {
                await open(FEEDBACK_URL);
            } catch (err) {
                console.error(chalk.red('Could not open browser automatically. Please open this link manually:'));
                console.log(chalk.yellow(FEEDBACK_URL));
            }
            gracefulExit();
        })
        .command(['delete', 'd'], 'Uninstall cmdgen from your system', {}, async () => {
            await handleDelete();
        })
        .command('config [action] [key] [value]', 'Manage saved settings', {}, async (argv) => {
            await handleConfigCommand(argv.action, argv.key, argv.value);
        })
        .parse();

    if (!command && args.length === 0) {
        showHelp(config);
    }

    await handleFeedback();
};

function incrementUsageCount() {
    getConfig().then(config => {
        const usageCount = (config.usageCount || 0) + 1;
        setConfig({ usageCount });
    });
}

function printCommandResult(commands) {
    commands.forEach((cmd, i) => {
        console.log(chalk.cyan.bold(`\nCommand #${i + 1}:`));
        console.log(chalk.green(cmd.command));
        if (cmd.explanation) {
            console.log(chalk.gray(`Explanation: ${cmd.explanation}`));
        }
    });
}

function printScriptResult(script, explanation) {
    console.log(chalk.cyan.bold('\nGenerated Script:'));
    console.log(chalk.green(script));
    if (explanation) {
        console.log(chalk.gray(`Explanation: ${explanation}`));
    }
}

function printAnalyzeResult(command, explanation) {
    console.log(chalk.cyan.bold('\nCommand Analysis:'));
    console.log(chalk.green(command));
    console.log(chalk.gray(explanation));
}

function printErrorHelp(message, help) {
    console.log(chalk.cyan.bold('\nError Help:'));
    console.log(chalk.yellow(message));
    console.log(chalk.gray(help));
}

async function handleConfigCommand(action, key, value) {
    const config = await getConfig();
    switch ((action || '').toLowerCase()) {
        case 'show':
        default:
            console.log(chalk.bold('\nCurrent config:'));
            Object.entries(config).forEach(([k, v]) => {
                if (k === 'history') return;
                console.log(`${chalk.green(k)}: ${v}`);
            });
            break;
        case 'set':
            if (!key || typeof value === 'undefined') {
                console.log(chalk.red('Usage: cmdgen config set <key> <value>'));
                return;
            }
            await setConfig({ [key]: value });
            console.log(chalk.green(`Config key "${key}" set to "${value}"`));
            break;
        case 'wizard':
            await runSetupWizard();
            console.log(chalk.green('Setup complete!'));
            break;
    }
}

// اجرای برنامه
run().catch(err => {
    console.error(chalk.red(`\nA critical error occurred: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
});
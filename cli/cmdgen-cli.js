#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');
const chalk = require('chalk');
const open = require('open');
const semver = require('semver');

const packageJson = require('./package.json');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');

// --- Constants ---
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdt_16-wZOgOViET55XwQYAsetfWxQWDW1DBb4yks6AgtOI9g/viewform?usp=header';
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;
const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;
const primaryServerUrl = 'https://ay-cmdgen-cli.onrender.com';
const fallbackServerUrl = 'https://cmdgen.onrender.com';

// --- Config Management ---
async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        try {
            const config = await fs.readJson(configFile);
            if (!config.history) config.history = [];
            if (config.usageCount === undefined) config.usageCount = 0;
            if (config.feedbackRequested === undefined) config.feedbackRequested = false;
            return config;
        } catch {
            console.warn(chalk.yellow('⚠️ Config corrupted. Resetting...'));
            await fs.remove(configFile);
        }
    }
    return { history: [], usageCount: 0, feedbackRequested: false, os: os.platform(), shell: process.env.SHELL || 'bash' };
}

async function setConfig(newConfig) {
    const current = await getConfig();
    await fs.writeJson(configFile, { ...current, ...newConfig });
}

async function addToHistory(commandItem) {
    const config = await getConfig();
    const history = config.history || [];
    if (!history.some(item => item.command === commandItem.command)) {
        history.unshift(commandItem);
        if (history.length > MAX_HISTORY) history.pop();
        await setConfig({ history });
    }
}

// --- Feedback ---
async function handleFeedback() {
    const config = await getConfig();
    if (config.usageCount >= USAGE_THRESHOLD_FOR_FEEDBACK && !config.feedbackRequested) {
        console.log(chalk.cyan.bold('\n--- We Value Your Feedback! ---'));
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => rl.question(chalk.yellow('Open feedback form in browser? (y/N) '), resolve));
        rl.close();
        if (answer.toLowerCase() === 'y') await open(FEEDBACK_URL);
        await setConfig({ feedbackRequested: true });
    }
}

// --- Spinner ---
let spinnerInterval;
const startSpinner = (msg) => {
    const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let i = 0;
    process.stdout.write('\x1B[?25l');
    spinnerInterval = setInterval(() => process.stdout.write(chalk.blue(`\r${frames[i++ % frames.length]} ${msg}`)), 80);
};
const stopSpinner = () => {
    if (spinnerInterval) clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    process.stdout.write('\x1B[?25h');
};

// --- API Call ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options={} }) => {
    const systemPrompt = getSystemPrompt(mode, os, osVersion || 'N/A', cli, lang, options);
    const payload = { messages: [{ role:'system', content: systemPrompt }, { role:'user', content: userInput }] };

    const attemptRequest = async (url) => {
        startSpinner('Connecting to server...');
        try {
            const response = await axios.post(`${url}/api/proxy`, payload, { responseType:'stream', timeout:60000 });
            stopSpinner();
            startSpinner('Generating response...');
            let fullContent = '';
            const decoder = new TextDecoder();
            response.data.on('data', chunk => {
                const textChunk = decoder.decode(chunk, { stream:true });
                textChunk.split('\n').filter(line => line.startsWith('data: ')).forEach(line => {
                    const jsonPart = line.substring(5).trim();
                    if (jsonPart && jsonPart !== "[DONE]") {
                        try { fullContent += JSON.parse(jsonPart).choices[0].delta.content || ''; } catch {}
                    }
                });
            });
            return await new Promise((resolve, reject) => {
                response.data.on('end', () => {
                    stopSpinner();
                    const finalData = parseAndConstructData(fullContent, mode, cli);
                    if (!finalData) reject(new Error("Parsing failed"));
                    else resolve({ type: mode, data: finalData });
                });
                response.data.on('error', reject);
            });
        } catch (err) {
            stopSpinner();
            throw err;
        }
    };

    try { return await attemptRequest(primaryServerUrl); }
    catch (primaryErr) {
        console.warn(chalk.yellow('⚠️ Primary server failed, trying fallback...'));
        try { return await attemptRequest(fallbackServerUrl); }
        catch (fallbackErr) {
            console.error(chalk.red(`❌ API Error: ${fallbackErr.message || primaryErr.message}`));
            return null;
        }
    }
};

// --- Command Execution ---
const executeCommand = (command, shell) => new Promise(resolve => {
    console.log(chalk.magenta(`\n🚀 Executing: ${command.command}`));
    let child;
    if (process.platform === 'win32') {
        if (shell?.toLowerCase().includes('powershell')) child = spawn('powershell.exe',['-NoProfile','-Command',command.command],{ stdio:'inherit' });
        else child = spawn('cmd.exe',['/C',command.command],{ stdio:'inherit' });
    } else child = spawn(command.command, [], { stdio:'inherit', shell:true });
    child.on('close', code => { if(code!==0) console.error(chalk.red(`❌ Process exited with code ${code}`)); resolve(); });
    child.on('error', err => { console.error(chalk.red(`❌ Failed to start process: ${err.message}`)); resolve(); });
});

// --- CLI ---
const run = async () => {
    const config = await getConfig();
    const args = hideBin(process.argv);
    const parser = yargs(args).scriptName('cmdgen').help(false).version(false);

    parser.option('os', { type:'string', default: config.os });
    parser.option('shell', { type:'string', default: config.shell });
    parser.option('lang', { type:'string', default:'en' });

    parser.command(['generate <request>', 'g'], 'Generate a command', {}, async (argv) => {
        const res = await callApi({ ...argv, userInput: argv.request, mode:'generate', cli: argv.shell });
        if (!res?.data?.commands?.length) return console.log(chalk.yellow('No suggestions generated.'));
        res.data.commands.forEach(cmd => addToHistory(cmd));
        console.log(chalk.green.bold('\n--- Suggestions ---'));
        res.data.commands.forEach((cmd,i) => console.log(`${i+1}. ${cmd.command} └─ ${cmd.explanation}`));
        await setConfig({ usageCount: config.usageCount + 1 });
        await handleFeedback();
    });

    parser.command(['script <request>', 's'], 'Generate full script', {}, async (argv) => {
        const res = await callApi({ ...argv, userInput: argv.request, mode:'script', cli: argv.shell });
        if (!res) return gracefulExit();
        const scriptItem = { command: res.data.explanation, explanation:`Script for: "${argv.request}"` };
        await addToHistory(scriptItem);
        console.log(chalk.cyan.bold('\n--- Generated Script ---'));
        console.log(chalk.green(res.data.explanation));
        gracefulExit();
    });

    parser.command(['history', 'h'], 'Show command history', {}, async () => {
        const cfg = await getConfig();
        console.log(chalk.blue.bold('\n--- Command History ---'));
        cfg.history.forEach((item,i) => console.log(`${i+1}. ${item.command} └─ ${item.explanation}`));
    });

    parser.command(['uninstall'], 'Uninstall CMDGEN', {}, async () => {
        console.log(chalk.red.bold('Uninstalling CMDGEN...'));
        await fs.remove(configDir);
        console.log(chalk.green('CMDGEN uninstalled successfully.'));
        gracefulExit();
    });

    parser.strict().fail((msg, err) => { console.error(chalk.red(`❌ Error: ${msg||err?.message}`)); process.exit(1); });

    await parser.argv;
};

const gracefulExit = () => { console.log(chalk.green('\n🙏 Thank you for using CMDGEN!')); process.exit(0); };

run().catch(err => { stopSpinner(); console.error(chalk.red(`\nCritical error: ${err.message}`)); console.error(err.stack); process.exit(1); });

#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios');
const { spawn, exec } = require('child_process');
const { TextDecoder } = require('util');
const path = require('path');
const { getSystemPrompt } = require('./client/src/api/apiService');
const { parseAndConstructData } = require('./client/src/utils/responseParser');
const packageJson = require('./package.json');
const readline = require('readline');

// --- Banner and Info ---
const showBanner = () => {
    const banner = `
      /$$      /$$ /$$$$$$$$ /$$         /$$$$$$   /$$$$$$  /$$      /$$ /$$$$$$$$        /$$$$$$  /$$      /$$ /$$$$$$$   /$$$$$$  /$$$$$$$$ /$$   /$$
     | $$  /$ | $$| $$_____/| $$        /$$__  $$ /$$__  $$| $$$    /$$$| $$_____/       /$$__  $$| $$$    /$$$| $$__  $$ /$$__  $$| $$_____/| $$$ | $$
     | $$ /$$$| $$| $$      | $$       | $$  \\__/| $$  \\ $$| $$$$  /$$$$| $$             | $$  \\__/| $$$$  /$$$$| $$  \\ $$| $$  \\__/| $$      | $$$$| $$
     | $$/$$ $$ $$| $$$$$   | $$       | $$      | $$  | $$| $$ $$/$$ $$| $$$$$          | $$      | $$ $$/$$ $$| $$  | $$| $$ /$$$$| $$$$$   | $$ $$ $$
     | $$$$_  $$$$| $$__/   | $$       | $$      | $$  | $$| $$  $$$| $$| $$__/          | $$      | $$  $$$| $$| $$  | $$| $$|_  $$| $$__/   | $$  $$$$
     | $$$/ \\  $$$| $$      | $$       | $$  $$| $$  | $$| $$\\  $ | $$| $$             | $$  $$| $$\\  $ | $$| $$  | $$| $$  \\ $$| $$      | $$\\  $$$
     | $$/   \\  $$| $$$$$$$$| $$$$$$$$|  $$$$$$/|  $$$$$$/| $$ \\/  | $$| $$$$$$$$       |  $$$$$$/| $$ \\/  | $$| $$$$$$$/|  $$$$$$/| $$$$$$$$| $$ \\  $$
     |__/     \\__/|________/|________/ \\______/  \\______/ |__/    |__/|________/        \\______/ |__/    |__/|_______/  \\______/ |________/|__/  \\__/
                                                                                                                                                 
                                                                                                                                                 
                                                                /$$$$$$  /$$     /$$                                                              
                                                               /$$__  $$|  $$   /$$/                                                              
                                                              | $$  \\ $$ \\  $$ /$$/                                                               
                                                              | $$$$$$$$  \\  $$$$/                                                                
                                                              | $$__  $$   \\  $$/                                                                 
                                                              | $$  | $$    | $$                                                                  
                                                              | $$  | $$    | $$                                                                  
                                                              |__/  |__/    |__/
    `;
    console.log('\x1b[36m%s\x1b[0m', banner);
    console.log(`\n  \x1b[1mCMDGEN v${packageJson.version}\x1b[0m - Your Intelligent Command-Line Assistant`);
    console.log('  Created by Amirhossein Yavari. Licensed under MIT.');
    console.log('  Type "cmdgen --help" for a list of commands.\n');
};

// --- Server Management ---
const serverPort = 3001;
const serverCheckUrl = `http://localhost:${serverPort}/api/health`;

const isServerRunning = async () => {
    try {
        await axios.get(serverCheckUrl, { timeout: 500 });
        return true;
    } catch (error) {
        return false;
    }
};

const startServerInBackground = () => {
    console.log('⏳ سرور داخلی پیدا نشد. در حال راه‌اندازی در پس‌زمینه...');
    // This logic ensures the correct path is used, whether running from source or as a packaged executable.
    const serverPath = process.pkg ? path.join(path.dirname(process.execPath), 'server.js') : path.join(__dirname, 'server.js');
    const serverProcess = spawn(process.execPath, [serverPath], {
        detached: true,
        stdio: 'ignore'
    });
    serverProcess.unref();
    return new Promise(resolve => setTimeout(resolve, 2500)); // Wait for the server to boot
};

// --- Core API and Execution Functions ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang }) => {
    if (!await isServerRunning()) {
        await startServerInBackground();
    }
    const systemPrompt = getSystemPrompt(mode, os, osVersion, cli, lang, {});
    const payload = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] };
    try {
        const proxyUrl = `http://localhost:${serverPort}/api/proxy`;
        const response = await axios.post(proxyUrl, payload, { responseType: 'stream' });
        let fullContent = '';
        const decoder = new TextDecoder();
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                const textChunk = decoder.decode(chunk, { stream: true });
                const dataLines = textChunk.split('\\n').filter(line => line.startsWith('data: '));
                for (const line of dataLines) {
                    const jsonPart = line.substring(5).trim();
                    if (jsonPart && jsonPart !== "[DONE]") {
                        try {
                            fullContent += JSON.parse(jsonPart).choices[0].delta.content || '';
                        } catch (e) {}
                    }
                }
            });
            response.data.on('end', () => {
                const finalData = parseAndConstructData(fullContent, mode, cli);
                if (!finalData) reject(new Error("Parsing failed"));
                else resolve({ type: mode, data: finalData });
            });
            response.data.on('error', (err) => reject(err));
        });
    } catch (err) {
        console.error("\\n❌ خطا در ارتباط با سرور:", err.response ? err.response.data.error.message : err.message);
        return null;
    }
};

const promptForExecution = (command) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\\n');
    console.warn('🚨 \\x1b[33mهشدار: اجرای دستورات تولید شده توسط هوش مصنوعی می‌تواند خطرناک باشد. همیشه قبل از اجرا دستور را به دقت بررسی کنید.\\x1b[0m');
    rl.question(`آیا دستور زیر اجرا شود؟\\n\\n  \\x1b[36m${command}\\x1b[0m\\n\\n(y/N): `, (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log('🚀 در حال اجرای دستور...');
            exec(command, (error, stdout, stderr) => {
                if (error) console.error(`\\n❌ خطای اجرا:\\n${error.message}`);
                if (stderr) console.warn(`\\n⚠️ خروجی خطا (stderr):\\n${stderr}`);
                if (stdout) console.log(`\\n✅ خروجی استاندارد (stdout):\\n${stdout}`);
                rl.close();
            });
        } else {
            console.log('عملیات اجرا لغو شد.');
            rl.close();
        }
    });
};

// --- Yargs Command Parser ---
const run = async () => {
    yargs(hideBin(process.argv))
        .scriptName("cmdgen")
        .usage('Usage: $0 <command> "[input]" [options]')
        .command('generate <request>', 'تولید یک دستور بر اساس درخواست شما', {}, async (argv) => {
            const result = await callApi({ mode: 'generate', userInput: argv.request, ...argv });
            if (result && result.data.commands) {
                result.data.commands.forEach((cmd, index) => {
                    console.log(`\\nپیشنهاد #${index + 1}:\\n  \\x1b[36m${cmd.command}\\x1b[0m\\n  └─ توضیح: ${cmd.explanation}`);
                    if (cmd.warning) console.log(`     └─ \\x1b[33mهشدار: ${cmd.warning}\\x1b[0m`);
                });
                if (result.data.commands.length > 0) promptForExecution(result.data.commands[0].command);
            }
        })
        .command('analyze <command>', 'تحلیل و توضیح یک دستور', {}, async (argv) => {
            const result = await callApi({ mode: 'explain', userInput: argv.command, ...argv });
            if (result) console.log(result.data.explanation);
        })
        .command('error <message>', 'تحلیل یک پیام خطا', {}, async (argv) => {
            const userInput = \`Error Message:\\n${argv.message}\` + (argv.context ? \`\\n\\nContext:\\n${argv.context}\` : '');
            const result = await callApi({ mode: 'error', userInput, ...argv });
            if (result) {
                console.log(`\\nعلت احتمالی: ${result.data.cause}\\n\\nتوضیح خطا: ${result.data.explanation}\\n\\nراه‌حل پیشنهادی:`);
                result.data.solution.forEach(step => console.log(\`  - ${step}\`));
            }
        })
        .alias('g', 'generate').alias('a', 'analyze').alias('e', 'error')
        .option('context', { alias: 'c', describe: 'ارائه توضیحات بیشتر برای تحلیل خطا', type: 'string' })
        .option('os', { describe: 'سیستم‌عامل هدف', type: 'string', default: 'linux' })
        .option('osVersion', { describe: 'نسخه سیستم‌عامل', type: 'string', default: 'Ubuntu 24.04 LTS' })
        .option('shell', { describe: 'شل مورد استفاده', type: 'string', default: 'Bash' })
        .option('lang', { describe: 'زبان پاسخ (fa, en)', type: 'string', default: 'fa' })
        .demandCommand(1, 'باید یکی از دستورات اصلی (generate, analyze, error) را وارد کنید.')
        .help('h').alias('h', 'help')
        .version('v', 'Show version number', \`CMDGEN version: ${packageJson.version}\`).alias('v', 'version')
        .strict().wrap(null)
        .check((argv) => {
            if (argv._.length === 0 && !argv.h && !argv.v) showBanner();
            return true;
        })
        .parse();
};

run();

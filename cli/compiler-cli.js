const chalk = require('chalk');
const { spawn } = require('child_process');
const readline = require('readline');
const { callApi } = require('./apiService-cli.js');

const question = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    }));
};

const printSection = (title, content, color = 'cyan') => {
    if (!content) return;
    console.log(chalk[color].bold(`\n--- ${title.toUpperCase()} ---`));
    // Use a simple block for text-based visualization
    if (title.includes('FLOW')) {
        console.log(chalk.gray(content));
    } else {
        console.log(content);
    }
};

/**
 * Executes code locally.
 * @param {string} code - The code to execute.
 * @param {string} language - The detected language.
 * @returns {Promise<{success: boolean, output: string, error: string}>}
 */
const executeCode = (code, language) => {
    return new Promise((resolve) => {
        let cmd, args;
        const lang = language.toLowerCase();

        if (lang.includes('python')) {
            cmd = 'python3'; args = ['-c', code];
        } else if (lang.includes('javascript')) {
            cmd = 'node'; args = ['-e', code];
        } else if (lang.includes('bash') || lang.includes('shell')) {
            cmd = 'bash'; args = ['-c', code];
        } else if (lang.includes('powershell')) {
            cmd = 'pwsh'; args = ['-Command', code];
        } else {
            resolve({ success: false, output: null, error: `Language ${language} is not supported for local execution.` });
            return;
        }

        let stdout = '';
        let stderr = '';
        const child = spawn(cmd, args, { timeout: 10000 });

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, output: stdout || 'Script executed successfully.', error: null });
            } else {
                resolve({ success: false, output: null, error: stderr || `Process exited with code ${code}` });
            }
        });

        child.on('error', (err) => {
            resolve({ success: false, output: null, error: `Failed to start process: ${err.message}` });
        });
    });
};

/**
 * Main function for the CLI compiler.
 * @param {string} code - The code from the file.
 * @param {object} options - Compiler options (learningMode, lang).
 * @param {object} config - The user's CCG config.
 */
const runCompiler = async (code, options, config) => {
    let currentCode = code;
    const { lang } = options;
    const apiParams = { ...config, ...options };

    console.log(chalk.bold('🧠 Initializing Smart Compiler...'));

    try {
        // 1. Detect Language
        const langResult = await callApi({ ...apiParams, mode: 'detect-lang', userInput: currentCode }, 'Detecting language...');
        const language = langResult?.finalData?.explanation?.trim();
        if (!language) {
            console.error(chalk.red('❌ Failed to detect language.'));
            return;
        }
        printSection('Detected Language', language, 'yellow');

        // 2. Safety Check
        const safetyResult = await callApi({ ...apiParams, mode: 'safety-check', userInput: currentCode }, 'Running safety scan...');
        const safetyCheck = safetyResult?.finalData?.explanation?.trim();
        if (safetyCheck && safetyCheck.startsWith('UNSAFE:')) {
            console.log(chalk.red.bold('\n--- 🚨 SAFETY WARNING 🚨 ---'));
            console.log(chalk.yellow(safetyCheck.replace('UNSAFE: ', '')));
            const confirm = await question(chalk.yellow.bold('Are you sure you want to run this code? (y/N) '));
            if (confirm.toLowerCase() !== 'y') {
                console.log(chalk.cyan('Run cancelled by user.'));
                return;
            }
        }

        // 3. Parallel AI Analyses
        console.log(chalk.blue('\n🚀 Running AI analysis...'));
        const analyses = {
            'explain-code': null,
            'review-code': null,
            'visualize-flow': null,
            'learning-mode': null
        };
        const analysisPromises = [
            callApi({ ...apiParams, mode: 'explain-code', userInput: currentCode }, 'Generating explanation...').then(r => analyses['explain-code'] = r?.finalData?.explanation),
            callApi({ ...apiParams, mode: 'review-code', userInput: currentCode }, 'Generating code review...').then(r => analyses['review-code'] = r?.finalData?.explanation),
            callApi({ ...apiParams, mode: 'visualize-flow', userInput: currentCode }, 'Generating flow visualization...').then(r => analyses['visualize-flow'] = r?.finalData?.explanation),
        ];
        if (options.learningMode) {
            analysisPromises.push(callApi({ ...apiParams, mode: 'learning-mode', userInput: currentCode }, 'Generating learning trace...').then(r => analyses['learning-mode'] = r?.finalData?.explanation));
        }
        await Promise.all(analysisPromises);

        printSection('Code Explanation', analyses['explain-code']);
        printSection('AI Code Review', analyses['review-code']);
        printSection('Execution Flow', analyses['visualize-flow'], 'gray');
        if (options.learningMode) printSection('Learning Mode Trace', analyses['learning-mode']);

        // 4. Execute Code
        console.log(chalk.blue.bold('\n--- ⚡ EXECUTING CODE ⚡ ---'));
        const execResult = await executeCode(currentCode, language);

        if (execResult.success) {
            console.log(chalk.green.bold('\n--- ✅ FINAL RESULT ---'));
            console.log(execResult.output);

            // 8. Suggestions
            const suggestions = await callApi({ ...apiParams, mode: 'suggestions', userInput: currentCode }, 'Generating suggestions...');
            printSection('AI Suggestions', suggestions?.finalData?.explanation, 'magenta');
        
        } else {
            console.log(chalk.red.bold('\n--- ❌ EXECUTION FAILED ---'));
            console.log(chalk.red(execResult.error));

            // 5. AI Error Analyzer
            const errorAnalysis = await callApi({ ...apiParams, mode: 'analyze-error', userInput: `${currentCode}|||${execResult.error}` }, 'Analyzing error...');
            printSection('AI Error Analysis', errorAnalysis?.finalData?.explanation, 'red');

            // 6. AI Auto-Fix
            const fix = await question(chalk.yellow.bold('\nWould you like the AI to try and fix this? (y/N) '));
            if (fix.toLowerCase() === 'y') {
                const fixResult = await callApi({ ...apiParams, mode: 'auto-fix', userInput: `${currentCode}|||${execResult.error}` }, 'Attempting auto-fix...');
                const fixedCode = fixResult?.finalData?.explanation;
                
                if (!fixedCode) {
                    console.error(chalk.red('❌ AI failed to generate a fix.'));
                    return;
                }

                console.log(chalk.cyan.bold('\n--- 🪄 AI SUGGESTED FIX ---'));
                console.log(chalk.green(fixedCode));
                
                const runFixed = await question(chalk.yellow.bold('Run this fixed code? (y/N) '));
                if (runFixed.toLowerCase() === 'y') {
                    console.log(chalk.blue.bold('\n--- ⚡ EXECUTING FIXED CODE ⚡ ---'));
                    const fixedExecResult = await executeCode(fixedCode, language);

                    if (fixedExecResult.success) {
                        console.log(chalk.green.bold('\n--- ✅ FINAL RESULT (FIXED) ---'));
                        console.log(fixedExecResult.output);
                        const suggestions = await callApi({ ...apiParams, mode: 'suggestions', userInput: fixedCode }, 'Generating suggestions...');
                        printSection('AI Suggestions', suggestions?.finalData?.explanation, 'magenta');
                    } else {
                        console.log(chalk.red.bold('\n--- ❌ FIXED CODE FAILED ---'));
                        console.log(chalk.red(fixedExecResult.error));
                    }
                }
            }
        }
    } catch (err) {
        stopSpinner();
        console.error(chalk.red(`\n❌ A critical compiler error occurred: ${err.message}`));
    }
};

module.exports = { runCompiler };
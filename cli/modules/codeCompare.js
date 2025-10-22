const chalk = require('chalk');

// Helper to print sections with consistent formatting
const printSection = (title, content, color = 'cyan') => {
    if (!content) return;
    console.log(chalk[color].bold(`\n--- ${title.toUpperCase()} ---`));
    console.log(content);
};

/**
 * Main function for the CLI code comparer.
 * @param {string} codeA - The content of the first file.
 * @param {string} codeB - The content of the second file.
 * @param {object} options - Compiler options (e.g., lang).
 * @param {object} config - The user's CCG config.
 * @param {function} callApi - The callApi function from cmdgen-cli.js.
 */
const runComparer = async (codeA, codeB, options, config, callApi) => {
    const { lang } = options;
    const apiParams = { ...config, ...options, os: 'other', cli: 'cli' }; // Use generic OS for compare

    console.log(chalk.bold('🧠 Initializing Smart Code Compare...'));

    try {
        // 1. Detect Languages in parallel
        const [langAResult, langBResult] = await Promise.all([
            callApi({ ...apiParams, mode: 'detect-lang', userInput: codeA }, 'Detecting language of File A...'),
            callApi({ ...apiParams, mode: 'detect-lang', userInput: codeB }, 'Detecting language of File B...')
        ]);
        
        const langA = langAResult?.finalData?.explanation?.trim() || 'Unknown';
        const langB = langBResult?.finalData?.explanation?.trim() || 'Unknown';

        console.log(chalk.bold(`\nLanguages Detected: ${chalk.yellow(langA)} (File A) vs ${chalk.yellow(langB)} (File B)`));
        if (langA !== langB) {
            console.log(chalk.yellow('Warning: Language mismatch detected. Analysis may be less accurate.'));
        }

        // 2. Run analysis and merge in parallel
        const [diffResult, qualityResult, mergeResult] = await Promise.all([
            callApi({ ...apiParams, mode: 'compare-diff', userInput: `${codeA}|||${codeB}|||${langA}|||${langB}` }, 'Analyzing logical differences...'),
            callApi({ ...apiParams, mode: 'compare-quality', userInput: `${codeA}|||${codeB}|||${langA}|||${langB}` }, 'Reviewing code quality...'),
            callApi({ ...apiParams, mode: 'compare-merge', userInput: `${codeA}|||${codeB}|||${langA}|||${langB}|||` }, 'Generating merge suggestion...')
        ]);

        // 3. Print all results
        printSection('Logical Differences', diffResult?.finalData?.explanation, 'cyan');
        printSection('AI Quality Review', qualityResult?.finalData?.explanation, 'yellow');
        printSection('AI Suggested Merge', mergeResult?.finalData?.explanation, 'green');

    } catch (err) {
        // stopSpinner() is in callApi, so we just log the error
        console.error(chalk.red(`\n❌ A critical compare error occurred: ${err.message}`));
    }
};

module.exports = { runComparer };
const chalk = require('chalk');
const Diff = require('diff');

// Helper to print sections with consistent formatting
const printSection = (title, content, color = 'cyan') => {
    if (!content) return;
    console.log(chalk[color].bold(`\n--- ${title.toUpperCase()} ---`));
    console.log(content);
};

/**
 * Generates a colorized, unified diff string from two code blocks.
 * @param {string} codeA - The original code.
 * @param {string} codeB - The modified code.
 * @returns {string} A colorized string representing the diff.
 */
const generateTextDiff = (codeA, codeB) => {
    const diff = Diff.diffLines(codeA, codeB);
    let output = '';

    diff.forEach(part => {
        // Process each line in the part to apply the correct prefix and color
        const lines = part.value.replace(/\n$/, '').split('\n'); // Split lines and remove trailing newline

        lines.forEach(line => {
            if (part.added) {
                output += chalk.green(`+ ${line}`) + '\n';
            } else if (part.removed) {
                output += chalk.red(`- ${line}`) + '\n';
            } else {
                output += chalk.dim(`  ${line}`) + '\n';
            }
        });
    });

    return output.trim(); // Trim final newline
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
        // --- NEW: Section 1. Generate and Print Visual Diff ---
        // This is done locally first, as it's not an AI task.
        printSection('Visual Side-by-Side Diff (Unified)', generateTextDiff(codeA, codeB), 'white');


        // --- EXISTING: Section 2. AI Language Detection & Analysis ---
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

        // 3. Print all AI results (BELOW the visual diff)
        printSection('Logical Differences', diffResult?.finalData?.explanation, 'cyan');
        printSection('AI Quality Review', qualityResult?.finalData?.explanation, 'yellow');
        printSection('AI Suggested Merge', mergeResult?.finalData?.explanation, 'green');

    } catch (err) {
        // stopSpinner() is in callApi, so we just log the error
        console.error(chalk.red(`\n❌ A critical compare error occurred: ${err.message}`));
    }
};

module.exports = { runComparer };
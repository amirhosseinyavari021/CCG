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
                output += chalk.red(`- ${line}`)D + '\n';
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
 * @param {function} sendToCCGServer - The NEW sendToCCGServer function.
 * @param {function} startSpinner - The spinner start function.
 * @param {function} stopSpinner - The spinner stop function.
 */
const runComparer = async (codeA, codeB, options, config, sendToCCGServer, startSpinner, stopSpinner) => {
    const { lang } = options;

    // Map config and options to the new API params
    const apiParams = {
        lang: lang || config.lang || 'en',
        os: config.os || 'other',
        input_a: codeA,
        input_b: codeB,
    };

    console.log(chalk.bold('🧠 Initializing Smart Code Compare...'));

    try {
        // 1. Generate and Print Visual Diff (local)
        printSection('Visual Side-by-Side Diff (Unified)', generateTextDiff(codeA, codeB), 'white');

        // 2. Run AI 'compare' analysis
        startSpinner('Analyzing logical differences...');
        const compareOutput = await sendToCCGServer({ ...apiParams, mode: 'compare' });
        stopSpinner();

        if (compareOutput.startsWith('⚠️')) {
            printSection('AI Analysis (Compare)', chalk.red(compareOutput), 'red');
        } else {
            printSection('AI Analysis (Compare)', compareOutput, 'cyan');
        }

        // 3. Run AI 'merge'
        startSpinner('Generating merge suggestion...');
        const mergeOutput = await sendToCCGServer({ ...apiParams, mode: 'merge' });
        stopSpinner();

        if (mergeOutput.startsWith('⚠️')) {
            printSection('AI Suggested Merge', chalk.red(mergeOutput), 'red');
        } else {
            printSection('AI Suggested Merge', mergeOutput, 'green');
        }

    } catch (err) {
        stopSpinner();
        console.error(chalk.red(`\n❌ A critical compare error occurred: ${err.message}`));
    }
};

module.exports = { runComparer };